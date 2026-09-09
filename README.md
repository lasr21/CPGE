# Cuentas Públicas

Infografía estática sobre el presupuesto federal de México: de dónde sale el dinero, a dónde va y qué parte se financia con deuda.

## Estructura

```text
data/                  JSON por año y manifest de la serie
schema/                JSON Schema del paquete económico
scripts/               Validador contable sin dependencias
src/                   Sitio HTML, CSS y JavaScript
.github/workflows/     Validación y publicación en GitHub Pages
DESIGN.md              Decisiones de producto y visualización
EXTRACTION.md          Instrucciones para extraer futuros años
```

## Probar localmente

Requiere Node.js 18 o posterior y Python 3 para el servidor local.

```powershell
node scripts/validate.mjs
python -m http.server 4173
```

Abre <http://localhost:4173/src/>. El selector muestra los años con `estado: "listo"` en `data/manifest.json`.

El `2027.json` actual es una copia de prueba de 2026. Está marcado en el manifest como listo únicamente para comprobar la comparación y el despliegue. Debe reemplazarse por los datos reales del PPEF 2027 cuando se publique.

## Publicar en GitHub Pages

1. Sube el repositorio a GitHub con la rama principal llamada `main`.
2. En **Settings > Pages**, selecciona **GitHub Actions** como fuente de despliegue.
3. Haz push a `main`.

El workflow ejecuta `node scripts/validate.mjs` antes de publicar. Si falla una identidad contable, el despliegue se detiene. El sitio publicado se construye en `dist/` con `src/` y `data/`; no requiere npm ni un build step.

## Añadir un año real

1. Agrega `data/AAAA.json` con el esquema de `schema/paquete.schema.json`.
2. Añade una entrada a `data/manifest.json` y marca `estado` como `listo` solo después de validar.
3. Ejecuta `node scripts/validate.mjs`.
4. Revisa el sitio y haz commit.

Los identificadores de los nodos deben permanecer estables para que la comparación entre años pueda empatar rubros.