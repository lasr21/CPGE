# Paquete Económico de México — infografía

Un sitio estático que responde dos preguntas sobre el presupuesto federal:
**de dónde sale el dinero** y **a dónde va**. Con el boquete entre ambos —
la deuda del año — como el elemento visual central, no como una nota al pie.

## La idea en una imagen

Los diagramas Sankey de estados de resultados corporativos funcionan porque
la utilidad neta sale por la derecha: la empresa cobra más de lo que gasta.
El presupuesto público mexicano funciona al revés, y ahí está lo interesante.

```
Ingresos          8,721 mmp  ─┐
                               ├──►  Gasto neto total   10,115 mmp
Deuda del año     1,394 mmp  ─┘
```

El déficit **entra por la izquierda como fuente de recursos**, junto a los
impuestos. Es la respuesta gráfica a "¿de dónde sale el dinero?": de cada
$100 que gasta el gobierno federal en 2026, $86 los recauda y $14 los pide
prestados.

Los tres números cuadran exacto (PPEF 2026): 8,721,057.3 + 1,393,770.6 =
10,114,827.9 mdp, y ese 1,393,770.6 es literalmente el balance
presupuestario publicado. No hay que forzar nada.

## Arquitectura

```
data/2026.json          ← un archivo por año, mismo esquema
data/2027.json
data/manifest.json      ← qué años existen y cuál es comparable con cuál
schema/paquete.schema.json
scripts/validate.mjs    ← portero: si truena, no se despliega
EXTRACTION.md           ← el prompt que produce los JSON
src/                    ← el sitio, 100% data-driven
```

Cero números hardcodeados en el sitio. Los nodos y flujos del Sankey se
derivan del JSON; agregar un año es agregar un archivo y una línea al
manifest.

### El flujo para 2027

1. Sale el CGPE 2027 → PDF a markdown.
2. Prompt de `EXTRACTION.md` → `data/2027.json`.
3. `node scripts/validate.mjs` → si truena, se pega el error de vuelta al
   modelo y se corrige.
4. Commit. GitHub Actions revalida y publica en Pages.

El paso 3 es el que hace que esto sea seguro. Sin él, un IVA con un dígito
de más se publica sin que nadie lo note.

### Por qué un validador y no solo un esquema

Un JSON Schema comprueba que los campos existan y sean números. No comprueba
que los números signifiquen algo. Las identidades contables sí:
`gasto − ingresos = déficit`, `padre = suma de hijos`, `monto / PIB = % del
PIB publicado`. Esas tres atrapan casi cualquier error de transcripción,
porque el documento publica los totales *y* los componentes, y un error rompe
la consistencia entre ambos.

## Las cinco trampas del dato

Documentadas porque son la diferencia entre una infografía correcta y una
que se ve bien y está mal.

**1. Dos clasificaciones ortogonales de ingresos.** El documento corta por
petroleros/no petroleros *y* por Gobierno Federal/organismos. Sumar renglones
a ciegas duplica. El árbol del Anexo II.6 es el único internamente
consistente y es el canónico. Efecto colateral conocido: el IAEEH aparece
dentro de tributarios siendo un impuesto petrolero. Va marcado con `nota` y
sale en el tooltip.

**2. Pagado vs devengado.** Difieren en el diferimiento de pagos (78,856 mdp
en 2026). El árbol principal usa **pagado**, porque es el único que cierra la
identidad del Sankey. Las clasificaciones económica y funcional usan
**devengado**, que es como las publica SHCP. El sitio lo dice donde
corresponde.

**3. Nominal vs real.** Comparar 2026 con 2027 en pesos corrientes infla el
crecimiento por el deflactor (4.8% en 2026). Por eso `macro.deflactor_pib_pct`
es campo obligatorio y el sitio abre en **% del PIB**, que es la comparación
honesta. Pesos nominales y pesos reales son toggles secundarios.

**4. PPEF ≠ PEF.** Lo que sale en septiembre es el proyecto del Ejecutivo; la
Cámara aprueba algo distinto en noviembre. `meta.tipo_documento` y
`meta.comparable_con` lo hacen explícito, y la comparación por defecto es
PPEF contra PPEF.

**5. El CGPE no trae desglose por ramo.** Trae narrativa ("cuatro ramos
concentran 52.8%") pero no la tabla. Para llegar a Bienestar / Educación /
Salud hacen falta los datos abiertos del PPEF de Transparencia Presupuestaria,
que salen después. Por eso `clasificaciones_gasto.administrativa` es opcional:
el sitio funciona completo sin ella y se enriquece cuando llegue.

## Sitio

**Stack.** HTML + JS estático, sin build step obligatorio. ECharts trae Sankey
nativo y ahorra un día contra d3-sankey a mano. Si terminamos necesitando
control fino sobre el layout, se cambia después sin tocar los datos: esa es
la ventaja de separar la capa de datos.

**Vistas.**
- Sankey principal, nivel 1–3, ~14 nodos. Es la portada.
- Pestañas del gasto: económica / funcional / (administrativa, cuando exista).
- Comparación 2026 vs 2027: barras de variación por rubro, empatadas por `id`.
- Tabla de datos con `fuente` por renglón. Es lo que hace esto auditable y lo
  que lo separa de una infografía de gobierno.

**Unidades.** Toggle entre % del PIB (default), pesos nominales, pesos reales
y pesos por persona. La última necesita población de CONAPO, que no viene en
el CGPE.

**Móvil.** El Sankey no funciona en 380px. Fallback a barras apiladas
enfrentadas —ingresos arriba, gasto abajo, el boquete en medio— que conserva
la idea sin necesitar el diagrama.

**Nodos chicos.** "Otros impuestos" son 300 mdp contra 5.8 millones: invisible
y además rompe el layout. Umbral de agregación configurable, con los
agrupados accesibles en la tabla.

## Estado

Hecho:
- `schema/paquete.schema.json`
- `data/2026.json` — extraído del CGPE 2026, validando
- `scripts/validate.mjs` — probado contra errores inyectados
- `data/manifest.json`
- `EXTRACTION.md`

Falta:
- `src/` — el sitio
- Workflow de GitHub Actions (validar en PR, publicar en push a main)
- `data/2027.json` cuando salga el documento

## Nota sobre la referencia visual

El estilo de los Sankey de estados de resultados que circulan es de
SankeyArt. La estructura del diagrama es una convención genérica, pero la
paleta, tipografía y composición son suyas. La implementación va con
identidad propia.
