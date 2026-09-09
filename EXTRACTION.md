# Extracción del Paquete Económico → JSON

Cómo convertir el markdown del CGPE de un año nuevo en `data/<año>.json`.

## Cómo se usa

1. Convierte el PDF del CGPE a markdown (cualquier extractor sirve; la salida
   va a estar sucia y eso está previsto).
2. Abre una conversación nueva y sube tres archivos: el markdown del CGPE,
   `schema/paquete.schema.json` y `data/2026.json` como ejemplo resuelto.
3. Pega el prompt de abajo, sin editar.
4. Guarda la salida como `data/2027.json`.
5. Corre `node scripts/validate.mjs data/2027.json`. **Si truena, no lo
   arregles a mano de inmediato**: pega el error de vuelta en la conversación
   y pide la corrección. El error casi siempre apunta a un renglón mal leído,
   no a un total mal calculado.
6. Cambia `estado` a `"listo"` en `data/manifest.json`.

El principio: el modelo **solo transcribe hojas**. Nunca suma, nunca
promedia, nunca infiere un residual. Toda la aritmética la rehace
`validate.mjs` contra los totales publicados. Así un error de lectura truena
en vez de publicarse en silencio.

---

## Prompt

````
Vas a extraer datos fiscales de los Criterios Generales de Política Económica
(CGPE) de México y devolverlos como JSON. Te doy tres archivos: el markdown del
CGPE del año nuevo, el esquema `paquete.schema.json`, y `2026.json` como
ejemplo ya resuelto y validado.

# Regla number uno

TRANSCRIBES, NO CALCULAS. Cada `monto_mdp` que escribas tiene que aparecer
literalmente en una tabla del documento. Nunca sumes hijos para obtener un
padre, nunca despejes un residual, nunca ajustes un número para que cuadre.
Si un total y sus componentes no coinciden en el documento, transcribe ambos
tal cual: hay un validador aguas abajo cuyo trabajo es detectar eso.

Si un rubro no está en el documento: `"confianza": "no_encontrado"`,
`"monto_mdp": 0`, y explica en `nota` dónde buscaste. NO lo estimes, NO lo
copies del año anterior, NO lo omitas del árbol.

# Unidades

Todo sale en **millones de pesos corrientes (mdp)**.

El CGPE mezcla dos unidades y esta es la fuente número uno de errores:
- El **Anexo II.6** viene en mdp. Cópialo tal cual → `"confianza": "publicado"`.
- Casi todas las tablas del cuerpo vienen en **miles de millones (mmp)**.
  Multiplica por 1000 → `"confianza": "indicativo"`.

Antes de escribir cada número, verifica el encabezado de su tabla. Un ingreso
tributario ronda los 5,800,000 mdp; si escribiste 5,838.6 te faltaron tres
ceros.

Ojo también con las tablas en **"pesos constantes de <año>"**: para el año
fiscal en curso constantes = corrientes, así que sirven; para el año anterior
NO, no las uses para la columna comparativa.

# Qué columna leer

Las tablas traen varias columnas: `LIF / Estimado`, `PPEF / PEF`,
`Aprobado / Estimado`, más columnas de variación absoluta y porcentual.

Toma **siempre la columna del año fiscal nuevo** (el año del título del
documento). Ignora por completo las columnas del año anterior y las de
variación: el sitio calcula las variaciones solo, contra el archivo del año
pasado. Si transcribes una variación como si fuera un monto, el Sankey se
rompe de una forma difícil de detectar.

# Las tablas están rotas y así se leen

La conversión de PDF a markdown deja renglones mutilados: unos como tablas
markdown, otros como texto plano con los números separados por espacios,
columnas vacías intercaladas, encabezados partidos en tres renglones.

Estrategia: localiza la etiqueta del renglón, luego lee la secuencia de
números que le sigue y asígnalos en orden a las columnas del encabezado.
Después verifica: los componentes deben aproximarse al total del mismo
renglón "Total". Si no se aproximan, releíste mal las columnas.

# Tablas a extraer, en orden de prioridad

1. **Anexo II.6 "Estimación de las finanzas públicas"** — la tabla más
   importante del documento. Viene en mdp y con % del PIB. De aquí salen:
   RFSP, balance presupuestario, requerimientos extrapresupuestarios,
   ingresos presupuestarios y todo su árbol (petroleros / no petroleros /
   Gobierno Federal / tributarios / no tributarios / organismos y empresas),
   gasto neto pagado, programable pagado, diferimiento de pagos, programable
   devengado, no programable, costo financiero, participaciones, adefas,
   balance primario y SHRFSP. Empieza aquí siempre.

2. **Anexo II.5 "Marco macroeconómico"** — PIB nominal (en mmp: multiplica
   por 1000), deflactor del PIB, inflación dic/dic, tipo de cambio promedio,
   Cetes 28 promedio, precio del petróleo, plataforma de producción.
   El PIB nominal y el deflactor son **obligatorios**: sin ellos no hay
   porcentajes del PIB ni comparación en términos reales.

3. **Tabla "Balance público"** (sección de política de responsabilidad
   hacendaria) — desglose por ente: Gobierno Federal, Pemex, CFE, IMSS,
   ISSSTE. Va en `balance.desglose_entes`.

4. **Tabla "Ingresos tributarios"** (sección 3.3.x) — ISR / sistema renta,
   IVA, IEPS, importación, ISAN, IAEEH, accesorios, otros. Son hijos de
   `ing_tributarios`.

5. **Tabla "Ingresos presupuestarios"** (sección 3.3.x) — de aquí sale
   únicamente el corte de petroleros en Gobierno Federal vs propios de Pemex.
   Son hijos de `ing_petroleros`.

6. **Tabla "Gasto programable ... clasificación económica"** — corriente
   (servicios personales, subsidios, otros de operación), pensiones y
   jubilaciones, inversión (física, financiera, subsidios).
   Va en `clasificaciones_gasto.economica`.

7. **Tabla "Gasto programable ... clasificación funcional"** — Poderes y
   órganos autónomos, Administración Pública Federal (gobierno, desarrollo
   social, desarrollo económico, fondos de estabilización).
   Va en `clasificaciones_gasto.funcional`.

8. **Tabla "Transferencias federales a las entidades federativas"** —
   participaciones, aportaciones, otros. Va en `transferencias_estados`.

Las clasificaciones 6 y 7 son cortes del gasto programable **devengado**,
no del pagado. Ambas deben sumar al mismo total.

# IDs: la parte que hace posible la comparación

Reutiliza **exactamente** los `id` de `2026.json`. Los `id` son la llave con
la que el sitio empata rubros entre años; si cambias uno, ese rubro aparece
como "nuevo en 2027" y su contraparte como "desaparecido", y la comparación
queda mal.

Si SHCP renombra un rubro, conserva el `id` viejo y pon el nombre nuevo en
`nombre`. Si de plano aparece un rubro que no existía, invéntale un `id`
snake_case nuevo, agrégalo, y menciónalo al final de tu respuesta para que un
humano lo revise.

# Campo `confianza`

- `publicado` — el número está literal en una tabla, en mdp (o sea: Anexo II.6).
- `derivado` — lo convertiste de unidades o de signo, sin sumar nada.
- `indicativo` — viene de una tabla en mmp, así que trae ruido de redondeo,
  o pertenece a un corte de clasificación que no empata perfecto con su padre.
- `no_encontrado` — no venía. `monto_mdp` en 0.

Ante la duda, usa el nivel más conservador. `indicativo` afloja la tolerancia
del validador y evita falsos positivos.

# Signos

- Ingresos y gastos: siempre positivos.
- `balance_presupuestario_mdp`, `rfsp_mdp`,
  `requerimientos_extrapresupuestarios_mdp`: negativos cuando son déficit,
  que es el caso normal. Respeta el signo del documento.
- `shrfsp_mdp` (deuda acumulada): positivo.
- Un balance por ente puede ser positivo (superávit) o negativo.

# Campo `fuente`

En cada nodo, di dónde lo sacaste con precisión suficiente para que otra
persona lo verifique: `"Anexo II.6 Estimación de las finanzas públicas"`,
`"Tabla 3.3.5 Ingresos tributarios (mmp)"`. Este campo se muestra en el
tooltip del sitio; es lo que hace la infografía auditable.

# Salida

Devuelve **solo el JSON**, sin markdown, sin ```json, sin preámbulo ni
comentarios. Debe validar contra `paquete.schema.json` y ser parseable
directo.

Después del JSON, en un bloque de texto aparte, reporta:
- Rubros marcados `no_encontrado` y dónde buscaste.
- Tablas cuyos componentes no sumaban a su total publicado, con ambas cifras.
- IDs nuevos que hayas inventado.
- Cualquier cambio de estructura o de metodología respecto al documento de 2026.

Si algo del documento contradice estas instrucciones, dilo en ese reporte en
vez de resolverlo por tu cuenta.
````

---

## Verificaciones que corre `validate.mjs`

Ninguna de estas la hace el modelo. Todas se recalculan desde cero.

| Identidad | Por qué importa |
|---|---|
| `gasto − ingresos = −balance_presupuestario` | Es el Sankey. Si no cierra, la infografía miente. |
| `balance_presupuestario + extrapresupuestarios = RFSP` | Detecta signos invertidos. |
| Cada padre ≈ suma de sus hijos | Atrapa renglones mal leídos o columnas cruzadas. |
| `monto / PIB ≈ pct_pib publicado` | Atrapa errores de unidad de mil en mil. |
| Clasificación económica = clasificación funcional | Ambas son el mismo universo por cortes distintos. |
| Devengado ≥ pagado | El diferimiento de pagos solo va en un sentido. |
| IDs únicos y presentes | Sin esto la comparación entre años se rompe en silencio. |
| Hojas con monto < 1,000 mdp | Señal de que se transcribió mmp como mdp. |

Tolerancias: 0.1% para `publicado`, 0.5% para `indicativo`. El caso real de
2026: el desglose de tributarios suma 5,838,800 mdp contra un total publicado
de 5,838,571 mdp. Son 229 mdp de puro redondeo y pasa. Un dígito de más en el
IVA no pasa.
