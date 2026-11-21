# Waterfall Advanced — Tips & Hints (v1.3.0.0)

A waterfall can be two very different things: a simple before-and-after picture, or a
structured explanation of how a result was formed. This one is built for the second. The
difference is in one field well — **Bar type** — and it is the first thing to get right.

---

## Quick start

1. Drag your P&L line, driver or step into **Category**.
2. Drag the amount into **Value**. Negative values fall, positive values rise.
3. Drag a numeric sequence field into **Order**. Without it the bars follow the category
   sort, which is almost never the order of a P&L.
4. Drag your type column into **Bar type** and set it to aggregate as **First**, not Sum.
5. Pick a look in **Format → Style template** — Report theme or one of the six collection
   styles — or from the tips bar at the bottom of the visual while you edit.

> **The single most common mistake:** leaving *Bar type* as Sum. It is text in a measure
> well, so Power BI tries to add it up and nothing arrives. The chart then treats every
> row as a driver and the bridge never closes on the right figure.

---

## Bar type: the whole point

| Value | What it draws | Use it for |
|---|---|---|
| `total` | From zero. The first one sets the opening figure | The opening and closing anchors |
| `subtotal` | From zero to the running total | Net Revenue, Gross Profit, EBITDA, EBIT |
| `delta` | Floats from the running total | Every driver: price, volume, payroll, freight |

Anything else is read as `delta`. **Without a Bar type field, the first and last rows are
totals.** With the field, mark them `total` yourself — a bridge has to start and end
somewhere.

A P&L walk with no subtotals is a list of costs. With them it becomes a document a
committee can read: revenue, what reduced it, where the margin stood, what consumed it,
where the result landed.

---

## Field wells

| Well | Kind | What it does |
|---|---|---|
| **Category** | Grouping | The line, driver or step. Required. Supports drill-down. |
| **Value** | Measure | The amount. Required. |
| **Target (optional)** | Measure | Goal or budget. Dashed line on the total bars. |
| **Bar type** | Measure | `total` / `subtotal` / `delta`. **Aggregate as First.** |
| **Order** | Grouping | Numeric field fixing the sequence of the bridge. |
| **Tooltips** | Measure | Extra measures on hover. |
| **Colour (DAX, optional)** | Measure | A hex colour per row. Overrides the colours and the fx rule. |

---

## Choosing a style (new in 1.3)

| Style | Look |
|---|---|
| Report theme | The default. Good/bad colours, first data colour and text colours of your report theme |
| Boardroom | Dark navy background, light text, green and coral bars, gold totals |
| Ledger | Warm paper background, Georgia font, dark green and dark red |
| Editorial | White, Georgia font, black increases and a red accent for decreases |
| Signal | White, sober green and red, dark totals |
| Aurora | Dark indigo-to-teal gradient, mint and pink bars |
| Terrace | Warm cream background, olive and brick bars |

- **Start with Report theme** if the page already has a theme you like: the bridge picks up
  its good/bad colours, and where the theme gives none it keeps the green, red and blue of
  earlier versions.
- **Use a collection style** when the page mixes several TCViz visuals, and pick the same
  one in all of them: the six styles are shared across the collection, so the page reads
  as one report. Boardroom and Aurora bring their own dark background.
- **Pick the style first, then fine-tune.** Picking a style resets the settings it defines
  — the fx rule on Increase color included. Colours you change afterwards stay yours.
- All styles are free. The colour-blind safe palette and IBCS mode take precedence over
  the style colours, and high contrast over everything.

> **Where did Classic, Modern, Soft, One colour and Dark background go?** They are no
> longer offered, but reports that use them keep drawing exactly as before.

> **Colour stuck on every bar?** Before 1.2 a fixed Increase colour was stored bar by bar
> and painted totals and decreases too. Pick any style and the old value is cleared.

---

## Small visuals (new in 1.3)

A waterfall on a dashboard tile has little room. The chart now fits instead of scrolling
or overlapping:

- **Every bar fits the width.** Bars and gaps narrow as needed; a scroll bar appears only
  when even 8-pixel bars would not fit.
- **Text shrinks with the visual** — labels, axes, legend, summary cards and data table —
  down to 60 % of your size, never below 8 px nor below the Accessibility minimum. Do not
  lower every font size by hand for a small tile: your sizes come back when it is larger.
- **Value labels never overlap.** Totals, subtotals and targets are placed first, then the
  changes from largest to smallest. A figure first shrinks to fit its bar; if it still has
  no free place it is left out — it is in the tooltip, and with Pro in the data table.
- **The target label** looks for a free place and is shortened to the figure if needed.
- **Category names** that do not fit are shortened with "…", or one in every few is shown.
- **The data table** *(Pro)* drops "% of opening", then the running total, and reduces its
  font before it cuts anything.

---

## Summary cards: when they show

The cards read the bridge as the same figure at two moments — sales 2025 → sales 2026. For
a P&L walk from revenue to EBITDA a "variance %" between the first and last bar means
nothing, so since 1.3 they **hide on their own** when there are fewer than two totals, the
opening figure is zero, or every change goes the same way. Turn off *Summary Cards → Hide
when the bridge is not a comparison* only if you really want them.

---

## The "!" marker

It flags a driver more than two standard deviations from the average change. If your
bridge has one large driver by design, turn it off: *Chart → Flag unusual changes (!)*.

---

## Number format: use the model's

- **Model format**: if your measure already has a format string — currency, thousands, a
  dynamic format per country — choose *Number format → Model format* and the chart uses it
  for values, labels, tooltips, the axis, the cards and the table, in the report's
  language. One format, set once, in the model.
- **Custom** (the default): currency symbol and position, scale (auto, none, thousands,
  millions), decimals, thousands separator.

---

## Format pane

- **Style template** — Report theme or a collection style, show setup tips
- **Chart** — orientation, connectors, subtotals, target line with its label and value,
  summary cards, flag unusual changes (!), sort by impact, invert colours, max drivers,
  "Others" label
- **Colors** — *Colors group*: colour-blind safe palette, hatched decreases, increase
  (with fx), decrease, total and target colours. *Legend group*: show, top or bottom,
  font, size, colour
- **Labels** — show, mode (absolute / relative / both), font size, value and category
  colours, totals and subtotals matching their bar colour, and the density controls
  *(Pro)*: angle, truncation and hiding what does not fit
- **Value axis** — show, gridlines, font size, colour, title
- **Category axis** — title
- **Number format** — Custom or Model format
- **Summary Cards** — show, hide when the bridge is not a comparison, caption and value
  font sizes, text and background colours
- **Data Table** *(Pro)* — position, running total and % of opening columns, background,
  separator, font size and width
- **IBCS** *(Pro)* — monochrome notation
- **Accessibility** — high contrast (automatic or on), focus colour and width, minimum
  text size

With **Format** on, you can also click the bars, value labels, category labels, value
axis, legend, summary cards or data table to format them on the chart.

---

## Reading a bridge that is too wide

Fifteen line items with long names and their amounts do not fit. A waterfall rarely fails
because the arithmetic is wrong; it fails because it is unreadable.

- **Switch to horizontal.** Long labels — "Rent & Facilities", "Warehouse Payroll" — read
  far better down the side than under a bar. It is free.
- **Angle the labels** *(Pro)* when vertical is the right layout: −45° usually reads best,
  −90° fits the most bars. When tilted labels would touch, one in every few is drawn.
- **Leave truncation at 0** and the visual keeps as much of each name as fits. Set a
  character count *(Pro)* only for a fixed cut; it prefers a word boundary, and the full
  name stays in the tooltip.
- **Group the small drivers** with *Max drivers shown*. The rest are summed into an
  "Others" bar, so the bridge still closes on the same figure.

---

## Accessibility, and why it is free

In a financial bridge, up-versus-down *is* the information, and red against green is the
pair many readers find hardest to separate.

- **Colour-blind safe palette** replaces the defaults with Okabe-Ito blue and orange.
- **Hatch decreases** puts a diagonal pattern on the falling bars, so colour is not the
  only cue — the chart still reads printed in black and white.
- **Keyboard**: Tab through the bars, Enter or Space to select, Ctrl to add. The focus
  outline colour and width are in the *Accessibility* card.
- **High contrast**: *Automatic* follows the Windows high-contrast theme; *On* draws the
  chart black on white whatever the system says. It covers bars, labels, axes, gridlines,
  the "!" marker, the summary cards and the data table.
- **Minimum text size**: set it to 9 or 10 if the report is read on a projector or by
  people with low vision. No text of the chart, cards or table goes below it, even when
  the visual shrinks.

All of these are in the free tier.

---

## The data table (Pro)

A bridge answers *why*. A table answers *how much*. The table shows every step with its
amount, the running total and, optionally, each step as a percentage of the opening
figure. It sits to the right or below, with its own background so it reads as a separate
block.

---

## What Pro adds

| | Free | Pro |
|---|---|---|
| The bridge: totals, subtotals, deltas, connectors | ✓ | ✓ |
| Orientation, drilldown, target line, summary cards, anomaly marker | ✓ | ✓ |
| Report theme and the six collection styles, model format, axes, legend, on-object formatting | ✓ | ✓ |
| Accessibility card, bars that fit, labels without overlaps, text that shrinks | ✓ | ✓ |
| Colour-blind safe palette and hatched decreases | ✓ | ✓ |
| Conditional formatting (`fx`) and the Colour (DAX) well | ✓ | ✓ |
| Cross-filtering, bookmarks, keyboard, high contrast, 12 languages | ✓ | ✓ |
| **Individual drivers** | 12, rest grouped | **All of them** |
| **Data table** | — | **✓** |
| **IBCS mode** | — | **✓** |
| **Label angle, truncation, overlap handling** | — | **✓** |

Above twelve drivers the smallest are grouped into "Others". **The bridge still closes on
the same figure** — nothing is dropped, the detail is coarser.

### Pro preview

Every paid setting says *(Pro)* in the format pane and is never hidden. Without a licence,
**while you edit**, the data table, IBCS mode and the label density settings you turn on
are drawn working on your data under a "Pro preview" watermark, and Power BI shows its
licence notice and Upgrade bar. **Reading view** shows the free chart, and where licences
cannot be read (Publish to Web, embedding, export) the free result is drawn with no
watermark. The grouping beyond twelve drivers is not previewed. The setting is kept, so it
applies the moment the licence is active.

---

## Troubleshooting

- **Every bar floats; no totals** — *Bar type* is aggregating as Sum. Set it to First.
- **The bars are in the wrong order** — nothing in *Order*, so they follow the category
  sort.
- **The closing bar is not what you expected** — with a Bar type field the first row must
  be `total`, and costs must be negative.
- **Every bar has the same colour** — a fixed Increase colour from an earlier version.
  Pick a style to clear it.
- **"Pro preview" on the chart** — a Pro setting is on without a licence. Readers do not
  see it.
- **Labels are cut off or one in every few is shown** — they do not fit under their bar.
  Switch to horizontal, lower the category font size, or angle them *(Pro)*.
- **A value label is missing** — it found no free place, even smaller. The figure is in
  the tooltip. Widen the visual or lower the decimals.
- **Text smaller than the size I set** — the visual is small and the text shrinks with it.
  Enlarge the visual, or raise *Accessibility → Minimum text size*.
- **A driver is missing and there is an "Others" bar** — the free tier shows twelve
  individual drivers; the note at the top right says how many were grouped.
- **Summary cards or legend missing** — they hide themselves in small tiles; the cards
  also hide when the bridge is not a comparison (see above).
- **The target line only appears on some bars** — by design, it is drawn on the total
  bars.

---

## Privacy

All processing happens inside Power BI. The visual makes no network requests of any kind
and stores nothing outside the report. The start-screen links open only when you click
them, through Power BI.
