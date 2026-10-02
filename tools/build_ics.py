#!/usr/bin/env python3
"""Genera calendario.ics (calendario suscribible) a partir de events.json.

Correr después de cada cambio en events.json:
    python tools/build_ics.py
"""
import datetime
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://calendario-cclt.deltakilo.com.mx"
DOMAIN = "calendario-cclt.deltakilo.com.mx"
# Tepic, Nayarit usa el horario del Pacífico de México: UTC-7 todo el año (sin horario de verano).
UTC_OFFSET = datetime.timedelta(hours=-7)
LOCATION = "Colegio de Ciencias y Letras de Tepic, Medicina Humana #105, Col. Spauan, Tepic, Nay."


def esc(text):
    return (text.replace("\\", "\\\\").replace(";", "\\;")
                .replace(",", "\\,").replace("\n", "\\n"))


def fold(line):
    """RFC 5545: líneas de máximo 75 octetos; las continuaciones empiezan con un espacio."""
    data = line.encode("utf-8")
    parts = []
    limit = 75
    while len(data) > limit:
        cut = limit
        while cut > 0 and (data[cut] & 0xC0) == 0x80:
            cut -= 1
        parts.append(data[:cut].decode("utf-8"))
        data = data[cut:]
        limit = 74
    parts.append(data.decode("utf-8"))
    return "\r\n ".join(parts)


def ymd(date):
    return date.strftime("%Y%m%d")


def main():
    data = json.loads((ROOT / "events.json").read_text(encoding="utf-8"))
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Delta Kilo//Agenda CCLT 1.1//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Agenda CCLT 1.1",
        "X-WR-CALDESC:Actividades del Grupo 1.1\\, Secundaria CCLT Tepic",
        "X-WR-TIMEZONE:America/Mazatlan",
        "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
        "X-PUBLISHED-TTL:PT6H",
    ]

    for ev in data.get("events", []):
        if not ev.get("dateStart"):
            continue
        start = datetime.date.fromisoformat(ev["dateStart"])
        end = datetime.date.fromisoformat(ev.get("dateEnd") or ev["dateStart"])

        desc_parts = []
        if ev.get("note"):
            desc_parts.append(ev["note"])
        if ev.get("checklist"):
            desc_parts.append("Llevar / pendientes: " + ", ".join(ev["checklist"]))
        desc_parts.append(SITE)

        lines.append("BEGIN:VEVENT")
        lines.append(f"UID:{ev['id']}@{DOMAIN}")
        lines.append(f"DTSTAMP:{stamp}")
        if ev.get("time"):
            hh, mm = (int(x) for x in ev["time"].split(":"))
            local = datetime.datetime.combine(start, datetime.time(hh, mm))
            utc = local - UTC_OFFSET
            lines.append("DTSTART:" + utc.strftime("%Y%m%dT%H%M%SZ"))
            lines.append("DTEND:" + (utc + datetime.timedelta(hours=1)).strftime("%Y%m%dT%H%M%SZ"))
        else:
            lines.append("DTSTART;VALUE=DATE:" + ymd(start))
            lines.append("DTEND;VALUE=DATE:" + ymd(end + datetime.timedelta(days=1)))
        lines.append("SUMMARY:" + esc(ev["title"]))
        lines.append("DESCRIPTION:" + esc("\n\n".join(desc_parts)))
        lines.append("LOCATION:" + esc(LOCATION))
        lines.append("URL:" + SITE)
        if ev.get("alert"):
            lines += [
                "BEGIN:VALARM",
                "ACTION:DISPLAY",
                "DESCRIPTION:" + esc(ev.get("alertText") or ev["title"]),
                "TRIGGER:-PT6H",
                "END:VALARM",
            ]
        lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")
    out = "\r\n".join(fold(l) for l in lines) + "\r\n"
    (ROOT / "calendario.ics").write_bytes(out.encode("utf-8"))
    print(f"calendario.ics generado: {sum(1 for l in lines if l == 'BEGIN:VEVENT')} eventos")


if __name__ == "__main__":
    main()
