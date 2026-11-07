# Genera imprimir/examen-matematicas.html (guía + examen + respuestas, tamaño carta).
# Para el PDF: tools/build_examen_mate.py y luego Chrome/Edge --headless --print-to-pdf.
import math, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'imprimir', 'examen-matematicas.html')

def poly(n, label, w=150, h=130, r=48, fill='#e8f1fb', stroke='#2e6e9e'):
    cx, cy = w / 2, h / 2 + 10
    start = -math.pi / 2 + math.pi / n          # lado superior horizontal
    pts = [(cx + r * math.cos(start + 2 * math.pi * i / n), cy + r * math.sin(start + 2 * math.pi * i / n)) for i in range(n)]
    top_y = min(p[1] for p in pts)
    p = ' '.join('%.1f,%.1f' % q for q in pts)
    return (f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}"><polygon points="{p}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
            f'<text x="{cx}" y="{top_y - 7:.1f}" text-anchor="middle" class="lbl">{label}</text></svg>')

def rect(base, alt, w=190, h=120):
    return (f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}"><rect x="40" y="25" width="120" height="65" fill="#fdecef" stroke="#b03050" stroke-width="2"/>'
            f'<text x="100" y="18" text-anchor="middle" class="lbl">{base}</text>'
            f'<text x="33" y="62" text-anchor="end" class="lbl">{alt}</text></svg>')

def tri(a, b, c, w=190, h=130):
    return (f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}"><polygon points="40,105 150,105 70,20" fill="#eaf7ec" stroke="#2e8a4a" stroke-width="2"/>'
            f'<text x="44" y="60" text-anchor="end" class="lbl">{a}</text>'
            f'<text x="118" y="58" class="lbl">{b}</text>'
            f'<text x="95" y="124" text-anchor="middle" class="lbl">{c}</text></svg>')

def trap(top, bottom, side, w=200, h=120):
    return (f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}"><polygon points="65,30 135,30 175,95 25,95" fill="#e8f1fb" stroke="#2e6e9e" stroke-width="2"/>'
            f'<text x="100" y="22" text-anchor="middle" class="lbl">{top}</text>'
            f'<text x="100" y="114" text-anchor="middle" class="lbl">{bottom}</text>'
            f'<text x="38" y="62" text-anchor="end" class="lbl">{side}</text>'
            f'<text x="162" y="62" class="lbl">{side}</text></svg>')

def circ(d, w=170, h=130):
    return (f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}"><circle cx="85" cy="65" r="55" fill="#fff6d6" stroke="#b8860b" stroke-width="2"/>'
            f'<line x1="30" y1="65" x2="140" y2="65" stroke="#b03050" stroke-width="1.6" stroke-dasharray="5 4"/>'
            f'<circle cx="85" cy="65" r="3" fill="#b03050"/>'
            f'<text x="85" y="57" text-anchor="middle" class="lbl">{d}</text></svg>')

def kite():
    return ('<svg viewBox="0 0 190 150" width="190" height="150"><polygon points="95,12 150,60 95,140 40,60" fill="#fdecef" stroke="#b03050" stroke-width="2"/>'
            '<text x="56" y="30" text-anchor="end" class="lbl">2t + 1</text><text x="134" y="30" class="lbl">2t + 1</text>'
            '<text x="56" y="110" text-anchor="end" class="lbl">p − 4</text><text x="134" y="110" class="lbl">p − 4</text></svg>')

def box(ans='', tall=False):
    return f'<div class="ans{" tall" if tall else ""}">{ans}</div>'

HEADER = '''<div class="head">
  <div><div class="school">Colegio de Ciencias y Letras de Tepic · Secundaria · Grupo 1.1</div>
  <h1>{title}</h1></div>
  <div class="meta">{meta}</div>
</div>'''

guia = HEADER.format(title='Guía de estudio · Matemáticas Esfera 5', meta='Examen: martes 10 de noviembre') + '''
<p class="sub">Key 1 · Expresiones algebraicas en problemas &nbsp;·&nbsp; Key 2 · Perímetro de polígonos y del círculo</p>
<div class="cols">
<div>
<h2>Conceptos</h2>
<dl>
<dt>Perímetro</dt><dd>La suma de las medidas de todos los lados de una figura (su contorno).</dd>
<dt>Término semejante</dt><dd>Términos con la <b>misma literal y el mismo exponente</b>, aunque tengan distinto número adelante. Ej.: 2x y −5x sí; m² y m³ no.</dd>
<dt>Término independiente</dt><dd>El que es solo número, sin literal. En 4x + 2 → el <b>2</b>.</dd>
<dt>Coeficiente</dt><dd>El número que multiplica a la literal. En 4x → el <b>4</b>.</dd>
<dt>Polígono regular</dt><dd>Todos sus lados (y ángulos) son iguales.</dd>
<dt>Polígono irregular</dt><dd>Al menos uno de sus lados es diferente a los demás.</dd>
</dl>
<h2>Polígonos y número de lados</h2>
<table class="sides"><tr><td>Triángulo</td><td>3</td><td>Hexágono</td><td>6</td></tr>
<tr><td>Cuadrado / rectángulo</td><td>4</td><td>Heptágono</td><td>7</td></tr>
<tr><td>Pentágono</td><td>5</td><td>Octágono</td><td>8</td></tr>
<tr><td>Eneágono</td><td>9</td><td>Decágono</td><td>10</td></tr></table>
</div>
<div>
<h2>Polígono irregular: suma y simplifica</h2>
<ol class="steps"><li>Escribe la suma de todos los lados.</li><li>Agrupa los términos semejantes y los números.</li><li>Simplifica (suma).</li><li>Escribe la fórmula: primero las literales y al final el número.</li></ol>
<div class="ex">Lados 2t + 1, 2t + 1, p − 4, p − 4<br>= 2t + 2t + p + p + 1 + 1 − 4 − 4<br><b>P = 4t + 2p − 6</b></div>
<h2>Polígono regular: multiplica</h2>
<p>P = (número de lados) × (medida del lado). Luego <b>distribuye</b>: el número multiplica a <u>cada</u> término del paréntesis.</p>
<div class="ex">Hexágono de lado 2x + 3<br>P = 6(2x + 3) = 6·2x + 6·3 = <b>12x + 18</b><br><span class="note">Las dos expresiones son equivalentes.</span></div>
<h2>Circunferencia</h2>
<p><b>P = πD</b> (pi × diámetro), con π ≈ 3.14</p>
<div class="ex">Diámetro 4x + 6 → P = 3.14(4x + 6) = <b>12.56x + 18.84</b></div>
<h2>Sustituir un valor</h2>
<div class="ex">P = 7z + 21, si z = 1 → 7(1) + 21 = <b>28</b></div>
</div>
</div>
'''

examen = HEADER.format(title='Examen de práctica · Matemáticas Esfera 5',
                       meta='Nombre: ______________________<br>Aciertos: ______ / 33') + '''
<p class="sub">Contesta con lápiz y escribe tu procedimiento. Toma 40 minutos, como en el examen real.</p>

<h2>1. Relaciona cada concepto con su definición <span class="pts">(6)</span></h2>
<table class="match"><tr><td>( &nbsp; ) Perímetro</td><td>A. Número que multiplica a la literal.</td></tr>
<tr><td>( &nbsp; ) Término semejante</td><td>B. Polígono con al menos un lado diferente.</td></tr>
<tr><td>( &nbsp; ) Término independiente</td><td>C. Suma de las medidas de todos los lados.</td></tr>
<tr><td>( &nbsp; ) Coeficiente</td><td>D. Polígono con todos sus lados iguales.</td></tr>
<tr><td>( &nbsp; ) Polígono regular</td><td>E. Tienen la misma literal y el mismo exponente.</td></tr>
<tr><td>( &nbsp; ) Polígono irregular</td><td>F. Término que solo es número, sin literal.</td></tr></table>

<h2>2. ¿Cuántos lados tiene? <span class="pts">(4)</span></h2>
<p class="inline">Pentágono: ____ &nbsp;&nbsp; Hexágono: ____ &nbsp;&nbsp; Heptágono: ____ &nbsp;&nbsp; Octágono: ____</p>

<h2>3. Términos semejantes <span class="pts">(3)</span></h2>
<p>a) Encierra los términos semejantes a <b>3x</b>: &nbsp; 5x &nbsp;&nbsp; 3y &nbsp;&nbsp; x² &nbsp;&nbsp; −x &nbsp;&nbsp; 3 &nbsp;&nbsp; 10x</p>
<p>b) En la expresión <b>7a + 9</b>, el coeficiente es ____ y el término independiente es ____.</p>

<h2>4. Simplifica <span class="pts">(3)</span></h2>
<div class="grid3">
<div>a) x + x + x + 3 + 2''' + box() + '''</div>
<div>b) 2y + 5 + 3y − 1''' + box() + '''</div>
<div>c) 2t + 1 + 2t + 1 + p − 4 + p − 4''' + box() + '''</div>
</div>

<h2>5. Escribe la expresión simplificada del perímetro <span class="pts">(6)</span></h2>
<div class="grid3 figs">
<div><b>a)</b> Rectángulo''' + rect('6b', '3b') + box() + '''</div>
<div><b>b)</b> Triángulo''' + tri('2n', '2n − 1', '2n − 2') + box() + '''</div>
<div><b>c)</b> Trapecio''' + trap('z', 'z + 4', 'p') + box() + '''</div>
<div><b>d)</b> Heptágono regular''' + poly(7, 'y + 1') + box() + '''</div>
<div><b>e)</b> Papalote''' + kite() + box() + '''</div>
<div><b>f)</b> Decágono regular''' + poly(10, '2.5k') + box() + '''</div>
</div>

<h2>6. Dos formas del mismo perímetro <span class="pts">(4)</span></h2>
<div class="grid2 figs">
<div><b>a)</b> Hexágono regular''' + poly(6, '2x + 2') + '''
<p class="mini">Como multiplicación: P = ________ <br>Simplificada: P = ________</p></div>
<div><b>b)</b> Octágono regular''' + poly(8, '2g − 1') + '''
<p class="mini">Estrategia A (suma): P = ________ <br>Estrategia B (multiplicación): P = ________</p></div>
</div>

<h2>7. Sustituye el valor <span class="pts">(3)</span></h2>
<div class="grid3">
<div>a) P = 12x + 12, si x = 3''' + box() + '''</div>
<div>b) P = 12x + 12, si x = 0.5''' + box() + '''</div>
<div>c) P = 16g − 8, si g = 2''' + box() + '''</div>
</div>

<h2>8. Perímetro de la circunferencia (usa π = 3.14) <span class="pts">(4)</span></h2>
<div class="grid2 figs">
<div>''' + circ('4x + 6') + '''<p class="mini">Fórmula simplificada: P = ____________<br>Si x = 2: P = ____________</p></div>
<div>''' + circ('5x − 3') + '''<p class="mini">Fórmula simplificada: P = ____________<br>Si x = 3: P = ____________</p></div>
</div>

<h2>9. Reto: escribe la fórmula del perímetro <span class="pts">(+ extra)</span></h2>
<p>a) Un rectángulo cuya base mide el doble de su altura (altura = a). &nbsp; P = ____________</p>
<p>b) Un triángulo isósceles con dos lados de medida y y una base z. &nbsp; P = ____________</p>
<p>c) Un pentágono regular de lado 1.15y + 1.15, un hexágono regular de lado y + 1 y un círculo de diámetro 2y + 2.
Escribe sus perímetros y ordénalos de menor a mayor.</p>''' + box(tall=True) + '''
'''

resp = HEADER.format(title='Respuestas · para papás', meta='Revisen el procedimiento, no solo el resultado') + '''
<div class="cols ansk">
<div>
<h2>1. Relaciona</h2>
<p>Perímetro <b>C</b> · Término semejante <b>E</b> · Término independiente <b>F</b> · Coeficiente <b>A</b> · Polígono regular <b>D</b> · Polígono irregular <b>B</b></p>
<h2>2. Lados</h2>
<p>Pentágono <b>5</b> · Hexágono <b>6</b> · Heptágono <b>7</b> · Octágono <b>8</b></p>
<h2>3. Términos semejantes</h2>
<p>a) <b>5x, −x, 10x</b> (3y tiene otra literal; x² tiene otro exponente; 3 es número)<br>b) Coeficiente <b>7</b>, término independiente <b>9</b></p>
<h2>4. Simplifica</h2>
<p>a) <b>3x + 5</b> &nbsp; b) <b>5y + 4</b> &nbsp; c) <b>4t + 2p − 6</b></p>
<h2>5. Perímetros</h2>
<p>a) 6b + 3b + 6b + 3b = <b>18b</b><br>
b) 2n + 2n − 1 + 2n − 2 = <b>6n − 3</b><br>
c) z + z + 4 + p + p = <b>2p + 2z + 4</b><br>
d) 7(y + 1) = <b>7y + 7</b><br>
e) <b>4t + 2p − 6</b><br>
f) 10(2.5k) = <b>25k</b></p>
</div>
<div>
<h2>6. Dos formas</h2>
<p>a) <b>6(2x + 2) = 12x + 12</b><br>
b) A: 2g + 2g + … (8 veces) − 1 − 1 … = <b>16g − 8</b> · B: <b>8(2g − 1)</b> → 8·2g − 8·1 = 16g − 8</p>
<h2>7. Sustituye</h2>
<p>a) 12(3) + 12 = 36 + 12 = <b>48</b><br>
b) 12(0.5) + 12 = 6 + 12 = <b>18</b><br>
c) 16(2) − 8 = 32 − 8 = <b>24</b></p>
<h2>8. Circunferencia</h2>
<p>4x + 6 → 3.14(4x + 6) = <b>12.56x + 18.84</b>; si x = 2: 25.12 + 18.84 = <b>43.96</b><br>
5x − 3 → 3.14(5x − 3) = <b>15.7x − 9.42</b>; si x = 3: 47.1 − 9.42 = <b>37.68</b></p>
<h2>9. Reto</h2>
<p>a) a + 2a + a + 2a = <b>6a</b><br>
b) <b>2y + z</b><br>
c) Pentágono 5(1.15y + 1.15) = <b>5.75y + 5.75</b> · Hexágono 6(y + 1) = <b>6y + 6</b> · Círculo 3.14(2y + 2) = <b>6.28y + 6.28</b><br>
Orden: <b>pentágono &lt; hexágono &lt; círculo</b> (se comparan los coeficientes: 5.75 &lt; 6 &lt; 6.28)</p>
<div class="score"><b>Calificación:</b> 30–33 ¡Listo! · 25–29 Muy bien, repasar errores · 18–24 Repasar la guía · menos de 18 Volver a estudiar las keys</div>
</div>
</div>
'''

CSS = '''
@page{ size: letter; margin: 13mm 14mm; }
*{ box-sizing:border-box; }
body{ font-family: "Segoe UI", Arial, sans-serif; color:#1b1b1b; font-size:11pt; line-height:1.32; margin:0; background:#fff; }
.page{ page-break-after: always; break-after: page; }
.page:last-child{ page-break-after: auto; break-after: auto; }
.head{ display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #2e6e9e; padding-bottom:6px; margin-bottom:8px; gap:12px; }
.school{ font-size:8.5pt; letter-spacing:.06em; text-transform:uppercase; color:#555; }
h1{ font-size:17pt; margin:2px 0 0; color:#1d4f75; }
.meta{ font-size:10pt; text-align:right; line-height:1.9; }
.sub{ color:#555; font-size:10pt; margin:0 0 8px; }
h2{ font-size:12pt; color:#1d4f75; margin:9px 0 4px; border-left:4px solid #2e6e9e; padding-left:7px; }
.pts{ font-weight:400; color:#777; font-size:9.5pt; }
.cols{ display:grid; grid-template-columns:1fr 1fr; gap:18px; }
dl{ margin:0; } dt{ font-weight:700; color:#b03050; margin-top:5px; } dd{ margin:0 0 2px; }
.sides{ border-collapse:collapse; width:100%; font-size:10.5pt; }
.sides td{ border:1px solid #ccd; padding:3px 6px; } .sides td:nth-child(even){ font-weight:700; text-align:center; width:34px; background:#eef4fa; }
.steps{ margin:0; padding-left:20px; }
.ex{ background:#f3f7fb; border-left:3px solid #2e6e9e; padding:6px 9px; margin:5px 0 6px; font-family: Consolas, "Courier New", monospace; font-size:10.5pt; }
.note{ font-family:"Segoe UI", Arial, sans-serif; color:#555; font-size:9.5pt; }
.match{ border-collapse:collapse; width:100%; } .match td{ padding:3px 6px; border-bottom:1px solid #e3e3e3; }
.match td:first-child{ width:42%; font-weight:600; }
.grid3{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px 14px; }
.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:10px 20px; }
.figs > div{ text-align:center; display:flex; flex-direction:column; } .figs svg{ display:block; margin:0 auto; max-height:105px; width:auto; } .figs .ans{ margin-top:auto; }
.ans{ border:1.4px solid #9aa; border-radius:6px; height:36px; margin-top:4px; background:#fff; }
.ans.tall{ height:64px; }
.mini{ font-size:10.5pt; line-height:2.1; text-align:left; margin:2px 0 0; }
.inline{ font-size:11.5pt; }
.lbl{ font: italic 600 15px "Cambria Math", "Times New Roman", serif; fill:#1b1b1b; }
h2{ break-after: avoid; page-break-after: avoid; }
.match,.figs > div,.ans,.inline,p{ break-inside: avoid; page-break-inside: avoid; }
.ansk p{ margin:0 0 4px; font-size:10.8pt; }
.score{ margin-top:12px; background:#fff6d6; border:1px solid #e0c060; border-radius:6px; padding:7px 10px; font-size:10pt; }
@media screen{ body{ background:#e9edf1; } .page{ background:#fff; max-width:8.5in; margin:16px auto; padding:13mm 14mm; box-shadow:0 2px 10px rgba(0,0,0,.15); } }
'''

html = f'''<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Examen de práctica · Matemáticas Esfera 5</title>
<style>{CSS}</style></head><body>
<section class="page">{guia}</section>
<section class="page">{examen}</section>
<section class="page">{resp}</section>
</body></html>'''

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8').write(html)
print('ok', OUT)
