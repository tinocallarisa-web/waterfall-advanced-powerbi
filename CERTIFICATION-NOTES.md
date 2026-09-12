# Certification Notes — Waterfall Advanced v1.1.0.0

The short version to paste into Partner Center is
[`CERTIFICATION-NOTES-SHORT.txt`](./CERTIFICATION-NOTES-SHORT.txt), written to fit the
2,500-character limit of that field, which truncates without warning and mid-word. **That
field is cleared on every resubmission** — it has to be pasted again each time.

## Read this first: what changed since the certified 1.0.8.0

Three things in this release matter for review, and one of them is the reason the release
exists.

### External service calls have been removed

Versions up to 1.0.8.0 included AI narrative generation that called `api.anthropic.com` and
`api.openai.com` directly from the visual, with `privileges: []`.

A certified visual may not access external services. The sandbox CSP blocked the calls, so
the feature never worked in a published report — but the code was inside the package that
was certified. Declaring the `WebAccess` privilege is the only way those calls could work,
and it forfeits certification, so the feature has been removed entirely rather than
enabled: the source file, its format-pane card, its `capabilities.json` object and the
Finance tier that gated it.

The offer's Finance plan has been withdrawn from sale by the publisher.

```bash
grep -rn "fetch(\|XMLHttpRequest\|WebSocket\|https://" src/*.ts | grep -v "schema\|powerbi.com"
# no matches
```

`privileges` remains `[]`.

### The licence could never be granted

`licenseManager` called `getAvailabilityStatusForServicePlan()`, which is not part of
`IVisualLicenseManager` — that interface has four methods: `getAvailableServicePlans`,
`notifyLicenseRequired`, `notifyFeatureBlocked` and `clearLicenseNotification`.

The call threw, the `catch` swallowed it, and the fallback decided the tier from
`window.location.hostname === "localhost"`: true while developing, false everywhere else.
**Every published user resolved to the free tier, whatever they had bought.** No customers
were affected — the offer has no sales — but the *Buy now* button led to a purchase the
visual could not recognise.

What it does now:

| | |
|---|---|
| Method | `getAvailableServicePlans()` |
| Match | `spIdentifier === "pro"`, the Plan ID in Partner Center |
| States accepted | `Active` and `Warning` — the payment grace period |
| Environment | `isLicenseUnsupportedEnv` and `isLicenseInfoAvailable` honoured |
| On failure | Free, and the error goes to the console. Never Pro. |
| After resolving | The chart repaints, so nobody is left on Free in a report that renders once |

**The identifier comparison is essential in this offer, not merely prudent.** The offer
publishes a `free` plan alongside `pro`, so `getAvailableServicePlans()` returns an active
plan for a free user too. A check of the form "does the user hold an active plan?" would
unlock the paid tier for everyone.

### No licensing UI of the visual's own

Removed: the white overlay with a padlock drawn over the bars beyond the free limit, the
upgrade banner linking to the generic AppSource storefront, and the `FREE · 8 bars max`
badge on the landing page.

Microsoft's guidance is explicit that a visual "shouldn't display its own licensing UX,
instead use one of Power BI supported predefined notifications". Those elements also
behaved as a watermark on the free tier, and the storefront link was a dead end.

The purchase path is now `notifyFeatureBlocked` when a paid setting is changed, and
`notifyLicenseRequired` while paid settings are stored without a licence — which covers the
lapsed trial, where the user changes nothing and the features stop applying on their own.
Intent is read from `metadata.objects`, which holds only properties the user set
explicitly, so nothing fires on a report nobody has configured.

## No watermark and no artificial limits

The free tier draws the complete bridge. Above twelve individual drivers the smallest are
grouped into an `Others` bar, and a neutral note states how many.

This is grouping, not truncation, and the distinction is the point: truncating leaves a
bridge whose closing bar is no longer the sum of what precedes it, so a reader who does not
know a limit exists sees a chart that is simply wrong. Grouped, the bridge closes on the
same figure — the free result is correct, just coarser.

## Repository

- Certification branch: `certification` (public, GitHub)
- https://github.com/tinocallarisa-web/waterfall-advanced-powerbi/tree/certification

The slug is `waterfall-advanced-powerbi`; `Waterfall` is only the local folder name.

**The branch now contains the source of what is published.** It had stopped at 1.0.6.0
while 1.0.8.0 was live on AppSource: the source of two released versions existed only on
the developer's machine. Restored in this release, and the gap is recorded in
`CHANGELOG.md` rather than quietly closed.

## Public URLs

| Page | URL |
|---|---|
| Privacy Policy | https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/privacy.html |
| Terms of Use | https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/terms.html |
| Support | https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/support.html |
| Changelog | https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/changelog.html |
| Demo video | https://www.youtube.com/watch?v=zDxpsXMD3WM |

All four pages are served from the repository root by GitHub Pages. The privacy,
terms and support pages were rewritten for 1.1.0.0 and `changelog.html` is new, so
**request all four in a browser after the push and before submitting** — Pages takes
minutes to deploy and a cached fetch will report 200 on a page that is not live yet.
The URLs themselves are unchanged from 1.0.8.0.

### What changed in the documentation for 1.1.0.0

The three published pages still described 1.0.x: the support page documented an AI
narrative feature with instructions for pasting an Anthropic or OpenAI API key, the
privacy policy described sending aggregated chart data to those providers, and the
terms sold a Finance tier and capped the free tier at 8 bars. None of that exists in
this build. All three were rewritten against `capabilities.json` and
`src/settings.ts`, so the documented field wells, tier split and keyboard behaviour
now match the code — including the absence of arrow-key navigation, which the support
page states plainly rather than implying.

## Data access & privacy

- Reads only the standard categorical `dataView`: Category, Value, Target, Bar type,
  Order, Tooltips and Colour.
- No `fetch`, no `XMLHttpRequest`, no `WebSocket`, no local file access, no telemetry, no
  CDN.
- Nothing is persisted outside the `.pbix` beyond the visual's own formatting properties.

## Feature summary

### Free
- The bridge: `total`, `subtotal` and `delta` bar types, connectors, both orientations
- Hierarchical drilldown on the Category well
- Target line on the anchor bars, with a configurable label and its value
- Anomaly flags on drivers beyond two standard deviations from the mean
- Conditional formatting on bar colour (`fx`) and a per-row colour from the model
- Colour-blind safe palette (Okabe-Ito) and hatched decreases
- Summary cards, number formatting, `Others` grouping
- Cross-filtering with multi-select, cross-highlighting, bookmarks, report page tooltips
- Context menu on bars and empty space, keyboard navigation, high contrast
- Twelve individual drivers

### Pro
- Every driver individually
- The data table beside or below the chart
- IBCS monochrome mode
- Label angle, truncation and hiding labels that do not fit

## Certification requirements checklist

- [x] No access to external services; `privileges: []`
- [x] `renderingStarted` / `renderingFinished` / `renderingFailed` on every `update()` path
- [x] Context menu on a bar and on empty space
- [x] Tooltips via `host.tooltipService`, plus report page tooltips
- [x] `host.allowInteractions` checked before selecting
- [x] Bookmarks: `registerOnSelectCallback` registered, selection restored
- [x] No watermark, no artificial limits, no licensing UI of our own
- [x] Privacy Policy and Terms of Use are separate pages, both reachable
- [x] The repository contains the source of the submitted package
- [x] Version in `pbiviz.json` (1.1.0.0) is above the published 1.0.8.0

### Known gaps, declared openly

- No reference lines or threshold bands beyond the target line.
- No small multiples.
- The chart's own strings are localised into English, Spanish, French and German. The
  format pane property names carry no `displayNameKey`, so they stay in English whatever
  the report language.

## Testing instructions

A sample dataset is in `assets/`: a P&L by channel, with a generator script. Two files —
one with twelve drivers that fits the free tier, one with eighteen that does not. Both
balance to the same net profit, which is what makes them useful for checking the grouping.

### Free tier
1. Import with no licence assigned.
2. Category = `P&L Line`, Value = `Amount`, Order = `Order`, Bar type = `BarType`
   **aggregated as First, not Sum**. Target = `Target`.
3. The bridge renders with totals, subtotals and drivers as distinct bars.
4. Turn on **IBCS → IBCS mode (Pro)** or **Data Table → Show data table (Pro)**. The chart
   keeps the free result and Power BI raises its own licence notification, carrying the
   link to obtain one. The setting is kept.
5. Remove those settings and the notification clears.
6. Load the detailed sample: eighteen drivers. The twelve largest are drawn individually,
   the rest are grouped into `Others`, a note says how many, **and the closing figure is
   identical to the twelve-driver file**.
7. Right-click a bar and empty space — the context menu appears in both.
8. Select bars, save a bookmark, change the selection, reapply the bookmark — the bars
   follow it.

### Pro tier
1. Assign a plan with the `pro` service plan entitlement.
2. Repeat step 4 — IBCS mode and the data table now render.
3. Repeat step 6 — all eighteen drivers are drawn individually, with no `Others` bar.
