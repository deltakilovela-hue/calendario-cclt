# Agenda CCLT 1.1

Calendario de actividades para padres de familia del Grupo 1.1, Secundaria,
Colegio de Ciencias y Letras Tepic (SPAUN). Sitio estático, sin backend.

- Sitio: https://calendario-cclt.deltakilo.com.mx
- Hospedaje: GitHub Pages (rama `main`, carpeta raíz), dominio personalizado vía `CNAME`.

## Actualizar el cronograma cada mes

Todos los eventos viven en [`events.json`](./events.json) — `index.html` solo
lee ese archivo. Para actualizar:

1. Edita `events.json` (agrega, quita o cambia eventos).
2. Cada evento admite estos campos:
   - `dateStart` (`"YYYY-MM-DD"`, o `null` si aún no hay fecha — "Por definir")
   - `dateEnd` (opcional, para rangos de varios días)
   - `time` (opcional, `"HH:MM"`)
   - `category`: `vialidad`, `reunion`, `convivencia`, `honores`, `consejo`,
     `suspension`, `hito` o `admin`
   - `title`, `note`
   - `highlight: true` si el evento aplica específicamente al Grupo 1.1
3. Actualiza el campo `updated` (fecha de hoy).
4. Guarda, haz commit y push a `main` — GitHub Pages publica el cambio en un
   par de minutos, no requiere ningún build.

También puedes simplemente pedirle a Delta Kilo que actualice el cronograma
del mes con la foto/PDF que mande el colegio.
