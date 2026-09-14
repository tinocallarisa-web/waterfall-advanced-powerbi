# Waterfall Advanced — Power BI Custom Visual

**by [TCViz](https://tcviz.com)**

A waterfall chart built for financial bridges, not for generic before-and-after pictures.
Tell it which rows are anchors, which are checkpoints and which are drivers, and it draws a
P&L walk a committee can read.

[![AppSource](https://img.shields.io/badge/AppSource-Certified-0078D4?logo=microsoft)](https://marketplace.microsoft.com/en-us/product/tino_callarisa.waterfall-advanced)
[![Version](https://img.shields.io/badge/version-1.1.1.0-brightgreen)](./pbiviz.json)
[![License](https://img.shields.io/badge/license-Commercial-orange)](https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/terms.html)

📖 **[Documentation & Support](https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/support.html)** ·
🎬 **[Video walkthrough](https://www.youtube.com/watch?v=zDxpsXMD3WM)** ·
📝 **[Changelog](https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/changelog.html)** ·
💡 **[Tips & Hints](./TIPS-AND-HINTS.md)**

---

## The problem it solves

Power BI's built-in waterfall handles category movement. It does not handle a bridge: an
opening anchor, drivers that explain the movement, intermediate checkpoints a finance
reader expects, and a closing total. Without those, a P&L walk is a row of floating bars
and the reader has to reconstruct the story themselves.

This visual adds the one thing that changes that: **semantic control over what each bar
means.**

## How it works

| Well | What it does |
|---|---|
| **Category** | The P&L line, driver or step |
| **Value** | The amount. Negative falls, positive rises |
| **Bar type** | `total`, `subtotal` or `delta` — **aggregate as First, not Sum** |
| **Order** | Numeric field fixing the sequence of the bridge |
| **Target** (optional) | Goal or budget, drawn on the anchor bars |
| **Tooltips**, **Colour (DAX)** | Extra measures on hover; a hex colour per row |

`total` draws from zero. `subtotal` draws from zero to the running total. `delta` floats
from it. The first and last rows are always totals.

A sample P&L by channel lives in [`assets/`](./assets) with its generator: two CSVs, one
that fits the free tier and one that does not, both balancing to the same net profit.

## Features

| | Free | Pro |
|---|---|---|
| The bridge: totals, subtotals, deltas, connectors | ✓ | ✓ |
| Horizontal and vertical orientation | ✓ | ✓ |
| Hierarchical drilldown | ✓ | ✓ |
| Target line with its own label and value | ✓ | ✓ |
| Conditional formatting (`fx`) and the Colour (DAX) well | ✓ | ✓ |
| **Colour-blind safe palette and hatched decreases** | ✓ | ✓ |
| Summary cards, number formatting, "Others" grouping | ✓ | ✓ |
| **Anomaly flags** on drivers beyond 2σ of the mean | ✓ | ✓ |
| Cross-filtering, multi-select, bookmarks, report tooltips | ✓ | ✓ |
| Keyboard navigation and high contrast | ✓ | ✓ |
| **Individual drivers** | 12 | **All** |
| **Data table beside the chart** | — | **✓** |
| **IBCS mode** | — | **✓** |
| **Label angle, truncation and overlap handling** | — | **✓** |

Above twelve drivers the smallest are grouped into an "Others" bar. **The bridge still
closes on the same figure** — the detail is coarser, nothing is lost. Twelve is the size of
a standard P&L walk, so the free tier covers the main case rather than breaking on it.

Accessibility is free on purpose. Around 8% of men cannot reliably separate red from green,
and a financial bridge is where mistaking a rise for a fall costs most.

Every paid setting says `(Pro)` in the format pane and is never hidden. Turning one on
without a licence leaves the free result on screen and Power BI shows its own notification
with the link to obtain one; the setting is kept and applies as soon as the licence is
active. Every install starts with a 30-day trial.

## Installation

Install from [Microsoft AppSource](https://marketplace.microsoft.com/en-us/product/tino_callarisa.waterfall-advanced).
The visual is **Power BI certified**, so it works in exports to PDF and PowerPoint and in
tenants that only allow certified visuals.

### Build from source

```bash
npm install
npm start                              # dev server, hot reload in Power BI Desktop
npm run build                          # production .pbiviz in dist/
node scripts/build-test.js             # test build, Pro forced,     guid ..._test
node scripts/build-test.js --free      # test build, real free tier, guid ..._testfree
```

The test builds stamp the compile time in the corner of the visual. They share a guid and a
version number between rebuilds, so without that stamp Power BI Desktop can keep serving a
copy imported earlier with nothing to indicate it.

## Project structure

```
src/
  visual.ts           Entry point, licence, selection, bookmarks
  licenseManager.ts   Licence resolution and Power BI notifications
  licenseOverlay.ts   The grouping note (no licensing UI of its own)
  dataMapper.ts       dataView → bars, "Others" grouping
  waterfallEngine.ts  Running totals, bar geometry, summary
  renderer.ts         SVG chart, data table, summary cards
  formatter.ts        Number formatting
  settings.ts         Format pane model
docs/                 privacy.html, support.html, terms.html (GitHub Pages)
assets/               Sample P&L data and its generator
scripts/build-test.js Test builds
```

## Privacy

All processing happens inside Power BI. The visual makes no network requests of any kind —
`privileges` is empty and there is no `fetch`, `XMLHttpRequest` or `WebSocket` anywhere in
`src/`. Nothing is stored outside the report.
See the [Privacy Policy](https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/privacy.html).

## Known gaps

- No reference lines or threshold bands beyond the target line.
- No small multiples.
- The chart's own strings — summary card captions, the landing page — are localised into
  English, Spanish, French and German. **The format pane property names are English only**:
  they carry no `displayNameKey`, so they do not follow the report language.

## License

**Commercial software.** See the
[Terms of Use](https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/terms.html).
Source is published for AppSource review transparency. Redistribution is not permitted.

## Support

- 📖 [Documentation](https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/support.html)
- 🐛 [Report a bug](https://github.com/tinocallarisa-web/waterfall-advanced-powerbi/issues)
- 📧 [support@tcviz.com](mailto:support@tcviz.com)
