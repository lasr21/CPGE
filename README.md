# ¿De dónde sale y a dónde va el dinero público?

Un sitio para entender el presupuesto federal mexicano sin ser economista:
cuánto planea cobrar el gobierno, cuánto va a pedir prestado, en qué se lo va
a gastar, y cómo cambia de un año a otro.

Está construido sobre el **Paquete Económico**, los tres documentos que el
Ejecutivo manda al Congreso cada 8 de septiembre.

## De dónde salen las cifras

Toda la información viene del portal oficial de la Secretaría de Hacienda:

**<https://www.finanzaspublicas.hacienda.gob.mx/es/Finanzas_Publicas/Paquete_Economico_y_Presupuesto>**

Ese portal es la única fuente autorizada, y **sus cifras pueden cambiar**. El
Paquete Económico que se entrega en septiembre es una *propuesta*: la Cámara
de Diputados la discute y la puede modificar hasta el 15 de noviembre. Lo que
se aprueba casi nunca es idéntico a lo que se propuso.

Documentos usados en esta versión:

| Documento | Qué aporta |
|---|---|
| Criterios Generales de Política Económica 2026 | Cifras del año de comparación |
| Criterios Generales de Política Económica 2027 | Ingresos, gasto, deuda y marco macroeconómico |
| Iniciativa de Ley de Ingresos de la Federación 2027 | Desglose de cada impuesto y los cambios legales |

Este repositorio **no es oficial** ni está afiliado a ninguna dependencia del
gobierno. Es una lectura de documentos públicos.

## Cómo verlo

El sitio es HTML estático. Se publica solo con GitHub Pages: en
**Settings → Pages**, elige la rama `main` y la carpeta `/ (root)`.

Para verlo en tu computadora necesitas un servidor local, porque el navegador
bloquea la lectura de archivos locales por seguridad:

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

Abrir `index.html` con doble clic **no funciona** — el sitio te lo va a decir
con un mensaje explícito si lo intentas.

## Cómo está armado

```
index.html            todo el sitio: estructura, estilos e interacción
data/paquete.json     todas las cifras
DESIGN.md             por qué está diseñado así y qué decisiones se tomaron
```

No hay build, ni dependencias, ni framework. Un archivo de datos y un archivo
de sitio. Si cambias un número en el JSON, el sitio se actualiza al recargar.

## Cómo agregar el año que viene

1. Abre `data/paquete.json` y duplica el bloque de `anios`, cambiando el año.
2. Llena las cifras desde el Anexo II.6 de los Criterios Generales, que es la
   tabla que trae todo en millones de pesos.
3. Actualiza `variaciones_reales` con los porcentajes que publica la SHCP
   (vienen en las últimas columnas de esa misma tabla; no los calcules).
4. Agrega el botón del año nuevo en la barra superior de `index.html`.

Antes de publicar, verifica que cuadre:

```bash
node -e '
const d=require("./data/paquete.json");
for(const [a,y] of Object.entries(d.anios)){
  const f=y.fuentes.reduce((s,n)=>s+n.monto,0);
  const g=y.destinos.reduce((s,n)=>s+n.monto,0);
  console.log(a, Math.abs(f-y.totales.bolsa)<1 && Math.abs(g-y.totales.bolsa)<1 ? "cuadra" : "NO CUADRA");
}'
```

Si no cuadra, casi siempre es que se leyó mal una columna de la tabla
original: los documentos ponen juntas las columnas del año en curso, las del
año anterior y las de variación porcentual.

## Cosas que conviene saber antes de citar estos números

**La bolsa total no es el gasto del año.** Las dos cifras difieren en los
pagos que se difieren a enero del año siguiente. El sitio usa la bolsa total
porque es lo único que hace cuadrar el flujo, y lo explica donde aparece.

**Nominal no es lo mismo que real.** Un rubro puede crecer 3% en pesos y aun
así comprar menos, si los precios subieron 4%. Las comparaciones del sitio
usan las variaciones *reales* publicadas por Hacienda, ya descontada la
inflación.

**Proyecto no es lo mismo que aprobado.** Las cifras de 2027 son una
propuesta; las de 2026 ya pasaron por el Congreso. El sitio marca cuál es
cuál en cada pantalla.

**La población es aproximada.** La vista de "pesos por persona" usa una
proyección de CONAPO que no viene en los documentos de Hacienda. Está
señalada en el JSON para que la puedas corregir.

## Licencia

Los datos son documentos públicos del gobierno mexicano. El código de este
repositorio es de uso libre.
