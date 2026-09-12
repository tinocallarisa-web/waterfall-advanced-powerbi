# AppSource Listing — Waterfall Advanced v1.1.0.0

Copy ready to paste into Partner Center. **The marketplace description is the
documentation most people read and the one that goes stale fastest** — update it on every
release, not only when the code changes.

> The 1.0.x listing advertised **AI narratives**, which have been removed: they called
> external services, which a certified visual may not do. Anything mentioning Anthropic,
> OpenAI, API keys or the Finance tier has to go from the live offer too.

---

## Short description (max 100 characters)

```
Financial bridge chart with subtotals, targets and a data table. Certified.
```

*(74 characters)*

---

## Long description

```
Power BI's built-in waterfall handles category movement. It does not handle a bridge: an
opening anchor, drivers that explain the movement, intermediate checkpoints a finance
reader expects, and a closing total. Without those, a P&L walk is a row of floating bars
and the reader has to reconstruct the story themselves.

Waterfall Advanced adds the one thing that changes that: semantic control over what each
bar means. Mark a row as a total, a subtotal or a driver, and the chart draws the bridge
your finance team already has in their heads.

BUILT FOR P&L WALKS

• Totals, subtotals and drivers as distinct bar types, from a column in your model
• Intermediate checkpoints — Net Revenue, Gross Profit, EBITDA, EBIT — drawn from zero,
  so a reader sees where the margin stood before the next block of costs
• Horizontal or vertical, because line-item names read better down the side
• Hierarchical drilldown: start at region, open into country or product without leaving
  the bridge
• A target line on the anchor bars, with its own label and figure
• Drivers beyond two standard deviations from the mean are flagged automatically
• Summary cards: opening, closing, variance %, biggest gain, biggest loss

READABLE ON PURPOSE

• A colour-blind safe palette and hatched decreases. Around 8% of men cannot reliably
  separate red from green, and a bridge is where mistaking a rise for a fall costs most.
  With the hatch on, the chart still reads printed in black and white — which is how half
  of these end up, in a committee pack.
• Conditional formatting on bar colour through the native fx dialog, or a hex colour per
  row calculated in your model
• Label angle, truncation and automatic handling of labels that do not fit
• IBCS monochrome notation for standards-based reporting

THE NUMBERS BESIDE THE CHART

A bridge answers why. A table answers how much. The built-in data table puts both in one
visual — every step with its amount, the running total and each step as a share of the
opening figure — instead of a matrix beside the chart that has to be filtered and
formatted separately.

IN THE REPORT

Cross-filtering with multi-select, cross-highlighting, bookmarks, report page tooltips,
right-click context menu, keyboard navigation and high contrast. Interface strings in
English, Spanish, French and German.

PRIVACY

No network calls of any kind: no telemetry, no analytics, no CDN, no endpoints. All
calculation and rendering happens inside Power BI, on your machine or your tenant.

CERTIFIED

Power BI certified, so it works in exports to PDF and PowerPoint and in tenants that only
allow certified visuals.

FREE AND PRO

The free tier is the whole bridge: totals, subtotals, drivers, connectors, both
orientations, drilldown, the target line, conditional formatting, the accessible palette,
summary cards, cross-filtering, bookmarks, keyboard and high contrast — with twelve
individual drivers, which is the size of a standard P&L walk.

Above twelve, the smallest drivers are grouped into an "Others" bar. The bridge still
closes on the same figure: the detail is coarser, nothing is lost.

Pro adds every driver individually, the data table, IBCS mode and the label density
controls. 30-day free trial on AppSource.
```

---

## What's new — v1.1.0.0

```
• Fixed: the Pro licence could never be granted. The visual called a licensing method that
  does not exist, and the fallback decided the tier from the browser hostname — so every
  published user was served the free tier whatever they had bought.
• A data table beside or below the chart: every step with its amount, running total and
  share of the opening figure.
• A colour-blind safe palette and hatched decreases, both free. Colour is no longer the
  only thing separating a rise from a fall.
• IBCS monochrome mode, and controls for label angle, truncation and overlap.
• Bookmarks now restore the selection.
• Conditional formatting on bar colour through the native fx dialog.
• The free limit groups the smallest drivers into "Others" instead of hiding bars, so the
  bridge always closes on the right figure — and it rises from 8 drivers to 12.
• Removed: AI narratives and the Finance tier. They called external services, which a
  certified visual may not do, so the sandbox blocked them in every published report.
• Removed: the padlock overlay and the upgrade banner drawn inside the chart.
```

---

## Keywords (max 3)

```
Waterfall · Bridge · Variance
```

`Waterfall` carries the search. `Bridge` is what finance teams actually call it, and it is
the word in a brief like "build me the EBITDA bridge". `Variance` catches budget-versus-
actual, which is the other half of the audience.

---

## URLs to keep in sync

| Field | Value |
|---|---|
| Support / documentation | https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/support.html |
| Privacy policy | https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/privacy.html |
| Terms of use | https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/terms.html |
| Repository (certification branch) | https://github.com/tinocallarisa-web/waterfall-advanced-powerbi/tree/certification |
| Demo video | https://www.youtube.com/watch?v=zDxpsXMD3WM |

**The repository slug is `waterfall-advanced-powerbi`** — not `Waterfall`, which is only
the local folder name.

**The certification notes field caps at 2,500 characters** and truncates without warning,
mid-word. Paste `CERTIFICATION-NOTES-SHORT.txt`, written to fit at 2,494. That field is
cleared on every resubmission.

**Plans:** the offer publishes `free` and `pro`. The `finance` plan is retired — its sale
has been stopped and the code no longer recognises it.

---

## Before submitting

- [ ] Long description pasted, replacing the one that advertises AI narratives
- [ ] "What's new" pasted
- [ ] Every mention of Anthropic, OpenAI, API keys and the Finance tier removed from the
      live offer
- [ ] Support, privacy and terms URLs checked with a real request, not assumed
- [ ] Certification notes pasted from `CERTIFICATION-NOTES-SHORT.txt`
- [ ] Version 1.1.0.0 is above the published 1.0.8.0
- [ ] Screenshots updated — the current ones predate the data table, which is the feature
      that shows best in a thumbnail
- [x] Video re-recorded for 1.1.0.0 (2026-09-12): https://youtu.be/zDxpsXMD3WM — replaces
      the 1.0.x walkthrough. Update the video URL in the offer; the old one is still live on
      YouTube, so an un-updated field does not 404 and nothing warns you.
