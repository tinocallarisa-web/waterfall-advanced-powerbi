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
import { mapDataView, sortByImpact, WaterfallBar }  from "./dataMapper";
import { computeBars, computeSummary, ComputedBar, WaterfallSummary } from "./waterfallEngine";
import { WaterfallRenderer, ClickEventData }         from "./renderer";
import { NumberFormatter }                           from "./formatter";
import { getLicenseState, LicenseState }             from "./licenseManager";
import { LicenseOverlay }                            from "./licenseOverlay";
import { generateNarrative }                         from "./aiNarrative";

export class Visual implements IVisual {

    private host:                  IVisualHost;
    private container:             HTMLElement;
    private renderer:              WaterfallRenderer;
    private selectionManager:      ISelectionManager;
    private localization:          ILocalizationManager;
    private formattingSettings:    VisualFormattingSettingsModel;
    private formattingSettingsSvc: FormattingSettingsService;

    private license: LicenseState = {
        tier: "free", isLicensed: false,
        maxBars: 8, hasAI: false, serviceUnavailable: false
    };

    private lastComputed: ComputedBar[]        = [];
    private lastSummary:  WaterfallSummary | null = null;
    private selectionIds: (powerbi.visuals.ISelectionId | null)[] = [];
    private selectedIdx:  number | null = null;
    private lastOptions:  VisualUpdateOptions | null = null;
    private debounceId:   ReturnType<typeof setTimeout> | null = null;

    constructor(options: VisualConstructorOptions) {
        this.host         = options.host;
        this.container    = options.element;
        this.localization = this.host.createLocalizationManager();

        this.container.style.cssText =
            "width:100%;height:100%;overflow:hidden;box-sizing:border-box;" +
            "padding:4px 8px;position:relative";

        this.formattingSettingsSvc = new FormattingSettingsService();
        this.formattingSettings    = new VisualFormattingSettingsModel();
        this.selectionManager      = this.host.createSelectionManager();
        this.renderer              = new WaterfallRenderer(this.container, this.localization);

        getLicenseState(this.host).then((state: LicenseState) => {
            this.license = state;
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
        if (!options.dataViews?.[0]) {
            this.showLandingPage();
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

        if (!isData && !isResize && !isFormatting) return;

        this.lastOptions = options;
        if (this.debounceId) clearTimeout(this.debounceId);
        this.debounceId = setTimeout(() => this.render(options), 300);
    }

    private render(options: VisualUpdateOptions): void {
        const dataView = options.dataViews?.[0];
        if (!dataView) { this.showLandingPage(); return; }

        try {
            this.host.eventService.renderingStarted(options);

            const settings  = this.formattingSettings;
            let rawBars: WaterfallBar[] = mapDataView(dataView);
            if (rawBars.length === 0) { this.showLandingPage(); return; }

            if (settings.chartSettings.sortBars.value) rawBars = sortByImpact(rawBars);

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
                selectedIdx:   this.selectedIdx,
                width,
                height,
                onBarClick:    (data) => this.handleBarClick(data),
                onBarHover:    (data) => this.handleBarHover(data),
                onBarLeave:    ()     => this.host.tooltipService.hide({ immediately: false, isTouchEvent: false })
            });

            if (this.license.tier === "free" && totalBars > this.license.maxBars) {
                LicenseOverlay.applyBarLimit(this.container, totalBars, this.license);
            }

            if (this.license.hasAI) this.renderAIButton(summary, computed);

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

        this.host.tooltipService.show({
            dataItems,
            identities:   selectionId ? [selectionId] : [],
            coordinates:  [clientX - rect.left, clientY - rect.top],
            isTouchEvent: false
        });
    }

    // ── Click (selection) ────────────────────────────────────────────────────

    private handleBarClick(data: ClickEventData): void {
        const { index, selectionId } = data;

        if (this.license.tier === "free" && index >= this.license.maxBars) {
            LicenseOverlay.renderUpgradeBanner(this.container, this.license);
            return;
        }

        if (selectionId) {
            if (this.selectedIdx === index) {
                this.selectedIdx = null; this.selectionManager.clear();
            } else {
                this.selectedIdx = index; this.selectionManager.select(selectionId);
            }
            if (this.lastOptions) this.render(this.lastOptions);
        }
    }

    // ── Context menu ─────────────────────────────────────────────────────────

    // Context menu ahora se maneja en el constructor sobre this.container (ver arriba)

    // ── AI Narrative ─────────────────────────────────────────────────────────

    private renderAIButton(summary: WaterfallSummary, bars: ComputedBar[]): void {
        const existing = this.container.querySelector(".wf-ai-btn");
        if (existing) existing.remove();

        const btn = document.createElement("button");
        btn.className   = "wf-ai-btn";
        btn.textContent = "✦ Generate narrative";
        btn.style.cssText =
            "position:absolute;top:6px;right:8px;background:linear-gradient(135deg,#5B4FCF,#378ADD);" +
            "color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:10px;" +
            "font-family:Segoe UI,sans-serif;cursor:pointer;z-index:20;font-weight:500;" +
            "box-shadow:0 1px 4px rgba(0,0,0,0.15);transition:opacity 0.15s";

        btn.addEventListener("mouseenter", () => btn.style.opacity = "0.85");
        btn.addEventListener("mouseleave", () => btn.style.opacity = "1");
        btn.addEventListener("click", () => this.handleAIClick(btn));
        this.container.appendChild(btn);
    }

    private async handleAIClick(btn: HTMLButtonElement): Promise<void> {
        if (!this.lastSummary) return;
        btn.textContent = "⏳ Generating...";
        btn.style.opacity = "0.7";
        btn.disabled = true;

        const fmt    = new NumberFormatter(this.formattingSettings);
        const result = await generateNarrative(this.lastComputed, this.lastSummary, this.formattingSettings, fmt);

        btn.textContent = "✦ Generate narrative";
        btn.style.opacity = "1";
        btn.disabled = false;

        this.showNarrativePanel(result.error ? `⚠ ${result.error}` : result.text, !!result.error);
    }

    private showNarrativePanel(text: string, isError: boolean): void {
        const existing = this.container.querySelector(".wf-narrative-panel");
        if (existing) existing.remove();

        const cardsVisible  = this.formattingSettings.chartSettings.showVarianceCards.value;
        const bottomOffset  = cardsVisible ? "82px" : "0";

        const panel = document.createElement("div");
        panel.className = "wf-narrative-panel";
        panel.style.cssText =
            `position:absolute;bottom:${bottomOffset};left:0;right:0;` +
            "background:#fff;border-top:2px solid #378ADD;" +
            "padding:10px 14px;font-family:Segoe UI,sans-serif;font-size:11px;" +
            `line-height:1.6;color:${isError ? "#E24B4A" : "#252423"};` +
            "box-shadow:0 -2px 8px rgba(0,0,0,0.08);z-index:15;" +
            "max-height:28%;overflow-y:auto;box-sizing:border-box";

        const header = document.createElement("div");
        header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:6px";
        const title = document.createElement("span");
        title.style.cssText = "font-size:9px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.5px";
        title.textContent = "✦ AI Executive Narrative";
        header.appendChild(title);
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "✕";
        closeBtn.style.cssText = "background:none;border:none;cursor:pointer;color:#888;font-size:12px;padding:0";
        closeBtn.addEventListener("click", () => panel.remove());
        header.appendChild(closeBtn);
        panel.appendChild(header);

        const content = document.createElement("p");
        content.style.cssText = "margin:0";
        content.textContent = text;
        panel.appendChild(content);

        if (!isError) {
            const provider  = this.formattingSettings.aiSettings.aiProvider.value.value as string;
            const badge     = document.createElement("div");
            badge.style.cssText = "margin-top:6px;font-size:9px;color:#bbb;text-align:right";
            badge.textContent   = `Generated by ${provider === "anthropic" ? "Claude (Anthropic)" : "GPT (OpenAI)"}`;
            panel.appendChild(badge);
        }

        this.container.appendChild(panel);
    }

    // ── Selection IDs ─────────────────────────────────────────────────────────

    private buildSelectionIds(dataView: powerbi.DataView, bars: ComputedBar[]):
            (powerbi.visuals.ISelectionId | null)[] {
        const catCol = dataView.categorical?.categories?.find(c => c.source?.roles?.["category"]);
        if (!catCol) return bars.map(() => null);
        return bars.map((_, i) => {
            try {
                return this.host.createSelectionIdBuilder().withCategory(catCol, i).createSelectionId();
            } catch { return null; }
        });
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

        if (this.license.tier === "free") {
            const badge = document.createElement("div");
            badge.style.cssText = "font-size:9px;background:#f0f0ee;border-radius:4px;padding:2px 8px;color:#888;font-family:Segoe UI,sans-serif;letter-spacing:.5px";
            badge.textContent = "FREE · 8 bars max";
            wrapper.appendChild(badge);
        }

        this.container.appendChild(wrapper);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsSvc.buildFormattingModel(this.formattingSettings);
    }
}
