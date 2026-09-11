# Waterfall Advanced — Tips & Hints (v1.1.0.0)

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

> **The single most common mistake:** leaving *Bar type* as Sum. It is text in a measure
> well, so Power BI tries to add it up and nothing arrives. The chart then treats every
> row as a driver and the bridge never closes on the right figure.

---

## Bar type: the whole point

| Value | What it draws | Use it for |
|---|---|---|
| `total` | From zero to the value | The opening and closing anchors |
| `subtotal` | From zero to the running total | Net Revenue, Gross Profit, EBITDA, EBIT |
| `delta` | Floats from the running total | Every driver: price, volume, payroll, freight |

Anything else is read as `delta`. **The first and last rows are always drawn as totals**,
whatever the column says — a bridge has to start and end somewhere.

A P&L walk with no subtotals is a list of costs. With them it becomes a document a
committee can read: revenue, what reduced it, where the margin stood, what consumed it,
where the result landed.

---

## Field wells

| Well | Kind | What it does |
|---|---|---|
| **Category** | Grouping | The line, driver or step. Required. |
| **Value** | Measure | The amount. Required. |
| **Target (optional)** | Measure | Goal or budget. Drawn as a dashed line on the anchor bars. |
| **Bar type** | Measure | `total` / `subtotal` / `delta`. **Aggregate as First.** |
| **Order** | Grouping | Numeric field fixing the sequence of the bridge. |
| **Tooltips** | Measure | Extra measures on hover. |
| **Colour (DAX, optional)** | Measure | A hex colour per row, calculated in the model. |

---

## Format pane

- **Colors** — increase, decrease, total and target colours; legend colour and size;
  **colour-blind safe palette** and **hatched decreases**
- **Labels** — show, mode (absolute / relative / both), font size, value and category
  colours, **totals and subtotals matching their bar colour**, and the density controls
  *(Pro)*: angle, truncation and hiding what does not fit
- **Number format** — currency symbol and position, scale, decimals, thousands separator
- **Chart** — connectors, subtotals, target line with its label and value, summary cards,
  sort by impact, invert colour semantics, max drivers, "Others" label, orientation
- **Summary Cards** — show, caption and value font sizes, text and background colours
- **Data Table** *(Pro)* — position, running total and % of opening columns, background,
  separator, font size and width
- **IBCS** *(Pro)* — standardised monochrome notation

---

## Reading a bridge that is too wide

Fifteen line items with long names and their amounts do not fit. A waterfall rarely fails
because the arithmetic is wrong; it fails because it is unreadable.

- **Switch to horizontal.** Long labels — "Rent & Facilities", "Warehouse Payroll" — read
  far better down the side than under a bar. This is the single biggest improvement on a
  dense bridge, and it is free.
- **Angle the labels** *(Pro)* at −30°, −45° or −90° when vertical is the right layout.
- **Truncate** *(Pro)* at a character count. The cut falls on a word boundary, and the full
  name stays in the tooltip.
- **Group the small drivers** with *Max drivers shown*. The rest are summed into an
  "Others" bar, so the bridge still closes on the same figure.

---

## Accessibility, and why it is free

Around 8% of men cannot reliably separate red from green. A financial bridge is where
mistaking a rise for a fall costs most.

- **Colour-blind safe palette** replaces the defaults with Okabe-Ito blue and orange, which
  stay distinguishable under deuteranopia and protanopia.
- **Hatch decreases** puts a diagonal pattern on the falling bars. WCAG 1.4.1 asks that
  colour is not the only means of conveying information, and in a bridge up-versus-down
  *is* the information. With it on, the chart still reads in black and white — which is how
  half of these end up, printed in a committee pack.

Both are in the free tier deliberately.

---

## The data table (Pro)

A bridge answers *why*. A table answers *how much*. In a committee those two questions
arrive one after the other, and covering them used to mean putting a matrix beside the
chart: another visual to filter, another to format, and the chance that the two disagree.

The table shows every step with its amount, the running total and, optionally, each step as
a percentage of the opening figure. It sits to the right or below, with its own background
so it reads as a separate block.

---

## What Pro adds

| | Free | Pro |
|---|---|---|
| The bridge: totals, subtotals, deltas, connectors | ✓ | ✓ |
| Orientation, drilldown, target line | ✓ | ✓ |
| Colour-blind safe palette and hatched decreases | ✓ | ✓ |
| Conditional formatting (`fx`) and the Colour (DAX) well | ✓ | ✓ |
| Cross-filtering, multi-select, bookmarks, keyboard, high contrast | ✓ | ✓ |
| Summary cards, number format, "Others" grouping | ✓ | ✓ |
| **Individual drivers** | 12, rest grouped | **All of them** |
| **Data table** | — | **✓** |
| **IBCS mode** | — | **✓** |
| **Label angle, truncation, overlap handling** | — | **✓** |

Above twelve drivers the smallest are grouped into "Others". **The bridge still closes on
the same figure** — nothing is dropped, the detail is coarser. Twelve is the size of a
standard P&L walk, so the free tier covers the main case rather than breaking on it.

Every paid setting says *(Pro)* in the format pane and is never hidden: you can see what
the paid tier offers before deciding. Turning one on without a licence leaves the free
result on screen and Power BI shows its own notification with the link to obtain one — and
the setting is kept, so it applies the moment the licence is active.

---

## Troubleshooting

- **Every bar floats; no totals** — *Bar type* is aggregating as Sum. Set it to First.
- **The bars are in the wrong order** — nothing in *Order*, so they follow the category
  sort.
- **The closing bar is not the sum of the others** — check that exactly one row is your
  opening total and that the deltas carry the right sign. Costs must be negative.
- **Labels are cut off** — switch to horizontal, or angle them *(Pro)*.
- **A driver is missing and there is an "Others" bar** — the free tier shows twelve
  individual drivers; the note at the top right says how many were grouped.
- **The target line only appears on some bars** — by design, it is drawn on totals and
  subtotals. A target on every cost line would be noise.

---

## Privacy

All processing happens inside Power BI. The visual makes no network requests of any kind
and stores nothing outside the report.
