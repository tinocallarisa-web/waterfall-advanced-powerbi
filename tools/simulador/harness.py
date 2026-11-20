# -*- coding: utf-8 -*-
"""Simulador Playwright de Waterfall Advanced 1.3: estilos de la colección y Report theme, plantillas 1.2 guardadas,
tarjeta Accesibilidad, eje desde 0, interruptor del aviso de anomalías, tarjetas de resumen automáticas, selector fx
detectable, marca de agua común y eventos de render 1:1. Stub de host como el de Org Chart.

    node scripts/build-test.js        && rm -rf .tmp/sim     && cp -r .tmp/drop .tmp/sim
    node scripts/build-test.js --free && rm -rf .tmp/simfree && cp -r .tmp/drop .tmp/simfree
    python tools/simulador/harness.py

.tmp/sim es la build Pro forzada (_test); .tmp/simfree, la Free real (_testfree): sin licenseManager en el stub la
licencia resuelve a Free y, editando, lo Pro encendido se dibuja con la marca de agua.
"""
import asyncio, io, json, os, sys
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "capturas")
FALLOS = []

STUB = r"""
window.__ev = []; window.__sel = []; window.__persist = [];
window.powerbi = { visuals: { plugins: {} }, extensibility: {} };
(function(){
 function mkId(k){ return { __k:k, getKey(){return k;}, getSelector(){return {k};}, equals(o){return !!o && o.__k===k;}, includes(o){ return !!o && o.__k===k; } }; }
 const th = window.__theme || {};
 const pal = { isHighContrast: !!window.__sysHC, foreground:{value: window.__sysHC ? '#FFFF00' : '#252423'}, background:{value: window.__sysHC ? '#000000' : '#FFFFFF'},
    foregroundNeutralSecondary:{value:'#605E5C'}, foregroundSelected:{value:'#1AEBFF'},
    getColor(k){ const c=['#118DFF','#12239E','#E66C37','#6B007B']; window.__cols = window.__cols || {}; if (!(k in __cols)) __cols[k] = c[Object.keys(__cols).length % c.length]; return {value:__cols[k]}; } };
 if (th.positive) pal.positive = {value: th.positive};
 if (th.negative) pal.negative = {value: th.negative};
 window.__host = {
  eventService: { renderingStarted(){ __ev.push('S'); }, renderingFinished(){ __ev.push('F'); }, renderingFailed(o,m){ __ev.push('X'); console.error('FAILED', m); } },
  createSelectionManager(){ return { select(ids){ __sel.push(ids.length); return Promise.resolve([]); }, clear(){ return Promise.resolve(); }, getSelectionIds(){ return []; },
     hasSelection(){ return false; }, registerOnSelectCallback(){}, showContextMenu(){ return Promise.resolve(); } }; },
  createSelectionIdBuilder(){ const k=[]; return { withCategory(c,i){ k.push(c.source.queryName+'='+c.values[i]); return this; },
     withMeasure(m){ k.push(m); return this; }, withSeries(){ return this; }, createSelectionId(){ return mkId(k.join('|')); } }; },
  createLocalizationManager(){ return { getDisplayName(k){ return k; } }; },
  tooltipService: { enabled(){ return true; }, show(o){ window.__tip = o; }, move(){}, hide(){} },
  subSelectionService: { subSelect(){}, updateRegionOutlines(){} },
  hostCapabilities: { allowInteractions: window.__allow !== false }, locale: window.__locale || 'en-US',
  colorPalette: pal,
  fetchMoreData(){ return false; }, persistProperties(p){ __persist.push(p); }, launchUrl(){},
  displayWarningIcon(){}, hideWarningIcon(){},
 };
})();
"""

# Begudes Nord (ficticia), en miles de euros.
PERIODO = [("Sales 2025", 1000.0), ("Price", 120.0), ("Volume", -80.0), ("Mix", 40.0), ("FX", -30.0), ("Sales 2026", 0.0)]
PYG = [("Revenue", 5000.0), ("Product cost", -2600.0), ("Logistics", -140.0), ("Marketing", -120.0), ("Staff", -160.0),
       ("Rent", -90.0), ("IT", -70.0), ("Insurance", -60.0), ("Travel", -50.0), ("Other", -40.0), ("EBITDA", 0.0)]
NEGATIVO = [("Opening", 100.0), ("Write-off", -300.0), ("Recovery", 50.0), ("Closing", 0.0)]


def dv(rows, objects=None, fx=None):
    cat = {"source": {"displayName": "Line", "queryName": "P.Line", "roles": {"category": True}}, "values": [r[0] for r in rows]}
    if fx:
        cat["objects"] = [({"colorSettings": {"positiveColor": {"solid": {"color": fx[i]}}}} if i in fx else None) for i in range(len(rows))]
    val = {"source": {"displayName": "Amount", "queryName": "Sum(P.Amount)", "roles": {"measure": True}, "isMeasure": True, "format": "#,0"},
           "values": [r[1] for r in rows]}
    return {"metadata": {"columns": [cat["source"], val["source"]], "objects": objects or {}},
            "categorical": {"categories": [cat], "values": [val]}}


def check(name, ok, detail=""):
    print(f"  {'OK   ' if ok else 'FALLO'} {name}{'  — ' + detail if detail else ''}")
    if not ok: FALLOS.append(name)


async def page(browser, data, W=900, H=520, sys_hc=False, name=None, theme=None, drop="sim", view_mode=1, wait=700):
    d = os.path.join(ROOT, ".tmp", drop)
    guid = json.load(io.open(os.path.join(d, "pbiviz.json"), encoding="utf-8"))["visual"]["guid"]
    pg = await browser.new_page(viewport={"width": W, "height": H})
    errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.set_content(f"<html><body style='margin:0;background:#FFFFFF'><div id='host' style='position:relative;width:{W}px;height:{H}px;overflow:hidden'></div></body></html>")
    await pg.add_style_tag(path=os.path.join(d, "visual.css"))
    await pg.add_script_tag(content=f"window.__sysHC = {json.dumps(sys_hc)}; window.__theme = {json.dumps(theme or {})};")
    await pg.add_script_tag(content=STUB)
    await pg.add_script_tag(path=os.path.join(d, "visual.js"))
    await pg.evaluate("(g) => { window.__v = powerbi.visuals.plugins[g].create({ element: document.getElementById('host'), host: __host }); }", guid)
    await pg.evaluate("([dv, W, H, vm]) => __v.update({ dataViews: dv ? [dv] : [], viewport: {width: W, height: H}, type: 2, operationKind: 0, viewMode: vm })",
                      [data, W, H, view_mode])
    await pg.wait_for_timeout(wait)
    if name:
        os.makedirs(OUT, exist_ok=True)
        await pg.screenshot(path=os.path.join(OUT, name + ".png"))
    ev = await pg.evaluate("() => __ev.join('')")
    check(f"{name or 'página'}: sin errores y eventos de render 1:1", not errs and ev.count("S") == ev.count("F") and "X" not in ev, f"eventos {ev} {errs[:2]}")
    return pg


FILLS = "() => Array.from(document.querySelectorAll('rect[data-bar-index]')).map(r => (r.getAttribute('fill') || '').toUpperCase())"
AXIS = "() => Array.from(document.querySelectorAll('text[data-o=\"axis\"]')).map(t => t.textContent)"
CATCOL = "() => { const t = document.querySelector('text[data-o=\"catLabels\"]'); return t ? t.getAttribute('fill').toUpperCase() : null; }"
CARDS = "() => !!document.querySelector('[data-o=\"cards\"]')"
DOTS = "() => document.querySelectorAll('svg circle').length"


async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()

        print("Estilos de la colección")
        pg = await page(b, dv(PERIODO, {"style": {"template": "boardroom"}}), name="01_boardroom")
        bg = await pg.evaluate("() => document.getElementById('host').style.background")
        f = await pg.evaluate(FILLS)
        check("Boardroom: fondo del visual oscuro (#16263D)", bg.replace(" ", "") in ("rgb(22,38,61)", "#16263d"), bg)
        check("Boardroom: total dorado, subida verde, bajada coral", f[0] == "#C9A45C" and f[1] == "#6FCF97" and f[2] == "#EB8A7B", str(f))
        check("Boardroom: etiquetas de categoría con la tinta del eje (#9FB0C6)", await pg.evaluate(CATCOL) == "#9FB0C6")
        card = await pg.evaluate("() => { const c = document.querySelector('[data-o=\"cards\"] > div'); return c ? getComputedStyle(c).backgroundColor : null; }")
        check("Boardroom: tarjetas con el fondo del estilo (8 % hacia la tinta)", card == "rgb(40, 54, 75)", str(card))
        halo = await pg.evaluate("() => { const t = document.querySelector('text[data-o=\"labels\"]'); return t && t.getAttribute('stroke'); }")
        check("Boardroom: halo oscuro en las etiquetas de valor", halo == "rgba(0,0,0,0.7)", str(halo))
        await pg.close()
        pg = await page(b, dv(PERIODO, {"style": {"template": "aurora"}}), name="01b_aurora")
        bg = await pg.evaluate("() => document.getElementById('host').style.background")
        check("Aurora: fondo con degradado", "linear-gradient" in bg, bg)
        await pg.close()
        pg = await page(b, dv(PERIODO, {"style": {"template": "ledger"}}), name="01c_ledger")
        ff = await pg.evaluate("() => document.querySelector('text[data-o=\"catLabels\"]').getAttribute('font-family')")
        check("Ledger: tipo de letra Georgia", "Georgia" in ff, ff)
        await pg.close()
        pg = await page(b, dv(PERIODO, {"style": {"template": "boardroom"}, "colorSettings": {"totalColor": {"solid": {"color": "#123456"}}}}))
        f = await pg.evaluate(FILLS)
        check("Un color fijado a mano gana al estilo", f[0] == "#123456", str(f))
        await pg.close()

        print("Report theme y plantillas 1.2 guardadas")
        pg = await page(b, dv(PERIODO), theme={"positive": "#00AA00", "negative": "#CC0000"}, name="02_report_theme")
        f = await pg.evaluate(FILLS)
        check("Report theme: subida y bajada con el sentimiento del tema, total con su primer color", f[1] == "#00AA00" and f[2] == "#CC0000" and f[0] == "#118DFF", str(f))
        check("Report theme: etiquetas de categoría con la tinta secundaria del tema", await pg.evaluate(CATCOL) == "#605E5C")
        bg = await pg.evaluate("() => document.getElementById('host').style.background")
        check("Report theme: sin fondo propio", bg == "", bg)
        await pg.close()
        pg = await page(b, dv(PERIODO))
        f = await pg.evaluate(FILLS)
        check("Report theme sin sentimiento en el tema: subida y bajada de siempre", f[1] == "#1D9E75" and f[2] == "#E24B4A", str(f))
        await pg.close()
        pg = await page(b, dv(PERIODO, {"style": {"template": "dark"}}))
        f = await pg.evaluate(FILLS)
        check("Plantilla 1.2 'Dark background' guardada: sigue dibujándose", f[1] == "#3FB37F" and f[2] == "#E5534B" and f[0] == "#4A90D9", str(f))
        await pg.close()
        pg = await page(b, dv(PERIODO, {"style": {"template": "mono", "baseColor": {"solid": {"color": "#2B6CB0"}}}}))
        f = await pg.evaluate(FILLS)
        check("Plantilla 1.2 'One colour' guardada: total con el color base", f[0] == "#2B6CB0", str(f))
        await pg.close()

        print("Elegir plantilla borra lo que define (en un update, editando)")
        pg = await page(b, dv(PERIODO, {"style": {"template": "classic"}}))
        await pg.evaluate("(dv) => __v.update({ dataViews: [dv], viewport: {width: 900, height: 520}, type: 2, viewMode: 1 })", dv(PERIODO, {"style": {"template": "signal"}}))
        await pg.wait_for_timeout(500)
        per = await pg.evaluate("() => __persist")
        rem = [r for x in per for r in x.get("remove", [])]
        cs = [r for r in rem if r["objectName"] == "colorSettings" and r["selector"] is None]
        wild = [r for r in rem if r["objectName"] == "colorSettings" and r["selector"]]
        check("Signal elegido: borra colores, tarjetas y tabla guardados", cs and "totalColor" in cs[0]["properties"] and any(r["objectName"] == "cardSettings" for r in rem), json.dumps(rem)[:200])
        check("y el color de subida guardado con el selector comodín", bool(wild) and wild[0]["selector"].get("data", [{}])[0].get("dataViewWildcard", {}).get("matchingOption") == 0, json.dumps(wild)[:200])
        await pg.close()

        print("Guía: estilos en un clic")
        pg = await page(b, dv(PERIODO))
        n = await pg.evaluate("() => document.querySelectorAll('.wf-guide .wf-g-row')[0].querySelectorAll('.wf-g-btn').length")
        check("la barra de consejos ofrece Report theme y los seis estilos", n == 7, str(n))
        await pg.close()

        print("Accesibilidad")
        acc = {"accessibility": {"highContrast": "on", "minTextSize": 14, "focusColor": {"solid": {"color": "#D00000"}}, "focusWidth": 5}}
        pg = await page(b, dv(PERIODO, {**acc, "style": {"template": "boardroom"}}), name="03_alto_contraste")
        st = await pg.evaluate("""() => { const host = document.getElementById('host');
            const texts = Array.from(document.querySelectorAll('svg text')).filter(t => t.textContent && t.textContent !== '!');
            return { bg: host.style.background, fills: Array.from(new Set(Array.from(document.querySelectorAll('rect[data-bar-index]')).map(r => r.getAttribute('fill')))),
                     tfills: Array.from(new Set(texts.map(t => t.getAttribute('fill')))), min: Math.min(...texts.map(t => parseFloat(t.getAttribute('font-size')))),
                     focus: host.style.getPropertyValue('--wf-focus') + ' ' + host.style.getPropertyValue('--wf-focus-w'),
                     cards: Array.from(document.querySelectorAll('[data-o="cards"] div')).map(d => parseFloat(getComputedStyle(d).fontSize)) }; }""")
        check("alto contraste 'On' manda sobre el estilo: fondo blanco", st["bg"].replace(" ", "") in ("rgb(255,255,255)", "#ffffff", "#FFFFFF"), st["bg"])
        check("alto contraste 'On': barras negras", st["fills"] == ["#000000"], str(st["fills"]))
        check("alto contraste 'On': texto negro (salvo el que va dentro de una barra, en blanco)", set(st["tfills"]) <= {"#000000", "#FFFFFF"} and "#000000" in st["tfills"], str(st["tfills"]))
        check("tamaño mínimo 14 en el texto del gráfico", st["min"] >= 14, str(st["min"]))
        check("tamaño mínimo 14 en las tarjetas", st["cards"] and min(st["cards"]) >= 14, str(st["cards"]))
        check("foco en alto contraste: negro y el grosor de la tarjeta", st["focus"].strip() == "#000000 5px", st["focus"])
        fm = await pg.evaluate("() => __v.getFormattingModel().cards.map(c => c.uid)")
        check("tarjeta Accessibility en el panel", "accessibility-card" in fm or "accessibility_card" in fm, str(fm))
        await pg.close()
        pg = await page(b, dv(PERIODO, {"accessibility": {"focusColor": {"solid": {"color": "#D00000"}}, "focusWidth": 4}}))
        st = await pg.evaluate("""() => { const r = document.querySelector('rect[data-bar-index]'); r.focus();
            const h = document.getElementById('host'); return { v: h.style.getPropertyValue('--wf-focus') + ' ' + h.style.getPropertyValue('--wf-focus-w'),
            s: (r.getAttribute('stroke') || '') + ' ' + r.getAttribute('stroke-width') }; }""")
        check("foco sin alto contraste: color y grosor de la tarjeta en la barra", st["s"].upper() == "#D00000 4", str(st))
        check("y en las variables del contenedor (botones de la guía)", st["v"].upper().strip() == "#D00000 4PX", str(st))
        await pg.close()
        pg = await page(b, dv(PERIODO), sys_hc=True, name="03b_hc_windows")
        f = await pg.evaluate(FILLS)
        check("alto contraste de Windows: barras con el primer plano del sistema", set(f) == {"#FFFF00"}, str(f))
        await pg.close()

        print("Eje desde 0")
        pg = await page(b, dv(PYG), name="04_pyg")
        ax = await pg.evaluate(AXIS)
        check("P&L todo en positivo: el eje empieza en 0", bool(ax) and ax[0] == "0", str(ax))
        await pg.close()
        pg = await page(b, dv(NEGATIVO))
        ax = await pg.evaluate(AXIS)
        check("con acumulados negativos: el eje baja de 0 con margen", bool(ax) and ax[0][:1] in ("−", "-"), str(ax))
        await pg.close()

        print("Aviso de anomalías")
        pg = await page(b, dv(PYG))
        n_on = await pg.evaluate(DOTS)
        await pg.close()
        pg = await page(b, dv(PYG, {"chartSettings": {"showAnomalies": False}}), name="05_sin_anomalias")
        n_off = await pg.evaluate(DOTS)
        await pg.close()
        check("encendido por defecto: el coste de ventas sale marcado", n_on >= 1, str(n_on))
        check("apagado: sin marcas", n_off == 0, str(n_off))

        print("Tarjetas de resumen")
        pg = await page(b, dv(PERIODO))
        check("puente de periodos (cambios en los dos sentidos): tarjetas visibles", await pg.evaluate(CARDS))
        await pg.close()
        pg = await page(b, dv(PYG))
        check("P&L de ventas a EBITDA (solo costes): tarjetas ocultas", not await pg.evaluate(CARDS))
        await pg.close()
        pg = await page(b, dv(PYG, {"cardSettings": {"autoHide": False}}))
        check("con 'Ocultar si no es una comparación' apagado: visibles", await pg.evaluate(CARDS))
        await pg.close()
        pg = await page(b, dv(PERIODO, {"cardSettings": {"show": False}}))
        check("interruptor manual apagado: ocultas", not await pg.evaluate(CARDS))
        await pg.close()

        print("fx en el color de subida")
        pg = await page(b, dv(PERIODO, fx={1: "#AA00AA"}))
        f = await pg.evaluate(FILLS)
        check("la regla fx resuelta por barra pinta esa barra", f[1] == "#AA00AA" and f[3] != "#AA00AA", str(f))
        d = await pg.evaluate("""() => { let out = null; __v.getFormattingModel().cards.forEach(c => (c.groups || []).forEach(g => (g.slices || []).forEach(s => {
            const d = s?.control?.properties?.descriptor; if (d && d.objectName === 'colorSettings' && d.propertyName === 'positiveColor') out = d; }))); return out; }""")
        check("selector comodín (InstancesAndTotals), ConstantOrRule y color fijo general", bool(d) and d["selector"]["data"][0]["dataViewWildcard"]["matchingOption"] == 0
              and d.get("instanceKind") == 3 and d.get("altConstantValueSelector", "x") is None, json.dumps(d)[:200])
        await pg.close()
        js = io.open(os.path.join(ROOT, ".tmp", "sim", "visual.js"), encoding="utf-8").read()
        check("el bundle llama a createDataViewWildcardSelector (lo que lee OKviz)", "createDataViewWildcardSelector" in js)

        print("Marca de agua común (build Free)")
        if not os.path.exists(os.path.join(ROOT, ".tmp", "simfree", "visual.js")):
            check("build Free en .tmp/simfree", False, "falta: node scripts/build-test.js --free")
        else:
            pg = await page(b, dv(PERIODO, {"ibcs": {"mode": True}}), drop="simfree", name="06_marca_agua", wait=900)
            st = await pg.evaluate("""() => { const w = document.querySelector('.tcviz-wm');
                return { n: document.querySelectorAll('.tcviz-wm').length, d: w && w.style.display, t: w && w.textContent, old: document.querySelectorAll('.wf-watermark').length }; }""")
            check("editando sin licencia con IBCS: la marca común, visible y una sola", st["n"] == 1 and st["d"] == "flex" and "Pro preview" in (st["t"] or ""), str(st))
            check("sin la marca propia de la 1.2", st["old"] == 0, str(st))
            await pg.close()
            pg = await page(b, dv(PERIODO, {"ibcs": {"mode": True}}), drop="simfree", view_mode=0, wait=900)
            st = await pg.evaluate("() => { const w = document.querySelector('.tcviz-wm'); return w ? w.style.display : 'none'; }")
            check("en lectura: sin marca", st == "none", st)
            await pg.close()
            pg = await page(b, dv(PERIODO), drop="simfree", wait=900)
            st = await pg.evaluate("() => { const w = document.querySelector('.tcviz-wm'); return w ? w.style.display : 'none'; }")
            check("editando sin nada Pro encendido: sin marca", st == "none", st)
            await pg.close()

        print("Pantalla de inicio")
        pg = await page(b, None, name="07_inicio")
        check("sin datos: pantalla de inicio", await pg.evaluate("() => !!document.querySelector('.wf-landing')"))
        await pg.close()

        await b.close()
    print(f"\n{len(FALLOS)} fallos" + (": " + "; ".join(FALLOS) if FALLOS else ""))
    sys.exit(1 if FALLOS else 0)


if __name__ == "__main__":
    asyncio.run(main())
