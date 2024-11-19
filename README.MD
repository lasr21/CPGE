# Paquete Económico Legible 2025

Este repositorio contiene una versión más accesible del documento **Criterios Generales de Política Económica 2025** publicado por el Gobierno de México. El objetivo principal es facilitar el análisis, la manipulación y la edición de este documento para analistas, periodistas y cualquier persona interesada.

## Motivación

El Gobierno de México publicó el documento oficial como un PDF en el que los textos no son seleccionables. Esto dificulta la extracción de información, como tablas y gráficos, y limita su uso para análisis detallados.

Para resolver este problema, decidí crear este repositorio donde:
- Todo el texto ha sido convertido a un formato Markdown.
- Las imágenes del documento original se mantienen intactas.
- Las tablas han sido reconstruidas como texto estructurado (Markdown).

## Contenido del Repositorio

1. **Archivo Markdown del documento completo**: 
   - Cada página del documento original ha sido convertida en un archivo Markdown. 
   - Puedes empezar a leer el documento desde [MD/1.md](./MD/1.md).

2. **PDF seleccionable**:  
   - Incluyo una versión del PDF con texto seleccionable, generado a partir del original.  
   - [Descarga aquí el PDF seleccionable](./CGPE_2025_seleccionable.pdf).  

3. **Documento original (PDF no seleccionable)**:  
   - Puedes consultar el documento oficial original publicado por el Gobierno de México:  
   - [Descarga aquí el documento original](https://www.ppef.hacienda.gob.mx/work/models/GYPPF25Q/PPEF2025/lurbgnma/paquete/politica_hacendaria/CGPE_2025.pdf).

## Proceso de Conversión

El proceso de transformación se realizó en varias etapas:

1. **Extracción de imágenes**:  
   Converti cada página del pdf en una imagen.

2. **OCR y conversión a texto**:  
   Utilicé un script de Python con la biblioteca `Tesseract OCR` para extraer texto de las imágenes y convertirlas en archivos Markdown.

3. **Reconstrucción de tablas**:  
   Las tablas fueron revisadas manualmente y reconstruidas con la ayuda de ChatGPT.

4. **Corrección de errores**:  
   Revisé los archivos Markdown y realicé ajustes básicos. Sin embargo, **pueden existir errores** en la extracción automática del OCR.

5. **Generación del PDF seleccionable**:  
   Utilicé **iLovePDF** para generar una versión seleccionable del PDF original, también disponible en este repositorio.

## Notas Importantes

- Este proyecto fue realizado como una iniciativa personal para aprender más sobre el manejo de PDFs y Python.  
- No representa una versión oficial ni una interpretación certificada del documento.  
- Algunos errores pueden persistir en la conversión automática, especialmente en tablas complejas o formatos específicos.

## Contribuciones

Este proyecto es abierto y bienvenido a sugerencias, correcciones o mejoras. Si notas algún error o tienes una propuesta, no dudes en crear un **pull request** o abrir un **issue**.

---

Hecho con amor y curiosidad por **lasr21** en unas horas.