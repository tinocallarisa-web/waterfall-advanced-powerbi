# Waterfall Advanced — ficha de AppSource (1.3.0.0, borrador 21-11-2026)

Texto para pegar en Partner Center → oferta Waterfall Advanced → Offer listing. **Editar este fichero no cambia la
oferta:** cada campo hay que pegarlo a mano en la consola. La descripción se pega en HTML: sale de
`python C:\tcviz\utillaje\ficha_html.py "C:\tcviz\dev\Waterfall" --copiar` → `docs/APPSOURCE-DESCRIPTION.html`.

Cambios frente a la ficha de 1.2 (la descripción SÍ cambia: hay funciones nuevas que ve el comprador):
- Plantillas 1.2 (Classic, Modern, Soft, One colour, Dark background) sustituidas por Report theme + los seis estilos
  de la colección; nuevo bloque ACCESSIBILITY (tarjeta Accesibilidad); "!" desactivable; tarjetas que se ocultan si el
  puente no es una comparación; gráfico que cabe en visuales pequeños sin solapes.
- Añadido bloque BEST FOR, línea de requisitos en GETTING STARTED y jerga explicada (IBCS, fx), por App Advisor.
- WHAT'S NEW IN 1.3 en lugar del de 1.2.
- Resumen de búsqueda sin cambios. "Certified" se mantiene: la oferta publicada figura como certificada en
  `web/src/data.jsx` (`certified: true`); la 1.3 tiene que volver a pasar certificación.

---

## Resumen de resultados de búsqueda (≤ 100)

```
Financial bridge for Power BI: totals, subtotals, target, data table and IBCS. Certified.
```

## Descripción (≤ 5.000)

```
Power BI's built-in waterfall handles category movement. It does not handle a bridge: an opening anchor, drivers that
explain the movement, intermediate checkpoints a finance reader expects, and a closing total. Without those, a P&L walk
is a row of floating bars.

Waterfall Advanced, a Power BI custom visual, lets you mark each row as a total, a subtotal or a driver from a column in
your model, and draws the bridge your finance team has in mind — with the report's theme, filters and bookmarks working
as in any native visual.

BEST FOR
• Monthly P&L walks: revenue to EBITDA, with Gross Profit as a checkpoint
• Year-on-year bridges: last year's sales to this year's, by price, volume and mix
• Actual against budget: a target line on the closing total
• Dashboard tiles: every bar fits, no overlapping labels

BUILT FOR P&L WALKS
• Totals, subtotals and drivers as distinct bar types, from a column in your model
• Intermediate checkpoints — Net Revenue, Gross Profit, EBITDA — drawn from zero
• Horizontal or vertical, because line-item names read better down the side
• A target line on the anchor bars, with a label that finds a free place
• Unusual changes flagged with a "!" (can be turned off)
• Summary cards (opening, closing, variance %, biggest gain and loss) that hide when the bridge is not a comparison

READABLE AT ANY SIZE
• Report theme by default, or six styles shared by the TCViz collection: Boardroom, Ledger, Editorial, Signal, Aurora
and Terrace — so a page reads as one report
• Every bar fits the width; value labels never overlap; in a small visual all the text shrinks with it
• Conditional formatting (fx): rules that colour each bar by its result, or a hex colour per row from your model
• The measure's own format — dynamic format strings included — so labels match the rest of your report
• Axes, titles and legend under your control, and on-object formatting

ACCESSIBILITY
• Accessibility card: high contrast (automatic or always on), keyboard focus colour and width, minimum text size
• Colour-blind safe palette and hatched decreases, so a rise and a fall still read printed in black and white
• Keyboard navigation and screen-reader labels on every bar

THE NUMBERS BESIDE THE CHART (PRO)
A bridge answers why. A table answers how much: every step with its amount, the running total and its share of the
opening figure, next to the chart.

FREE AND PRO
The free tier is the whole bridge — totals, subtotals, drivers, target, summary cards, all styles, accessibility,
conditional formatting, both orientations — with twelve individual drivers, the size of a standard P&L walk. Above
twelve, the smallest drivers are grouped into "Others" and the bridge still closes on the same figure: coarser, nothing
lost.

Pro adds every driver individually, the data table, IBCS mode (the international standard for business charts, in
monochrome) and the label density controls: angle, truncation, hiding labels that do not fit. One-month free trial on
AppSource.

SEE PRO ON YOUR OWN DATA BEFORE YOU BUY
While you edit, turn on a Pro feature and it is drawn working under a "Pro preview" watermark: your own bridge, not a
screenshot. Reading view shows the free chart.

IN THE REPORT
Cross-filtering, highlighting, bookmarks, report page tooltips, drilldown. 12 languages.

PRIVACY
No network calls of any kind: no telemetry, no analytics, no CDN. The visual declares no network access, so Power BI
would block any request. All calculation and rendering happens inside Power BI.

GETTING STARTED
You need a category field and a measure; for a P&L, also a column that says which rows are totals.
1. Category: the steps of the bridge.
2. Value: the amount of each step.
3. Optional: Bar type ("total", "subtotal"), Order, Target. Then pick a style.

Documentation, FAQ and tips: https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/support.html
Support: support@tcviz.com — a person answers.

WHAT'S NEW IN 1.3
Report theme and the six TCViz collection styles, an Accessibility card, summary cards that hide when they would
mislead, a "!" you can turn off, an axis from zero, and a chart that fits small visuals: no scroll bar, no overlapping
labels, text that shrinks with the visual.
```

## Palabras clave (3)

`Waterfall` · `Bridge` · `Variance` — sin cambios. `Waterfall` carga la búsqueda; `Bridge` es como lo llaman los
equipos de finanzas ("build me the EBITDA bridge"); `Variance` capta el plan contra real.

## Vídeo

URL canónica `https://www.youtube.com/watch?v=<id>`. Vídeo vigente (grabado con la 1.2; si se graba uno de la 1.3, cambiar el id en todos los ficheros):
`https://www.youtube.com/watch?v=GOym3Akbiaw`.

## Imágenes

- Logo 300×300: `assets/icon_300x300.png` (icono nuevo de la serie)
- Capturas: `assets/Screenshot_1.png`, `assets/Screeshot_2.png` (1.2, Tino 23-10) y `assets/waterfall-infographic.png` (fuente `docs/infographic.html`).
  **Pendiente 1.3:** muestran las plantillas de la 1.2; conviene rehacerlas con un estilo de la colección (caso Begudes
  Nord + tema TCViz) y revisar la infografía.

## URLs

| Campo | Valor |
|---|---|
| Soporte | https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/support.html |
| Privacidad | https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/privacy.html |
| Términos | https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/terms.html |
| Repo (rama certification) | https://github.com/tinocallarisa-web/waterfall-advanced-powerbi/tree/certification |

El slug del repo es `waterfall-advanced-powerbi`, no `Waterfall` (solo es la carpeta local).
Planes publicados: `free` y `pro` (el de 15 USD no se puede cambiar de precio en un plan publicado).

## Notas para la certificación

`docs/CERTIFICATION-NOTES-SHORT.txt` — el campo se vacía en cada reenvío: pegarlo siempre.
