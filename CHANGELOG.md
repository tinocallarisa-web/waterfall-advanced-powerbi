# Changelog — Waterfall Advanced

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
