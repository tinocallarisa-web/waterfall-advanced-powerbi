# Changelog — Waterfall Advanced

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.3.0.0] — unreleased

### Added

- **Styles of the TCViz collection**: Boardroom, Ledger, Editorial, Signal, Aurora and Terrace — the same styles as
  the other TCViz visuals, so a page reads as one report. Each one sets the increase, decrease and total colours, the
  text, the axes, the summary cards, the data table and the visual's background (dark in Boardroom and Aurora). All
  free. A colour you set yourself still wins over the style, and choosing a style clears the saved settings it defines,
  as choosing a template did in 1.2 (the fx rule of the Increase colour included).
- **Accessibility** card: high contrast (automatic, following Windows, or always on — black on white), keyboard focus
  colour and width, and a minimum text size for the whole chart, the summary cards and the data table.
- **Flag unusual changes (!)** in the Chart card: the "!" marker on outlying changes can now be turned off. It is on by
  default, so saved reports look the same.
- **Summary cards → Hide when the bridge is not a comparison** (on by default): the cards read the bridge as the same
  figure at two moments (sales 2025 → sales 2026). They now hide on their own when there is no opening and closing
  total, or when every change goes the same way — a P&L from revenue to EBITDA, where a "−77 % variance" between
  revenue and EBITDA means nothing and one of the "biggest change" cards was empty. Turn it off to always show them.

### Changed

- **Report theme replaces Classic** as the first and default option: increases and decreases take the report theme's
  good/bad sentiment colours, totals its first data colour, and labels and axis its text colours; where the theme
  does not provide a colour, the colours of earlier versions are kept. Reports saved without a template or colours
  follow the report theme from this version on.
- The 1.2 templates (Modern, Soft, One colour, Dark background) are no longer offered, but reports that use them keep
  drawing exactly as before.
- **Value axis from zero**: when every running total and total is zero or above, the axis starts at 0 instead of
  dropping below it to leave a margin. With negative values the margin stays.
- The "Pro preview" watermark is now the one shared by all TCViz visuals.
- **Every bar fits the width of the visual**, with no scroll bar: the bars and the gaps between them narrow as needed.
  A scroll bar appears only when even 8-pixel bars would not fit.
- **Value labels never overlap.** They are placed in order of importance — totals and subtotals first, then the
  targets, then the changes from largest to smallest — above, inside or below their bar. A label that finds no free
  place is left out instead of being drawn on top of another; its figure is still in the data table and the tooltip.
- **A figure shrinks to fit the width of its bar** (down to 8 px) before it is left out, so a narrow visual keeps its
  numbers without removing decimals.
- **The target label looks for a free place** — above, below or beside its line — and, if there is none, is shortened
  to the figure alone. The line itself is always drawn.
- **Text shrinks with the visual.** In a small visual every text of the chart — value and category labels, axes,
  legend, summary cards and data table — gets smaller with it, down to 60 % of the size you chose, never below 8 px
  and never below the minimum text size of the Accessibility card. From roughly 760 × 440 px up, your sizes are used
  as they are.
- **The data table adapts to its space**: when it does not fit, it drops the "% of opening" column first, then the
  running total, and reduces its font, before it cuts anything.
- **Category names that do not fit** under their bar are shortened with "…", and when not even a few letters fit,
  only one name in every few is shown. With an angle (Pro), only one label in every few is drawn when tilted labels
  would run into each other. The full name is always in the tooltip.
- **Value axis ticks** fall on round numbers (1, 2, 2.5 or 5 times a power of ten), as many as fit with room to read
  them, and never repeat.
- **Summary cards stay on one row**: in a narrow visual the last cards (biggest loss, then biggest gain…) are left
  out instead of wrapping to a second row that was cut off, and the row grows taller when a large minimum text size
  needs it.
- Scroll bars, when there are any, are thin and take the colours of the style.
- With a dark style, the setup tips bar takes the style's colours.

### Fixed

- **Conditional formatting (fx)** on the Increase colour is now declared the standard way, so tools that read the
  package (such as OKviz) detect it. It works as before: a fixed colour is stored for the whole visual.
- High contrast now also applies to category labels, value labels drawn in a custom colour, the summary cards, the
  data table, gridlines and the outlier marker.
- **Tilted category labels with no character limit** came out as a single letter and "…" ("V…"). They now keep as
  much of the name as fits below the chart.
- **Text widths are measured with the style's real font.** Ledger and Editorial use Georgia, which is wider than
  Segoe UI; labels were laid out as if it were narrower and could run into each other. Nothing overlaps now.
- The "!" marker respects the minimum text size of the Accessibility card, and grows with it.

---

## [1.2.0.0] — 2026-10-22

### Fixed

- **Rendering events.** The chart reported "render finished" to Power BI also when the licence resolved, after a click
  and when a bookmark was applied — events with no matching start, which certification rejects. Each update now
  raises exactly one start and one finish; repaints outside an update raise none.
- **A fixed Increase colour could paint every bar.** Before 1.2 the fixed colour was stored bar by bar, through the
  same selector the fx rule uses, so it overrode totals and decreases too and no setting could change them. Fixed
  colours are now stored for the whole visual, and choosing a style template clears the old per-bar value.
- **The format pane was always in English.** The translations existed but were never connected. It now follows the
  language of Power BI in 12 languages.

### Added

- **Pro preview.** While you edit without a licence, the data table, IBCS mode and the label density settings you
  turn on are drawn working on your own data, under a "Pro preview" watermark; Power BI shows its own licence notice
  and Upgrade bar. Reading view shows the free chart, and where licences cannot be read (Publish to Web, embedding,
  export) the free result is drawn with no watermark.
- **Style templates**: Classic (the look of earlier versions, and the default), Modern, Soft, One colour — with a base
  colour you choose: totals take it, increases a lighter shade, decreases a darker one — and Dark background, for
  reports with a dark background.
- **Setup tips** while editing: the templates in one click, and the Pro features to try on your data.
- **Model format**: values, labels, tooltips and the axis can use the measure's own format string — dynamic format
  strings included — in the report's language. The custom format (symbol, scale, decimals) stays the default.
- **Value axis**: show or hide, gridlines, font size, colour and title. **Category axis** title.
- **Legend**: show or hide, top or bottom, font, size and colour, in its own group of the Colors card.
- **On-object formatting**: bars, value labels, category labels, value axis, legend, summary cards and data table.
- **Start screen** with the steps and links, and a new icon.

### Changed

- The target line, its label and the value labels are drawn above the bars, with a halo, so a neighbouring bar no
  longer covers them; the target label sits above its line, centred on its bar. When a total's value falls at the
  height of its target, the value moves inside the bar.
- In small tiles the summary cards and the legend hide themselves instead of squeezing the chart.
- Toolchain: Power BI visuals API 5.11.1, pbiviz 7.2.1, TypeScript 5.9, ESLint 10.

---

## [1.1.3.0] — 2026-09-23

### Fixed

- **The Upgrade bar never survived the feature banner, so the purchase path disappeared.**
  Power BI shows one notification at a time and the last call replaces the previous one. The
  render called `required()` and then `blocked()` in the same update, so the persistent
  notice carrying the Upgrade button was replaced by the transient banner; when the banner
  faded there was nothing left to click. A free user who reached for a Pro setting was told
  once, briefly, and then left with no way to buy.

  The fix is inside `LicenseNotifier`, not in the order of the calls at the render: there are
  three call sites spread across `update()` and the click handler, and the end state has to be
  right whichever order they arrive in. `blocked()` now clears any standing notice first,
  raises the banner, and schedules the Upgrade bar for 10.5 s later, which is how long the
  banner lasts. `required()` stands down while that timer is pending instead of competing
  with it. The timer is cancelled in `destroy()`, so a visual that is disposed — Power BI
  recreates it on every page change — does not notify on behalf of a chart that is gone.

  No watermark was added, and none should be: the free tier here does not render a Pro
  feature half-way. It groups the smaller drivers and draws a bridge that still balances,
  which is a correct chart rather than a crippled one. There is nothing to mark.

### Changed

- **The toolchain was failing a certification requirement.** `npm audit` returned 2 critical, 8
  high and 11 moderate advisories — the certification rules state plainly that it "must not
  return any warnings with high or moderate level". They all came from `powerbi-visuals-tools`
  5.6.0, which is also three major versions behind the "use the latest version" requirement.
  Tools are now 7.2.1, the API 5.11.1 and TypeScript 5.5.4, aligned with the rest of the
  portfolio, with a clean reinstall to prune what the old tree had left behind and the same
  `overrides` for `qs` and `uuid` that the clean repos already carried. `npm audit` now reports
  **0 vulnerabilities**. The upgrade also unlocks `pbiviz package --certification-audit`, the
  official check for `fetch`, `XMLHttpRequest` and `eval` calls, which reports no external
  requests. None of this changes a line of the visual.
- **Lint validation runs again.** The repo had no ESLint configuration in the format
  `pbiviz` 5.6 expects, so every build printed *"Can't run lint validation"* and packaged
  anyway. The certification rules — the ones that reject a visual for `innerHTML` and
  friends — live in that step, so the package was being shipped unchecked. ESLint is now
  aligned with the rest of the portfolio (9.x with the flat config) and the build is clean.
  One stale `eslint-disable` directive pointing at a rule that is no longer loaded was
  removed.

---

## [1.1.2.0] — 2026-09-14

### Fixed

- **A paying customer could stay on Free.** `getAvailableServicePlans()` returns each plan's
  `spIdentifier` as the full Partner Center **Service ID** (`publisher.offer.plan`, e.g.
  `tino_callarisa.waterfall-advanced.pro`), as the licensing API documentation states. The
  visual compared it with the bare plan ID `pro`, which never matches the full Service ID.
  It now accepts a Service ID ending in `.pro`, and the bare plan ID as well. The free plan
  (`….free`) still does not unlock Pro.

---

## [1.1.1.0] — 2026-09-14

### Changed

- **Resubmission of 1.1.0.0 under a new version number.** The previous submission uploaded
  the 1.0.8.0 package instead of 1.1.0.0, so certification rejected it under 1200.1.1.3
  (the repository said 1.1.0.0, the package 1.0.8.0). Partner Center had already recorded
  1.1.0.0 and does not accept the same number twice. No code change: the visual is
  identical to 1.1.0.0.

---

## [1.1.0.0] — 2026-09-10

### Fixed

- **The licence could never be granted.** `licenseManager` called
  `getAvailabilityStatusForServicePlan()`, which is not part of the API —
  `IVisualLicenseManager` has exactly four methods: `getAvailableServicePlans`,
  `notifyLicenseRequired`, `notifyFeatureBlocked` and `clearLicenseNotification`.
  The call threw, the `catch` swallowed it, and the fallback decided the tier from
  `window.location.hostname === "localhost"` — true while developing, false
  everywhere else. **Every published user resolved to the free tier, whatever they
  had paid.** It worked perfectly in local development, which is why it survived.

  The check now compares the plan identifier against this visual's Pro plan.
  That matters more here than elsewhere: the offer publishes a free plan as well
  as a paid one, so "does the user hold an active plan?" is true for free users
  too.

- **A licence in its payment grace period was treated as absent.** `Warning` is
  accepted alongside `Active`, so a paying customer no longer loses features while
  a billing problem is resolved.

- **Publish to Web, embedding and PDF export asked a paying customer to buy.**
  `isLicenseUnsupportedEnv` and `isLicenseInfoAvailable` are honoured: the free
  experience renders there, and nobody is prompted to buy what they may own.

- **Rotated category labels fell outside the canvas.** The bottom margin reserved
  the height of a line of text. A label at −45° extends downwards by its *width*
  times the sine of the angle, so rotating pushed the labels off the chart and
  Power BI clipped them — the opposite of what rotating is for.

- **Category labels touched the left edge in horizontal orientation.** The margin
  was computed at a fixed 6px per character and capped at 160px, which falls short
  at larger font sizes. It now follows the real font size, allows up to 45% of the
  width, and reserves a gutter so the longest label never sits against the frame.

### Added

- **Colour-blind safe palette.** Okabe-Ito blue and orange, which stay
  distinguishable under deuteranopia and protanopia — where the default green and
  red do not. It affects around 8% of men, and a financial bridge is where
  mistaking a rise for a fall costs most. **Free**, deliberately: accessibility
  behind a paywall is indefensible.

- **Hatched decreases.** WCAG 1.4.1 requires that colour is not the only means of
  conveying information. In a bridge, up versus down *is* the information. With
  the hatch on, a decrease still reads in black and white, in print, and with
  colour blindness. Applied only to negative `delta` bars — a negative total is a
  result, not a fall. **Free.**

- **Conditional formatting on bar colour (`fx`).** The native rule dialog,
  resolved per category. It coexists with the *Color (DAX)* field well, which
  still wins when populated.

- **Summary Cards section** in the format pane: show, caption and value font sizes,
  text colour and background, each with a "follow the theme" switch. These
  controls previously lived split between *Chart* and *Colors*.

- **Configurable legend font size**, with the swatch and spacing following it.
  They were fixed at 78px, so raising the size made the labels overlap.

- **Label density controls (Pro):** category label angle (0°, −30°, −45°, −90°),
  truncation at a chosen number of characters, cutting on a word boundary, and
  hiding labels that do not fit. Automatic truncation to the available margin
  stays free — that is correctness, not a feature.

- **IBCS mode (Pro).** Monochrome notation: neutral charcoal for totals and
  subtotals, mid grey for increases and near-black for decreases, with the
  emphasis on the negative deviation, which is what a bridge is read for.

### Changed

- **The free limit groups instead of truncating, and rises from 8 to 12 drivers.**
  Truncating left a bridge that does not balance: the closing bar was no longer
  the sum of what preceded it, and a reader who did not know a limit existed simply
  saw a wrong chart. The smaller drivers are now grouped into "Others", so the
  bridge still closes on the same figure and the numbers stay correct — what is
  lost is granularity, which is a legitimate reason to pay. Twelve is the size of a
  standard P&L walk, so the free tier covers the main case rather than breaking on it.

- **The target line says what it is.** It read `▸ tgt`, which nobody outside this
  codebase understands, and carried no figure — so it showed that a target existed
  but not whether it was met. The label is now configurable, defaults to "Target",
  optionally carries the value, and moves to the other side of the line rather than
  falling off the canvas.

- **`allowInteractions` is honoured** before selecting, clearing and opening the
  context menu.

### Removed

- **AI narratives, and with them the Finance tier.** The feature called
  `api.anthropic.com` and `api.openai.com` directly from the visual. A certified
  Power BI visual may not access external services, and declaring the `WebAccess`
  privilege — the only way to make those calls work — forfeits certification.
  The calls were therefore blocked by the sandbox CSP in every published report:
  the feature could not work as shipped. It also stored the user's API key as a
  formatting property, which travels inside the `.pbix` in clear text to anyone
  who receives the file.

- **The licence overlay drawn inside the chart** — a white rectangle with a padlock
  over the bars beyond the free limit, and an upgrade banner linking to the generic
  AppSource storefront. It was licensing UI of the visual's own, which Microsoft's
  guidance advises against, it behaved as a watermark on the free tier, and the
  link was a dead end. Power BI's own notifications replace it, and a neutral note
  states how many drivers are grouped.

### Documentation

- **`support.html`, `privacy.html` and `terms.html` were still the 1.0.x pages.**
  Support documented an "AI Narratives Setup (Finance)" section with instructions
  for pasting an Anthropic or OpenAI API key; the privacy policy described sending
  chart data to those providers; the terms sold a Finance tier at $49/user/month
  and capped the free tier at 8 bars. All three are live pages of an offer where
  none of that exists any more, and the real free limit is twelve. Rewritten
  against `capabilities.json` and `settings.ts`: the seven actual field wells, the
  real Free/Pro split, a format pane reference by card, and the keyboard support as
  it is implemented — Tab, Enter, Space and Ctrl, with no arrow-key navigation,
  which the page no longer implies.
- **`changelog.html`**, generated from this file by `scripts/gen-changelog.js` and
  served from the repo root. A changelog that is not served is not a release-activity
  signal for anything that crawls the offer.
- **A search box on `support.html`** — no dependencies, `aria-live` for the count,
  Escape to clear, and it only hides sections that are already in the HTML, so the
  page reads complete if the script fails to load.
- **Issue templates** in `.github/ISSUE_TEMPLATE/` as YAML forms, with a bug report
  that asks for the shape of the data — the field that resolves most reports — and
  contact links to the support page, the video and the changelog.
- **A `LICENSE` file.** The repository is public so Microsoft can review the source;
  that is not a grant of rights to the code, and until now nothing said so.
- **The demo video was re-recorded for 1.1.0.0** and the new URL propagated to the
  README, the AppSource listing copy, both certification notes, the support page and
  the product page on tcviz.com. The 1.0.x walkthrough predated the data table.
- **`docs/infographic.html`** — the 1366 × 768 listing image, with an overflow
  warning outside the captured element.
- The package `description` no longer advertises AI narratives or a Finance tier.
  It is what Power BI Desktop shows in the visual's information panel.

---

## [1.0.8.0] — 2026-08-20

Published to AppSource. Multi-selection, high-contrast palette support and
renderer rework.

> The source of this release was never committed: the repository stopped at
> 1.0.6.0 while 1.0.8.0 was live. Restored in 1.1.0.0.

## [1.0.7.0] — 2026-08

Not committed at the time. See the note above.

## [1.0.6.0] — 2026-08

Rendering events fixed for the 1:1 ratio; sample file hints added.

## [1.0.5.0] — 2026-08

Context menu listener moved to the stable container element.

## [1.0.4.0] — 2026-07

Context menu on bars and empty space; `supportsContextMenu` removed.
