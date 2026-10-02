# Agenda CCLT 1.1

Calendario de actividades para padres de familia del Grupo 1.1, Secundaria,
Colegio de Ciencias y Letras Tepic (SPAUN). Sitio estático (GitHub Pages) con
Supabase para comentarios, turnos de vialidad y el altar de Día de Muertos.

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
   - `alert: true` + `alertText` (opcional): aviso rojo arriba de la agenda los
     3 días previos. `consejo`, `suspension` y `vialidad` avisan solos.
   - `checklist` (lista de textos) + `checklistTitle` (opcional, por defecto
     "🎒 Qué llevar"): casillas que cada papá palomea en su celular.
   - `extraLinkUrl` + `extraLinkLabel` (opcional): botón extra en la tarjeta.
3. Actualiza `updated` (fecha de hoy) y, si hay, `birthdaysMonth` + `birthdays`
   (la tarjeta de cumpleañeros solo se muestra si `birthdaysMonth` es el mes actual).
4. **Regenera el calendario suscribible:** `python tools/build_ics.py`
   (crea `calendario.ics`, que es lo que ven los papás suscritos en su celular).
5. Haz commit de `events.json` y `calendario.ics` y push a `main` — GitHub
   Pages publica el cambio en un par de minutos.

También puedes simplemente pedirle a Delta Kilo que actualice el cronograma
del mes con la foto/PDF que mande el colegio.

## Tablas de Supabase

`comments`, `vialidad_signups` y `ofrenda` (altar de Día de Muertos). Todas con
RLS: lectura e inserción públicas; borrado solo desde el celular que creó el
registro (o por el administrador desde el panel de Supabase).
