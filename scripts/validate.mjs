#!/usr/bin/env node
/**
 * validate.mjs — portero de la capa de datos.
 *
 * Corre en CI antes de publicar. Si esto falla, el sitio NO se despliega.
 * Cero dependencias: solo Node >= 18.
 *
 *   node scripts/validate.mjs data/2027.json
 *   node scripts/validate.mjs            # valida todos los años del manifest
 *
 * Filosofía: el modelo que extrae los datos solo transcribe hojas.
 * Toda la aritmética se re-calcula aquí y se contrasta contra los
 * totales publicados. Un error de extracción truena ruidosamente
 * en lugar de publicarse en silencio.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------- tolerancias
// Los documentos de SHCP mezclan tablas en mdp y en mmp. Redondear a
// miles de millones y volver a mdp mete ruido de hasta ~500 mdp por hoja.
const TOL = {
  publicado: { rel: 0.001, abs: 2_000 },    // 0.1% o 2 mil mdp
  indicativo: { rel: 0.005, abs: 25_000 },  // 0.5% o 25 mil mdp
  pct_pib: 0.15,                            // puntos porcentuales
};

const CONFIANZAS = ["publicado", "derivado", "indicativo", "no_encontrado"];

let errores = [];
let avisos = [];
let archivoActual = "";

const err = (m) => errores.push(`${archivoActual}: ${m}`);
const avi = (m) => avisos.push(`${archivoActual}: ${m}`);
const mmp = (n) => (n / 1_000).toLocaleString("es-MX", { maximumFractionDigits: 1 });

function cerca(a, b, nivel = "publicado") {
  const t = TOL[nivel] ?? TOL.publicado;
  const d = Math.abs(a - b);
  return d <= Math.max(t.abs, Math.abs(b) * t.rel);
}

// ------------------------------------------------------------ árbol de nodos
const ids = new Map();

function recorrer(nodo, ruta) {
  if (!nodo || typeof nodo !== "object") {
    err(`${ruta}: nodo vacío o no es un objeto`);
    return;
  }
  for (const campo of ["id", "nombre", "monto_mdp", "confianza", "fuente"]) {
    if (nodo[campo] === undefined || nodo[campo] === null || nodo[campo] === "") {
      err(`${ruta}: falta el campo obligatorio "${campo}"`);
    }
  }
  if (nodo.id) {
    if (!/^[a-z0-9_]+$/.test(nodo.id)) err(`${ruta}: id "${nodo.id}" debe ser snake_case`);
    if (ids.has(nodo.id)) err(`id duplicado "${nodo.id}" (${ids.get(nodo.id)} y ${ruta})`);
    else ids.set(nodo.id, ruta);
  }
  if (nodo.confianza && !CONFIANZAS.includes(nodo.confianza)) {
    err(`${ruta}: confianza "${nodo.confianza}" no es válida`);
  }
  if (typeof nodo.monto_mdp !== "number" || Number.isNaN(nodo.monto_mdp)) {
    err(`${ruta}: monto_mdp no es un número`);
    return;
  }
  if (nodo.confianza === "no_encontrado" && nodo.monto_mdp !== 0) {
    err(`${ruta}: marcado no_encontrado pero trae monto ${nodo.monto_mdp}`);
  }
  // Trampa clásica: transcribir mmp como si fueran mdp deja el número 1000x chico.
  if (nodo.monto_mdp > 0 && nodo.monto_mdp < 1_000 && (nodo.hijos?.length || 0) === 0) {
    avi(`${ruta} ("${nodo.nombre}"): monto ${nodo.monto_mdp} sospechosamente bajo. ¿Se transcribió en mmp en vez de mdp?`);
  }

  if (Array.isArray(nodo.hijos) && nodo.hijos.length) {
    const suma = nodo.hijos.reduce((a, h) => a + (h?.monto_mdp ?? 0), 0);
    const nivel = nodo.hijos.some((h) => h?.confianza === "indicativo") ? "indicativo" : "publicado";
    if (!cerca(suma, nodo.monto_mdp, nivel)) {
      err(
        `${ruta} ("${nodo.nombre}") NO RECONCILIA: hijos suman ${mmp(suma)} mmp ` +
        `pero el total publicado es ${mmp(nodo.monto_mdp)} mmp ` +
        `(diferencia ${mmp(suma - nodo.monto_mdp)} mmp)`
      );
    }
    nodo.hijos.forEach((h, i) => recorrer(h, `${ruta}.hijos[${i}]`));
  }
}

function chequearPctPib(nodo, pib, ruta) {
  if (!nodo || typeof nodo !== "object") return;
  if (typeof nodo.pct_pib === "number" && pib) {
    const calc = (nodo.monto_mdp / pib) * 100;
    if (Math.abs(calc - nodo.pct_pib) > TOL.pct_pib) {
      err(
        `${ruta} ("${nodo.nombre}"): % del PIB publicado ${nodo.pct_pib}% pero calculado ${calc.toFixed(2)}%. ` +
        `Revisa el PIB nominal o el monto.`
      );
    }
  }
  (nodo.hijos ?? []).forEach((h, i) => chequearPctPib(h, pib, `${ruta}.hijos[${i}]`));
}

// -------------------------------------------------------------- validar año
function validar(ruta) {
  archivoActual = ruta.replace(ROOT + "/", "");
  ids.clear();

  let d;
  try {
    d = JSON.parse(readFileSync(ruta, "utf8"));
  } catch (e) {
    err(`JSON inválido — ${e.message}`);
    return;
  }

  // --- meta y macro
  if (!d.meta?.anio_fiscal) err("falta meta.anio_fiscal");
  if (d.meta?.unidad !== "millones_pesos_corrientes") {
    err(`meta.unidad debe ser "millones_pesos_corrientes" (viene "${d.meta?.unidad}")`);
  }
  if (!["PPEF", "PEF", "LIF_iniciativa", "LIF_aprobada"].includes(d.meta?.tipo_documento)) {
    err(`meta.tipo_documento inválido: "${d.meta?.tipo_documento}"`);
  }
  const pib = d.macro?.pib_nominal_mdp;
  if (!pib) err("falta macro.pib_nominal_mdp — sin él no hay % del PIB ni comparación real");
  if (!d.macro?.deflactor_pib_pct) err("falta macro.deflactor_pib_pct — sin él la comparación año contra año es nominal y engañosa");
  if (pib && (pib < 10_000_000 || pib > 200_000_000)) {
    err(`macro.pib_nominal_mdp = ${pib} está fuera de rango plausible. ¿Unidades equivocadas?`);
  }

  // --- árboles
  recorrer(d.ingresos, "ingresos");
  recorrer(d.gasto, "gasto");
  for (const [k, v] of Object.entries(d.clasificaciones_gasto ?? {})) {
    recorrer(v, `clasificaciones_gasto.${k}`);
  }
  if (d.transferencias_estados) recorrer(d.transferencias_estados, "transferencias_estados");

  chequearPctPib(d.ingresos, pib, "ingresos");
  chequearPctPib(d.gasto, pib, "gasto");

  // --- IDENTIDAD 1: la del Sankey. Sin esto la infografía miente.
  const ing = d.ingresos?.monto_mdp ?? 0;
  const gas = d.gasto?.monto_mdp ?? 0;
  const bal = d.balance?.balance_presupuestario_mdp ?? 0;
  const boquete = gas - ing;

  if (bal > 0) {
    avi(`balance presupuestario POSITIVO (${mmp(bal)} mmp). Superávit: el nodo del boquete cambia de lado en el Sankey.`);
  }
  if (!cerca(boquete, -bal, "publicado")) {
    err(
      `IDENTIDAD CENTRAL ROTA: gasto (${mmp(gas)}) − ingresos (${mmp(ing)}) = ${mmp(boquete)} mmp, ` +
      `pero el balance presupuestario publicado es ${mmp(bal)} mmp. El Sankey no va a cerrar.`
    );
  }

  // --- IDENTIDAD 2: RFSP = balance presupuestario + extrapresupuestarios
  const extra = d.balance?.requerimientos_extrapresupuestarios_mdp;
  const rfsp = d.balance?.rfsp_mdp;
  if (typeof extra === "number" && typeof rfsp === "number") {
    if (!cerca(bal + extra, rfsp, "publicado")) {
      err(`RFSP no cuadra: ${mmp(bal)} + ${mmp(extra)} = ${mmp(bal + extra)} ≠ ${mmp(rfsp)} mmp`);
    }
  }

  // --- IDENTIDAD 3: las clasificaciones alternas suman al mismo total
  const totales = Object.entries(d.clasificaciones_gasto ?? {}).map(([k, v]) => [k, v?.monto_mdp ?? 0]);
  if (totales.length > 1) {
    const [refK, refV] = totales[0];
    for (const [k, v] of totales.slice(1)) {
      if (!cerca(v, refV, "publicado")) {
        err(`clasificaciones_gasto.${k} suma ${mmp(v)} mmp pero ${refK} suma ${mmp(refV)} mmp. Deben ser el mismo universo.`);
      }
    }
  }

  // --- IDENTIDAD 4: el programable devengado debe ser >= al pagado
  const prog = buscar(d.gasto, "gasto_programable")?.monto_mdp;
  const dev = totales[0]?.[1];
  if (prog && dev && dev < prog - TOL.publicado.abs) {
    err(`gasto programable devengado (${mmp(dev)}) menor que el pagado (${mmp(prog)}). Revisa el diferimiento de pagos.`);
  }

  // --- cobertura: rubros que casi siempre existen
  for (const id of ["ing_tributarios", "gasto_programable", "gasto_no_programable", "gasto_costo_financiero"]) {
    if (!ids.has(id)) avi(`no se encontró el nodo "${id}". Si el documento cambió de estructura, actualiza EXTRACTION.md.`);
  }

  // --- resumen legible
  console.log(`\n  ${archivoActual}  —  ${d.meta?.tipo_documento} ${d.meta?.anio_fiscal}`);
  console.log(`  ${"─".repeat(58)}`);
  console.log(`  Ingresos           ${mmp(ing).padStart(12)} mmp   ${pctPib(ing, pib)}`);
  console.log(`  Boquete (deuda)    ${mmp(boquete).padStart(12)} mmp   ${pctPib(boquete, pib)}`);
  console.log(`  Gasto neto total   ${mmp(gas).padStart(12)} mmp   ${pctPib(gas, pib)}`);
  console.log(`  Cada $100 de gasto: $${((ing / gas) * 100).toFixed(0)} recaudados, $${((boquete / gas) * 100).toFixed(0)} prestados`);
}

const pctPib = (v, pib) => (pib ? `${((v / pib) * 100).toFixed(1)}% del PIB` : "");

function buscar(nodo, id) {
  if (!nodo) return null;
  if (nodo.id === id) return nodo;
  for (const h of nodo.hijos ?? []) {
    const r = buscar(h, id);
    if (r) return r;
  }
  return null;
}

// ------------------------------------------------------------------- arranque
const args = process.argv.slice(2);
let archivos = args;

if (!archivos.length) {
  const mf = join(ROOT, "data", "manifest.json");
  if (!existsSync(mf)) {
    console.error("No hay data/manifest.json ni argumentos. Uso: node scripts/validate.mjs data/2027.json");
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(mf, "utf8"));
  const pendientes = manifest.anios.filter((a) => a.estado === "pendiente");
  if (pendientes.length) {
    console.log(`\n  Omitiendo (estado "pendiente"): ${pendientes.map((a) => a.id).join(", ")}`);
  }
  archivos = manifest.anios
    .filter((a) => a.estado !== "pendiente")
    .map((a) => join(ROOT, "data", a.archivo));
}

for (const f of archivos) {
  if (!existsSync(f)) {
    archivoActual = f;
    err("el archivo no existe");
    continue;
  }
  validar(f);
}

console.log("");
if (avisos.length) {
  console.log(`  AVISOS (${avisos.length}) — no bloquean el despliegue:`);
  avisos.forEach((a) => console.log(`   ~ ${a}`));
  console.log("");
}
if (errores.length) {
  console.log(`  ERRORES (${errores.length}) — el despliegue se detiene:`);
  errores.forEach((e) => console.log(`   x ${e}`));
  console.log("");
  process.exit(1);
}
console.log("  Todo cuadra. Listo para publicar.\n");
