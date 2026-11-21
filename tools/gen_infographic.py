# -*- coding: utf-8 -*-
"""Infografía y capturas de la ficha de Waterfall Advanced 1.3 (1366x768, assets/) con la plantilla común de la web.

Plantilla: C:/tcviz/datos/demo_rtm/infografias.py (la misma de Org Chart, Dynamic Matrix, Box & Whisker, Radar...).
La ficha web (C:/tcviz/web/src/data.jsx, id "waterfall-pro") sigue en 1.2: aquí se ponen las funciones y los primeros
pasos de la 1.3, con el reparto Free/Pro del código (licenseManager.ts FREE_MAX_BARS = 12; tabla, IBCS y densidad de
etiquetas en visual.ts). Las imágenes son del simulador (tools/simulador/capturas/70_* a 73_*), que carga el visual
real, build Pro forzada sin sello, con datos de Begudes Nord (ficticios).

    node scripts/build-test.js --no-marker && rm -rf .tmp/simficha && cp -r .tmp/drop .tmp/simficha
    python tools/simulador/harness.py ficha && python tools/gen_infographic.py
Salida: assets/infographic.png y Screenshot_1..4.png; docs/infographic.html (autocontenido).
"""
import base64, html, mimetypes, os, re, shutil, subprocess, sys, tempfile, urllib.parse
sys.path.insert(0, r"C:\tcviz\datos\demo_rtm")
import infografias as I
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP = os.path.join(ROOT, "tools", "simulador", "capturas")
ASSETS = os.path.join(ROOT, "assets")
OUT = os.path.join(ROOT, ".tmp", "ficha")
os.makedirs(OUT, exist_ok=True)
e = html.escape
CSS = I.CSS % {"pop": I.uri(os.path.join(I.BASE, "tema", "Poppins"))}
LOGO = I.uri(os.path.join(I.WEB, "logos", "tcviz-logo-light.svg"))
cap = lambda n: I.uri(os.path.join(CAP, n + ".png")).replace(" ", "%20")

P = {p["id"]: p for p in I.productos()}["waterfall-pro"]
F = lambda name, free: {"name": name, "free": free}
# 1.3. Orden = lo que se ve primero (la plantilla enseña 7 gratis y el resto como "+ N more, all free").
P["features"] = [
    F("Report theme and six TCViz collection styles", True),
    F("Totals, subtotals and drivers, vertical or horizontal", True),
    F("Every bar fits the width; value labels never overlap", True),
    F("Text shrinks with the visual, down to a minimum you set", True),
    F("Accessibility: high contrast, focus, minimum text size", True),
    F("Target line whose label finds a free place", True),
    F("Summary cards that hide when the bridge is not a comparison", True),
    F("Up to 12 drivers; the smallest grouped into Others", True),
    F("Model number format, fx colour, 12 languages", True),
    F("Unusual-change flag (!) you can turn off", True),
    F("Pro preview: try Pro on your own data while you edit", True),
    F("Every driver shown individually (Free: 12)", False),
    F("Data table: value, running total, % of opening", False),
    F("IBCS mode", False),
    F("Label angle, truncation and hiding labels that do not fit", False),
]
# La plantilla lee el reparto escrito de la ficha web (freemium.pro, de la 1.2) antes que la lista: se sustituye.
P["freemium"] = {"pro": [f["name"] for f in P["features"] if f["free"] is False]}
P["quickStart"] = [
    "Install Waterfall Advanced by TCViz from Microsoft AppSource",
    "Drag the steps into Category and the amount into Value; add Order to fix the sequence",
    "Mark checkpoints as \"subtotal\" in Bar type and add a Target for the closing total",
    "Pick Report theme or a collection style; try the data table or IBCS (Pro) while you edit",
]
DATOS = "Sample data: Begudes Nord, a fictitious drinks company"


def autocontenido(h_html, destino):
    """Copia el HTML con cada file:/// incrustado como data URI, para que docs/ no apunte a C:/."""
    t = open(h_html, encoding="utf-8").read()

    def incrusta(m):
        ruta = urllib.parse.unquote(m.group(1).replace("file:///", "")).replace("/", os.sep)
        tipo = mimetypes.guess_type(ruta)[0] or ("font/ttf" if ruta.endswith(".ttf") else "application/octet-stream")
        return "data:%s;base64,%s" % (tipo, base64.b64encode(open(ruta, "rb").read()).decode())
    t = re.sub(r"(file:///[^'\")\s]+)", incrusta, t)
    open(destino, "w", encoding="utf-8", newline="\n").write(t)


def render(h_html, nombre):
    png2x = os.path.join(OUT, nombre + "@2x.png")
    png1x = os.path.join(ASSETS, nombre + ".png")
    subprocess.run([I.EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
                    "--allow-file-access-from-files", f"--screenshot={png2x}", "--window-size=1366,768", I.uri(h_html).replace(" ", "%20")],
                   capture_output=True, timeout=90)
    Image.open(png2x).convert("RGB").resize((1366, 768), Image.LANCZOS).save(png1x, optimize=True)
    print("  ", os.path.relpath(png1x, ROOT))


TIER = '<span class="pill free">Free</span><span class="pill pro">Pro</span>'


def cabecera(titulo, sub):
    return (f'<div class="cab"><img class="logo" src="{LOGO}"><div class="sep"></div>'
            f'<div><h1>{e(titulo)}</h1><p>{e(sub)}</p></div><div class="tier">{TIER}</div></div><div class="raya"></div>')


PIE = (f'<div class="fin"><span>tcviz.com · Power BI custom visual · {e(P["name"])}</span>'
       f'<span>{e(DATOS)} · drawn by the visual</span></div>')


def pagina(nombre, cuerpo, extra_css=""):
    h = os.path.join(OUT, nombre + ".html")
    open(h, "w", encoding="utf-8").write(f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}{extra_css}</style></head><body>{cuerpo}</body></html>')
    return h


# 1. Infografía general
tmp = tempfile.mkdtemp()
try:
    shutil.copy(os.path.join(CAP, "70_central.png"), os.path.join(tmp, "central_99.png"))
    exp, I.EXP = I.EXP, tmp
    ficha = I.ficha(P, 99, "What moved EBITDA from FY2025 to FY2026?")
    I.EXP = exp
    viejo = "Sample report on Begudes Nord, a fictitious drinks company — Power BI Desktop, TCViz theme"
    assert viejo in ficha
    ficha = ficha.replace(viejo, DATOS + " — Report theme, data table (Pro)")
    h1 = os.path.join(OUT, "infographic.html")
    open(h1, "w", encoding="utf-8").write(ficha)
    render(h1, "infographic")
    autocontenido(h1, os.path.join(ROOT, "docs", "infographic.html"))
finally:
    shutil.rmtree(tmp, ignore_errors=True)

CSS2 = """.una{position:absolute;left:24px;right:24px;top:112px;bottom:40px;display:flex;gap:16px}
.una .card{padding:14px;display:flex;align-items:center;justify-content:center;flex:1;min-width:0}
.una img{max-width:100%;max-height:100%;display:block;border-radius:4px}
.una .lado{flex:0 0 290px;flex-direction:column;align-items:flex-start;justify-content:flex-start}
.una .lado h2{font-size:17px;margin-bottom:8px} .una .lado p{font-size:13.5px;line-height:1.45;color:#444;margin-bottom:10px}
.una .lado p b{color:#1F4E79}
.est{position:absolute;left:24px;right:24px;top:112px;bottom:40px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;gap:12px}
.est .card{padding:8px;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.est img{flex:1 1 auto;min-height:0;width:100%;object-fit:contain;display:block;border-radius:3px} .est b{font-size:12.5px;margin-top:5px;color:#555}
.dos{position:absolute;left:24px;right:24px;top:112px;bottom:40px;display:grid;grid-template-columns:1.35fr 1fr;gap:16px}
.dos .card{padding:12px 14px;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.dos .im{flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center}
.dos img{max-width:100%;max-height:100%;display:block;border:1px solid #EEE;border-radius:4px}
.dos h2{font-size:16px;margin-bottom:4px} .dos p{font-size:12.5px;color:#555;margin-bottom:8px;line-height:1.4}"""


def una(n, titulo, sub, img, lado_h, lado_p):
    ps = "".join(f"<p>{x}</p>" for x in lado_p)
    h = pagina(f"Screenshot_{n}", cabecera(titulo, sub) + f"""<div class="una"><div class="card"><img src="{cap(img)}"></div>
<div class="card lado"><h2>{e(lado_h)}</h2>{ps}</div></div>""" + PIE, CSS2)
    render(h, f"Screenshot_{n}")


una(1, "From last year's EBITDA to this year's", "Price, volume, mix and costs step by step, a subtotal, the budget line, the exact figures and a summary.",
    "70_hero", "A bridge a finance reader expects",
    ["<b>Totals and subtotals</b> from a Bar type column: the opening, the checkpoints and the closing figure.",
     "<b>Target line</b> on the closing total; its label looks for a free place.",
     "<b>Summary cards</b>: start, end, variance and the biggest gain and loss.",
     "<b>Data table</b> (Pro): every step with its value, running total and % of the opening.",
     "Every bar fits the width and no value label is drawn on top of another. Boardroom style."])
est = "".join(f'<div class="card"><img src="{cap("71_style_" + s)}"><b>{s.title()}</b></div>'
              for s in ("boardroom", "ledger", "editorial", "signal", "aurora", "terrace"))
h = pagina("Screenshot_2", cabecera("Six collection styles, all free", "The same looks as the other TCViz visuals, so a page reads as one report. Or keep the Report theme.") +
           f'<div class="est">{est}</div>' + PIE, CSS2)
render(h, "Screenshot_2")
una(3, "A P&L from gross sales to EBITDA", "Horizontal, so the line names read in full. Ledger style.",
    "72_pyg", "Built for P&L walks",
    ["<b>Subtotals</b> at net sales, gross margin and contribution, closing on EBITDA.",
     "<b>No misleading cards</b>: every change goes the same way, so this is not a comparison of one figure at two moments. The summary cards hide on their own; a switch shows them again.",
     "<b>Value axis from zero</b> when every running total is positive.",
     "<b>Unusual-change flag (!)</b> on outlying steps, and a switch to turn it off."])
h = pagina("Screenshot_4", cabecera("Accessible, and readable at any size", "High contrast and a minimum text size from the Format pane; in a small visual the text shrinks and nothing overlaps.") + f"""
<div class="dos">
<div class="card"><h2>Accessibility card</h2><p>High contrast forced On (black on white) and minimum text size 14, applied to the chart, the cards and the table. Keyboard focus colour and width.</p><div class="im"><img src="{cap('73_a11y')}"></div></div>
<div class="card"><h2>Small visual · 560 × 340</h2><p>Every text of the chart gets smaller with the visual, down to 60% of your size and never below the minimum. Names that do not fit are shortened with "…"; the full name is in the tooltip. Signal style.</p><div class="im"><img src="{cap('73_small')}"></div></div>
</div>""" + PIE, CSS2)
render(h, "Screenshot_4")
print("ok")
