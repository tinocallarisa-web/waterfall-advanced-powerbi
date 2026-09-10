# Certification Notes — Waterfall Advanced v1.0.8.0

**Visual GUID:** `WaterfallAdvanced285e2ced869b4cbaaff42317a24068cc`
**Plan ID:** (fill in from Partner Center — Pro / Finance service plan)
**Publisher:** TCViz (support@tcviz.com)
**Version:** 1.0.8.0


---

## Update — Changes Made (v1.0.8.0)

This submission adds new formatting, interaction, and data-handling capabilities on top of the previously certified v1.0.6.0.

**New data roles:**
- `tooltips` (measure, optional): additional fields shown in the native tooltip alongside the default bar breakdown.
- `colorBy` (measure, optional): DAX-driven conditional color override per bar.

**New chart features:**
- Chart orientation toggle (vertical / horizontal), rendered inside a scrollable container so long category lists remain readable without overflowing the visual bounds.
- "Max drivers shown" setting: limits the number of delta bars displayed, grouping the remainder into a single "Others" bar (label configurable) so the running total stays accurate.
- Multi-select support for bars (ctrl/cmd+click), consistent with standard Power BI cross-filtering/cross-highlighting behavior.
- High-contrast mode: when the host reports high contrast, all bar/target colors fall back to the host-provided foreground color instead of user-configured colors.

**New formatting options (Format pane):**
- Legend text color, category/axis label color and font size, value label color (auto-match-bar or fixed), summary card background (auto-translucent or fixed color), invert increase/decrease color semantics.

**Fix:**
- Selection IDs are now built from each bar's original source index (`sourceIndex`) instead of its position in the rendered array. This corrects selection/highlight mismatches that could occur when bars were reordered (sort-by-impact) or grouped (Top-N "Others").

**Verification:**
- Verified with sample data in `test-data/*.csv`: multi-select, Top-N grouping, orientation switch, and conditional tooltip/color fields behave as expected with no console errors.
- `tsc --noEmit` passes with no type errors.

---

## Reenvío — Requisito de contenido / fallo leve (2026-08-21)

Comentarios de Microsoft sobre el envío anterior:
1. No se incluyó la URL del repositorio de código fuente ni credenciales de acceso; hay que dar acceso a `OSDC1033user`.
2. El campo "Notes for certification" debe incluir todas las instrucciones y recursos necesarios para la verificación y las pruebas.
3. (Fallo leve, no bloqueante) El archivo de ejemplo debería incluir pistas/consejos sobre cómo usar el visual.

**Acciones realizadas:**
- `gitHubUrl` en `pbiviz.json` actualizado con el repo: `https://github.com/tinocallarisa-web/waterfall-advanced-powerbi`.
- Acceso al repo: **hecho** — `OSDC1033user` ya está añadido como colaborador en `tinocallarisa-web/waterfall-advanced-powerbi`.
- Pistas en el archivo de ejemplo: **paso manual pendiente** — `modelo waterfall.pbix` es un informe binario de Power BI; añade un cuadro de texto o una página de "Info" en Power BI Desktop con el texto de "Pistas para revisores" de abajo, guarda de nuevo el pbix y vuelve a subirlo como el paquete de ejemplo de la oferta.

**"Notes for certification" — paste this into Partner Center's Review and Publish page (this is the English version to actually submit):**

> Repository: https://github.com/tinocallarisa-web/waterfall-advanced-powerbi (access granted to OSDC1033user).
>
> To test: open the included sample .pbix (`modelo waterfall.pbix`) in Power BI Desktop, or import `test-data/waterfall-sample.csv` (short labels) or `test-data/waterfall-sample-longlabels.csv` (long-label wrapping test) and map fields as: Category → Category, Y Axis → Value, Sort Order → SortOrder, Bar Type → BarType ("total" / "delta" / "subtotal"), Target → Target (optional, only present on "total" rows).
>
> Feature checklist for review:
> - Vertical/horizontal orientation toggle (Format pane → Orientation).
> - "Max drivers shown" setting groups extra delta bars into a single "Others" bar.
> - Ctrl/Cmd+click selects multiple bars (cross-filter/cross-highlight).
> - High-contrast mode: switch Power BI to a high-contrast theme; bar colors fall back to the host foreground color.
> - Right-click a bar for the context menu; hover for tooltips.
> - Free tier caps at 8 bars; Pro/Finance tiers (license key) unlock more — contact support@tcviz.com for a test license if gated features need verification.
>
> Build: `npm install && npm run package` (pbiviz 5.x). `tsc --noEmit` passes with no type errors.

*(Versión en español, solo de referencia interna — no la pegues en Partner Center):*

> Repositorio: https://github.com/tinocallarisa-web/waterfall-advanced-powerbi (acceso concedido a OSDC1033user).
>
> Para probar: abre el .pbix de ejemplo incluido (`modelo waterfall.pbix`) en Power BI Desktop, o importa `test-data/waterfall-sample.csv` (etiquetas cortas) o `test-data/waterfall-sample-longlabels.csv` (prueba de ajuste de línea con etiquetas largas) y asigna los campos así: Category → Category, Y Axis → Value, Sort Order → SortOrder, Bar Type → BarType ("total" / "delta" / "subtotal"), Target → Target (opcional, solo presente en filas "total").
>
> Lista de funciones a revisar:
> - Alternar orientación vertical/horizontal (panel de formato → Orientation).
> - El ajuste "Max drivers shown" agrupa las barras delta sobrantes en una única barra "Others".
> - Ctrl/Cmd+clic selecciona varias barras (cross-filter/cross-highlight).
> - Modo alto contraste: cambia Power BI a un tema de alto contraste; los colores de las barras pasan a usar el color de primer plano del host.
> - Clic derecho en una barra para el menú contextual; pasar el cursor para ver los tooltips.
> - El nivel gratuito limita a 8 barras; los niveles Pro/Finance (con clave de licencia) desbloquean más — contactar con support@tcviz.com para una licencia de prueba si hace falta verificar funciones restringidas.
>
> Compilación: `npm install && npm run package` (pbiviz 5.x). `tsc --noEmit` pasa sin errores de tipos.

**Tips & hints — text to add inside the sample .pbix explaining how the visual works (text box on the report page, or a "How it works" page):**

> **Waterfall Advanced — how this chart works**
>
> This waterfall chart shows how different factors add to or subtract from a starting value to reach a final value.
>
> **Bar types (Bar Type field):**
> • **Total** — a bar that starts from zero and shows an absolute value (e.g. the opening or closing result). Drawn as a full bar, not floating.
> • **Delta** — a "floating" bar representing the effect of one factor (e.g. "Price effect" or "Raw material cost"): rises from the previous running total if positive, or drops if negative.
> • **Subtotal** — behaves like a Total bar but marks an intermediate checkpoint (e.g. "Revenue subtotal") without breaking the sequence of deltas that follow.
>
> **What each visual element means:**
> • Bar color indicates whether the effect is positive (increases the value) or negative (decreases it); colors can be inverted or overridden per bar (Color/colorBy field).
> • A **Target** marker appears above Total bars when a target value is supplied, so the actual result can be compared against the expected one.
> • Labels show each bar's value and, optionally, the running total.
>
> **Interactions:**
> • Hover a bar to see its detail tooltip (includes extra fields if the "tooltips" role is configured).
> • Click a bar to cross-filter the rest of the report by that category; hold Ctrl/Cmd and click to select multiple bars at once.
> • Right-click a bar to open the standard Power BI context menu (filter, show as table, etc.).
>
> **Available settings (Format pane):**
> • **Orientation** — switches the chart between vertical and horizontal bars.
> • **Max drivers shown** — when there are many "delta" factors, groups the least significant ones into a single "Others" bar to keep the chart readable, without changing the final total.
> • Colors, font sizes, and the summary card background are configurable.
>
> **Visual tiers:** the free tier supports up to 8 bars; the Pro and Finance tiers (license required) unlock more bars and additional features.
