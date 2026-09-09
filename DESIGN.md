# Design doc

## Para quién y para qué

Para cualquier persona que pague impuestos en México y nunca haya abierto un
documento de la Secretaría de Hacienda. No para economistas: ellos ya tienen
los PDFs.

El sitio tiene un solo trabajo: que alguien entienda, en menos de un minuto,
que **el gobierno gasta más de lo que cobra y la diferencia la pide
prestada**. Todo lo demás — el desglose, la comparación entre años, los
cambios de la ley — existe para que quien quiera hurgar pueda hacerlo, pero
no es lo que tiene que quedar grabado.

## El hallazgo que organiza todo

La Ley de Ingresos y el gasto cuadran exacto:

```
                              2027            2026
Ley de Ingresos (total)   10,636,488.1   10,193,683.6   millones de pesos
Gasto total (devengado)   10,636,488.1   10,193,683.6
```

No es coincidencia contable: la Ley de Ingresos lista la deuda como un
renglón de ingreso más, junto al ISR y al IVA. El "boquete" no es algo que
haya que calcular ni deducir — está escrito en la ley como una entrada de
dinero.

Eso permite un diagrama que cierra perfecto, con la deuda entrando por la
izquierda:

```
Impuestos          6,263.9 ─┐
IMSS/ISSSTE/CFE    1,386.3 ─┤
Petróleo             984.5 ─┼──►  10,636.5  ──┬─► Programas y servicios  7,432.5
Derechos y cobros    521.8 ─┤                 ├─► Intereses de la deuda  1,575.0
Deuda nueva        1,480.0 ─┘                 ├─► Estados y municipios   1,547.6
                                              └─► Deudas del año pasado     81.4
```

Y produce la frase que abre el sitio: **de cada $100 que el gobierno planea
gastar en 2027, 14 los pide prestados**.

Un detalle que el color tiene que enseñar solo: la deuda entra roja por la
izquierda y los intereses salen rojos por la derecha. Son el mismo dinero en
dos momentos. En 2027 los intereses (1,575.0) son más de lo que se reparte a
los 32 estados juntos (1,547.6).

## Decisiones de diseño

### Paleta: tintas de billete

Fondo verde intaglio profundo (`#0D2622`), el del reverso de los billetes
mexicanos, con las denominaciones como paleta de datos: azul del $500 para
impuestos, morado del $50 para seguridad social, ocre del $1000 para
petróleo, verde del $200 para derechos, rojo del $100 para deuda.

Se descartó el fondo crema con serif y acento terracota, que es a lo que
tiende cualquier página de datos hecha hoy, y el negro con un solo acento
fluorescente. El fondo oscuro también hace que las cintas de colores se lean
como tinta sobre papel de seguridad, que es literalmente el material del
tema.

El rojo está reservado para la deuda y para nada más. Es el único color con
significado moral en la página.

### Tipografía: una familia, dos anchos

Archivo variable, aprovechando su eje de ancho. Títulos en `wdth 118 / wght
760`; texto en `wdth 100 / wght 400`. Los números usan cifras tabulares
(`tabular-nums`), que no es decorativo: sin ellas, las columnas de una tabla
financiera bailan y se vuelven imposibles de comparar de un vistazo.

### El héroe: cien cuadritos

En lugar de un número gigante con degradado, la portada es una cuadrícula de
**100 cuadritos**, uno por cada peso que el gobierno planea gastar, coloreados
según de dónde viene cada uno. Catorce están en rojo.

Es concreto, es contable a mano, y funciona sin saber leer una gráfica. Al
pasar el cursor o tocar un cuadrito, el sitio dice de dónde salió ese peso.

El reparto usa el método de mayores residuos, así que la suma da 100 exacta
en ambos años — no 99 ni 101, que es lo que pasa si se redondea cada rubro
por separado.

Esta es la única pieza donde el diseño se pone ruidoso. Todo lo demás está
deliberadamente callado.

### Movimiento

Un solo momento orquestado: los cien cuadritos entran escalonados al cargar,
7 milisegundos entre uno y otro. Fuera de eso, la animación solo responde a
lo que hace la persona — abrir un nodo, cambiar de año, cambiar de unidad.
`prefers-reduced-motion` apaga todo.

## Interacción

Cuatro cosas con las que jugar:

**Cambiar de año.** Botón permanente arriba. Todo se recalcula: la portada,
el flujo, la tabla.

**Cambiar de unidad.** El mismo número visto de cuatro maneras: pesos, % del
PIB, "de cada $100" y pesos por persona al año. La misma cifra deja de ser
abstracta cuando dice *$47,274 por persona* en vez de *6.26 billones*.

**Abrir el flujo.** Cada bloque con desglose se abre al tocarlo. El IEPS baja
hasta el nivel de producto: gasolina, cerveza, tabaco, refrescos, plaguicidas,
videojuegos con violencia. Ese último renglón existe en la ley con una
estimación de cero pesos, y es el tipo de cosa que la gente encuentra sola y
comparte.

**Ver la tabla.** Los mismos datos en texto, con los dos años lado a lado,
para quien quiera verificar contra el PDF.

## Honestidad del dato

Cuatro advertencias van en el sitio, no escondidas en un pie de página:

1. **Proyecto ≠ aprobado.** 2027 es una propuesta que el Congreso puede
   cambiar hasta noviembre. 2026 ya está aprobado. Cada pantalla lo marca.
2. **Bolsa total ≠ gasto del año.** Difieren en los pagos que se difieren a
   enero. El sitio usa la bolsa porque es lo único que hace cuadrar el flujo,
   y lo dice donde aparece.
3. **Nominal ≠ real.** Las comparaciones usan las variaciones reales
   publicadas por la SHCP, copiadas tal cual. No las calculamos.
4. **La población es aproximada.** Viene de CONAPO, no de Hacienda, y está
   marcada como editable en el JSON.

Los subtotales suman exacto a su total en los dos años. Cuando el documento
original publicaba el desglose redondeado a miles de millones, un renglón
absorbe la diferencia y viene marcado con `"residual": true` en los datos.

## Arquitectura

```
index.html          el sitio entero
data/paquete.json   todas las cifras
```

Sin build, sin dependencias, sin framework. La única petición externa es la
tipografía de Google Fonts. El sitio lee el JSON al cargar y dibuja todo,
incluido el diagrama de flujo, que es SVG generado a mano — no hay librería
de gráficas.

La razón de no usar D3 ni ECharts: el diagrama tiene una topología fija de
tres columnas y unos veinte nodos. Escribirlo directo son cien líneas, no
depende de un CDN que se puede caer, y se puede modificar sin aprender la
API de nadie.

## Lo que quedó fuera, a propósito

**Desglose por ramo** (Bienestar, Educación, Salud por separado). No viene en
los Criterios Generales; requiere los datos abiertos del Proyecto de
Presupuesto de Egresos, que se publican después. El sitio funciona completo
sin eso y se puede enriquecer cuando lleguen.

**Series históricas.** Dos años ya cuentan la historia. Diez la vuelven un
ejercicio de analista.

**Calculadora de "cuánto pagas tú".** Requiere supuestos sobre incidencia
fiscal que ningún documento oficial respalda, y sería inventar precisión que
no existe.
