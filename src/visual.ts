import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions       = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual                   = powerbi.extensibility.visual.IVisual;
import IVisualHost               = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager         = powerbi.extensibility.ISelectionManager;
import ILocalizationManager      = powerbi.extensibility.ILocalizationManager;
import VisualUpdateType          = powerbi.VisualUpdateType;

import { VisualFormattingSettingsModel }            from "./settings";
import { mapDataView, sortByImpact, applyTopN, WaterfallBar }  from "./dataMapper";
import { computeBars, computeSummary, ComputedBar, WaterfallSummary } from "./waterfallEngine";
import { WaterfallRenderer, ClickEventData }         from "./renderer";
import { NumberFormatter }                           from "./formatter";
import { getLicenseState, LicenseState, LicenseNotifier, FREE_STATE } from "./licenseManager";
import { LicenseOverlay }                            from "./licenseOverlay";

/**
 * Sello de compilacion. Vacio en produccion; build-test.js lo rellena con la
 * fecha y hora en las builds de prueba.
 *
 * Existe porque las builds de test comparten guid y numero de version entre
 * recompilaciones, asi que Power BI Desktop puede seguir sirviendo la que
 * importaste hace media hora sin que nada lo indique. Dos veces hemos perseguido
 * un fallo que ya estaba corregido en el paquete que no estaba cargado.
 */
const BUILD_MARKER = "";

export class Visual implements IVisual {

    private host:                  IVisualHost;
    private container:             HTMLElement;
    private renderer:              WaterfallRenderer;
    private selectionManager:      ISelectionManager;
    private localization:          ILocalizationManager;
    private formattingSettings:    VisualFormattingSettingsModel;
    private formattingSettingsSvc: FormattingSettingsService;

    // Una sola fuente para el limite. resolved queda en false hasta que la
    // licencia responde: es lo que impide notificar nada en el primer pintado,
    // cuando todavia no se sabe si el usuario ha pagado.
    private license: LicenseState = { ...FREE_STATE, resolved: false };
    private notifier: LicenseNotifier | null = null;

    private lastComputed: ComputedBar[]        = [];
    private lastSummary:  WaterfallSummary | null = null;
    private selectionIds: (powerbi.visuals.ISelectionId | null)[] = [];
    private selectedIndices: Set<number> = new Set<number>();
    private lastOptions:  VisualUpdateOptions | null = null;
    private pendingOptions: VisualUpdateOptions | null = null;
    private debounceId:   ReturnType<typeof setTimeout> | null = null;

    constructor(options: VisualConstructorOptions) {
        this.host         = options.host;
        this.container    = options.element;
        this.localization = this.host.createLocalizationManager();

        this.container.style.cssText =
            "width:100%;height:100%;overflow:hidden;box-sizing:border-box;" +
            "padding:4px 8px;position:relative";
        this.container.style.pointerEvents = this.host.hostCapabilities.allowInteractions === false
            ? "none" : "auto";

        this.formattingSettingsSvc = new FormattingSettingsService();
        this.formattingSettings    = new VisualFormattingSettingsModel();
        this.selectionManager      = this.host.createSelectionManager();
        this.renderer              = new WaterfallRenderer(this.container, this.localization);

        this.notifier = new LicenseNotifier(this.host);
        getLicenseState(this.host).then((state: LicenseState) => {
            this.license = state;
            // Repintar es el punto: la licencia resuelve despues del primer
            // render, asi que sin esto un cliente que ha pagado se queda con el
            // tier gratuito hasta que Power BI vuelva a llamar a update().
            if (this.lastOptions) this.render(this.lastOptions);
        });

        // FIX: listener de contextmenu en el container estable (no se destruye en cada render)
        this.container.addEventListener("contextmenu", (event: MouseEvent) => {
            event.preventDefault();
            const target = event.target as Element;
            const barIndex = target?.getAttribute?.("data-bar-index");
            const selId = barIndex != null
                ? this.selectionIds[Number(barIndex)] ?? {}
                : {};
            this.selectionManager.showContextMenu(selId, {
                x: event.clientX,
                y: event.clientY
            });
        });

        this.showLandingPage();
    }

    public update(options: VisualUpdateOptions): void {
        // FIX: renderingStarted SIEMPRE se llama de inmediato, 1:1 con cada update()
        this.host.eventService.renderingStarted(options);

        if (!options.dataViews?.[0]) {
            this.showLandingPage();
            this.renderBuildMarker();
            this.host.eventService.renderingFinished(options);
            return;
        }

        this.formattingSettings = this.formattingSettingsSvc.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            options.dataViews[0]
        );

        const type         = options.type;
        const isData       = (type & VisualUpdateType.Data)   !== 0;
        const isResize     = (type & VisualUpdateType.Resize) !== 0;
        const isFormatting = (type & VisualUpdateType.Style)  !== 0;

        if (!isData && !isResize && !isFormatting) {
            this.host.eventService.renderingFinished(options);
            return;
        }

        this.lastOptions = options;

        // FIX: si había un render pendiente por debounce, lo marcamos como finished
        // (no failed — fue intencionalmente superseded, no un error)
        if (this.debounceId) {
            clearTimeout(this.debounceId);
            if (this.pendingOptions) {
                this.host.eventService.renderingFinished(this.pendingOptions);
            }
        }

        this.pendingOptions = options;
        this.debounceId = setTimeout(() => {
            this.pendingOptions = null;
            this.render(options);
        }, 300);
    }

    private render(options: VisualUpdateOptions): void {
        const dataView = options.dataViews?.[0];
        if (!dataView) {
            this.showLandingPage();
            this.host.eventService.renderingFinished(options);
            return;
        }

        try {
            const settings  = this.formattingSettings;
            let rawBars: WaterfallBar[] = mapDataView(dataView);
            if (rawBars.length === 0) {
                this.showLandingPage();
                this.host.eventService.renderingFinished(options);
                return;
            }

            if (settings.chartSettings.sortBars.value) rawBars = sortByImpact(rawBars);

            const otherLabel  = settings.chartSettings.otherLabel.value || "Others";
            const driversInData = rawBars.filter(b => b.barType === "delta").length;

            // El limite del tier gratuito AGRUPA, no recorta.
            //
            // Recortar deja un bridge que no cuadra: la ultima barra ya no es la
            // suma de las anteriores, y un lector que no sepa que hay un limite
            // ve un grafico simplemente mal. Agrupando el resto en "Others" el
            // puente sigue cerrando y las cifras siguen siendo correctas; lo que
            // se pierde es granularidad, que es una razon legitima para pagar.
            const userMax = settings.chartSettings.maxCategories.value;
            const freeMax = this.license.isLicensed ? 0 : this.license.maxBars;
            const effectiveMax = userMax > 0 && freeMax > 0 ? Math.min(userMax, freeMax)
                               : userMax > 0 ? userMax : freeMax;

            const groupedByTier = freeMax > 0 && driversInData > freeMax;
            if (effectiveMax > 0) {
                rawBars = applyTopN(rawBars, effectiveMax, otherLabel);
            }

            const totalBars      = rawBars.length;
            const computed       = computeBars(rawBars);
            const summary        = computeSummary(computed);
            this.lastComputed    = computed;
            this.lastSummary     = summary;
            this.selectionIds    = this.buildSelectionIds(dataView, computed);

            const vp     = options.viewport;
            const width  = Math.max(100, vp.width  - 16);
            const height = Math.max(60,  vp.height - 8);

            this.renderer.render({
                container:     this.container,
                bars:          computed,
                summary,
                settings,
                selectionIds:  this.selectionIds,
                selectedIndices: this.selectedIndices,
                isLicensed:    this.license.isLicensed,
                highContrast: this.host.colorPalette.isHighContrast,
                contrastForeground: this.host.colorPalette.foreground.value,
                contrastBackground: this.host.colorPalette.background.value,
                width,
                height,
                onBarClick:    (data) => this.handleBarClick(data),
                onBarHover:    (data) => this.handleBarHover(data),
                onBarLeave:    ()     => this.host.tooltipService.hide({ immediately: false, isTouchEvent: false })
            });

            // La nota dice cuantos drivers se han agrupado, que es informacion
            // sobre el grafico; la ruta de compra la pone Power BI con su propia
            // notificacion.
            LicenseOverlay.renderGroupingNote(this.container, driversInData, this.license, groupedByTier, otherLabel);
            // Ajustes de pago que el usuario ha tocado de verdad. Se leen de
            // metadata.objects, que solo contiene lo que se ha fijado
            // explicitamente: asi el aviso no salta en un informe que nadie ha
            // configurado.
            const setObjects: any = options.dataViews?.[0]?.metadata?.objects;
            const touchedPro: string[] = [];
            const lbl = setObjects?.labelSettings;
            if (lbl?.labelRotation !== undefined)   touchedPro.push("label angle");
            if (lbl?.labelMaxChars !== undefined)   touchedPro.push("label truncation");
            if (lbl?.hideOverlapping !== undefined) touchedPro.push("hiding labels that do not fit");
            if (setObjects?.ibcs?.mode !== undefined) touchedPro.push("IBCS mode");

            const needsLicence = groupedByTier || touchedPro.length > 0;
            this.notifier?.required(this.license, needsLicence);
            if (touchedPro.length) {
                this.notifier?.blocked(this.license, touchedPro.join(", "));
            } else if (groupedByTier) {
                this.notifier?.blocked(this.license, `${driversInData} individual drivers`);
            }

            this.host.eventService.renderingFinished(options);

        } catch (e) {
            this.host.eventService.renderingFailed(options, String(e));
        }
    }

    // ── Tooltip on hover ─────────────────────────────────────────────────────

    private handleBarHover(data: ClickEventData): void {
        const { bar, clientX, clientY, selectionId } = data;
        const rect = this.container.getBoundingClientRect();
        const fmt  = new NumberFormatter(this.formattingSettings);
        const loc  = this.localization;

        const fb: Record<string, string> = {
            varianceVal: "Variance", pctVsBase: "% vs base",
            target: "Target", targetGap: "Target gap", type: "Type"
        };
        const g = (k: string) => { const v = loc.getDisplayName(k); return (v && v !== k) ? v : (fb[k] ?? k); };

        const isTotal = bar.barType === "total" || bar.barType === "subtotal";
        const dataItems: powerbi.extensibility.VisualTooltipDataItem[] = [
            { displayName: bar.label, value: fmt.format(isTotal ? bar.top : bar.value) }
        ];

        if (!isTotal) {
            dataItems.push({ displayName: g("varianceVal"), value: fmt.formatDelta(bar.value) });
            dataItems.push({ displayName: g("pctVsBase"),   value: (bar.deltaRel >= 0 ? "+" : "") + bar.deltaRel.toFixed(1) + "%" });
        }
        if (bar.target != null) {
            dataItems.push({ displayName: g("target"),    value: fmt.format(bar.target) });
            dataItems.push({ displayName: g("targetGap"), value: fmt.formatDelta(bar.top - bar.target) });
        }
        dataItems.push({ displayName: g("type"), value: bar.barType });
        (bar.tooltipItems ?? []).forEach(item => dataItems.push(item));

        this.host.tooltipService.show({
            dataItems,
            identities:   selectionId ? [selectionId] : [],
            coordinates:  [clientX - rect.left, clientY - rect.top],
            isTouchEvent: false
        });
    }

    // ── Click (selection) ────────────────────────────────────────────────────

    private handleBarClick(data: ClickEventData): void {
        const { index, selectionId, multiSelect } = data;

        if (!this.license.isLicensed && index >= this.license.maxBars) {
            this.notifier?.blocked(this.license, "categories beyond the free limit");
            return;
        }

        if (selectionId) {
            if (multiSelect) {
                if (this.selectedIndices.has(index)) this.selectedIndices.delete(index);
                else this.selectedIndices.add(index);
            } else if (this.selectedIndices.size === 1 && this.selectedIndices.has(index)) {
                // Click de nuevo sobre la única barra seleccionada -> deseleccionar
                this.selectedIndices = new Set();
            } else {
                this.selectedIndices = new Set([index]);
            }

            if (this.selectedIndices.size === 0) {
                this.selectionManager.clear();
            } else if (multiSelect) {
                this.selectionManager.select(selectionId, true);
            } else {
                this.selectionManager.select(selectionId, false);
            }
            if (this.lastOptions) this.render(this.lastOptions);
        }
    }

    // ── Context menu ─────────────────────────────────────────────────────────

    // Context menu ahora se maneja en el constructor sobre this.container (ver arriba)

    // ── Selection IDs ─────────────────────────────────────────────────────────

    private buildSelectionIds(dataView: powerbi.DataView, bars: ComputedBar[]):
            (powerbi.visuals.ISelectionId | null)[] {
        const catCol = dataView.categorical?.categories?.find(c => c.source?.roles?.["category"]);
        if (!catCol) return bars.map(() => null);
        return bars.map((bar) => {
            if (bar.sourceIndex == null) return null;
            try {
                return this.host.createSelectionIdBuilder().withCategory(catCol, bar.sourceIndex).createSelectionId();
            } catch { return null; }
        });
    }

    /** Sello de compilacion, solo en builds de prueba. */
    private renderBuildMarker(): void {
        if (!BUILD_MARKER) return;
        this.container.querySelectorAll(".wf-build-marker").forEach(n => n.remove());
        const m = document.createElement("div");
        m.className = "wf-build-marker";
        m.style.cssText =
            "position:absolute;left:4px;bottom:2px;z-index:30;pointer-events:none;" +
            "font:9px Segoe UI,sans-serif;color:#B0A0C0;opacity:.8";
        m.textContent = "build " + BUILD_MARKER;
        this.container.appendChild(m);
    }

    // ── Landing page ──────────────────────────────────────────────────────────

    private showLandingPage(): void {
        while (this.container.firstChild) this.container.removeChild(this.container.firstChild);

        const wrapper = document.createElement("div");
        wrapper.style.cssText =
            "display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;opacity:0.6";

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "64"); svg.setAttribute("height", "48");
        svg.setAttribute("viewBox", "0 0 64 48");
        const barsData: [number, number, number, number, string][] = [
            [2, 16, 14, 30, "#378ADD"], [18, 10, 14, 36, "#1D9E75"],
            [34, 18, 14, 28, "#1D9E75"], [50, 22, 14, 24, "#E24B4A"],
        ];
        barsData.forEach(([x, y, w, h, fill]) => {
            const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            r.setAttribute("x", String(x)); r.setAttribute("y", String(y));
            r.setAttribute("width", String(w)); r.setAttribute("height", String(h));
            r.setAttribute("rx", "2"); r.setAttribute("fill", fill); r.setAttribute("opacity", "0.7");
            svg.appendChild(r);
        });
        wrapper.appendChild(svg);

        const title = document.createElement("p");
        title.style.cssText = "margin:0;font-size:13px;font-weight:500;color:currentColor;font-family:Segoe UI,sans-serif";
        title.textContent = "Waterfall Advanced";
        wrapper.appendChild(title);

        const hint = document.createElement("p");
        hint.style.cssText = "margin:0;font-size:11px;color:currentColor;font-family:Segoe UI,sans-serif;text-align:center;max-width:180px";
        hint.textContent = this.localization.getDisplayName("landingHint") ||
            "Connect Category and Value to render the waterfall";
        wrapper.appendChild(hint);

        // Aqui no va ningun distintivo de tier.
        //
        // Decia "FREE - 8 bars max" y era el tercer sitio donde el limite estaba
        // escrito a mano, asi que seguia diciendo 8 cuando el limite ya era 12.
        // Pero el problema de fondo no era el numero: una pantalla de bienvenida
        // tiene que decir que hacer -conectar Categoria y Valor-, no lo que al
        // usuario le falta, y menos antes de que haya conectado un solo campo.
        // Es UI de licencia propia en el peor momento posible.
        //
        // Cuando hay datos y el limite muerde de verdad, la nota de agrupacion lo
        // dice con la cifra correcta, y la ruta de compra la pone Power BI.

        this.container.appendChild(wrapper);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsSvc.buildFormattingModel(this.formattingSettings);
    }
}
