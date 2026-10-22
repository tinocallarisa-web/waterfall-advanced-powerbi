# Waterfall Advanced — Tips & Hints (v1.2.0.0)

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
5. Pick a look in **Format → Style template**, or from the tips bar at the bottom of the
   visual while you edit.

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

## Style templates (new in 1.2)

| Template | Look |
|---|---|
| Classic | The 1.1 look, and the default |
| Modern | Deeper colours; total and subtotal labels take their bar colour |
| Soft | Pale bars, dark value labels |
| One colour | From a **Base colour** you choose: totals take it, increases lighter, decreases darker |
| Dark background | For dark report backgrounds, including the summary cards and the data table |

A template only fills in what you have not set yourself. When you *pick* one, the
settings it defines are reset so it looks as designed.

> **Colour stuck on every bar?** Before 1.2 a fixed Increase colour was stored bar by bar
> and painted totals and decreases too. Pick any template (Classic keeps the original
> look) and the old value is cleared.

---

## Number format (new in 1.2)

- **Custom** (the default): currency symbol and position, scale (auto, none, thousands,
  millions), decimals, thousands separator.
- **Model format**: the measure's own format string — dynamic format strings included —
  in the report's language, for values, labels, tooltips and the axis.

---

## Format pane

- **Style template** — template, base colour (One colour), show setup tips
- **Chart** — orientation, connectors, subtotals, target line with its label and value,
  summary cards, sort by impact, invert colours, max drivers, "Others" label
- **Colors** — *Colors group*: colour-blind safe palette, hatched decreases, increase
  (with fx), decrease, total and target colours. *Legend group*: show, top or bottom,
  font, size, colour
- **Labels** — show, mode (absolute / relative / both), font size, value and category
  colours, totals and subtotals matching their bar colour, and the density controls
  *(Pro)*: angle, truncation and hiding what does not fit
- **Value axis** — show, gridlines, font size, colour, title
- **Category axis** — title
- **Number format** — Custom or Model format
- **Summary Cards** — show, caption and value font sizes, text and background colours
- **Data Table** *(Pro)* — position, running total and % of opening columns, background,
  separator, font size and width
- **IBCS** *(Pro)* — monochrome notation

With **Format** on, you can also click the bars, value labels, category labels, value
axis, legend, summary cards or data table to format them on the chart.

---

## Reading a bridge that is too wide

Fifteen line items with long names and their amounts do not fit. A waterfall rarely fails
because the arithmetic is wrong; it fails because it is unreadable.

- **Switch to horizontal.** Long labels — "Rent & Facilities", "Warehouse Payroll" — read
  far better down the side than under a bar. It is free.
- **Angle the labels** *(Pro)* at −30°, −45° or −90° when vertical is the right layout.
- **Truncate** *(Pro)* at a character count. The cut prefers a word boundary, and the full
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
- **Keyboard**: Tab through the bars, Enter or Space to select, Ctrl to add.
- **High contrast**: the chart follows the Windows high-contrast theme.

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
| Style templates, model format, axes, legend, on-object formatting | ✓ | ✓ |
| Colour-blind safe palette and hatched decreases | ✓ | ✓ |
| Conditional formatting (`fx`) and the Colour (DAX) well | ✓ | ✓ |
| Cross-filtering, bookmarks, keyboard, high contrast, 12 languages | ✓ | ✓ |
| **Individual drivers** | 12, rest grouped | **All of them** |
| **Data table** | — | **✓** |
| **IBCS mode** | — | **✓** |
| **Label angle, truncation, overlap handling** | — | **✓** |

Above twelve drivers the smallest are grouped into "Others". **The bridge still closes on
the same figure** — nothing is dropped, the detail is coarser.

### Pro preview (new in 1.2)

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
  Pick a template to clear it.
- **"Pro preview" on the chart** — a Pro setting is on without a licence. Readers do not
  see it.
- **Labels are cut off** — switch to horizontal, or angle them *(Pro)*.
- **A driver is missing and there is an "Others" bar** — the free tier shows twelve
  individual drivers; the note at the top right says how many were grouped.
- **Summary cards or legend missing** — they hide themselves in small tiles.
- **The target line only appears on some bars** — by design, it is drawn on the total
  bars.

---

## Privacy

All processing happens inside Power BI. The visual makes no network requests of any kind
and stores nothing outside the report. The start-screen links open only when you click
them, through Power BI.
