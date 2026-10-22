import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService, formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import {
    HtmlSubSelectableClass, HtmlSubSelectionHelper, SubSelectableDisplayNameAttribute,
    SubSelectableObjectNameAttribute, SubSelectableTypeAttribute,
} from "powerbi-visuals-utils-onobjectutils";
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions       = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual                   = powerbi.extensibility.visual.IVisual;
import IVisualHost               = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager         = powerbi.extensibility.ISelectionManager;
import ILocalizationManager      = powerbi.extensibility.ILocalizationManager;
import VisualUpdateType          = powerbi.VisualUpdateType;

import { VisualFormattingSettingsModel, TEMPLATES }  from "./settings";
import { mapDataView, sortByImpact, applyTopN, WaterfallBar }  from "./dataMapper";
import { computeBars, computeSummary, ComputedBar, WaterfallSummary } from "./waterfallEngine";
import { WaterfallRenderer, ClickEventData }         from "./renderer";
import { NumberFormatter }                           from "./formatter";
import { getLicenseState, LicenseState, LicenseNotifier, FREE_STATE } from "./licenseManager";
import { LicenseOverlay }                            from "./licenseOverlay";
import { STRINGS }                                   from "./strings";
import { LANDING_ICON }                              from "./landingIcon";

/**
 * Sello de compilacion. Vacio en produccion; build-test.js lo rellena con la
 * fecha y hora en las builds de prueba.
 *
 * Existe porque las builds de test comparten guid y numero de version entre
 * recompilaciones, asi que Power BI Desktop puede seguir sirviendo la que
 * importaste hace media hora sin que nada lo indique.
 */
const BUILD_MARKER = "";

const URL_GUIDE = "https://tinocallarisa-web.github.io/waterfall-advanced-powerbi/support.html";
const URL_PRODUCT = "https://tcviz.com/product/waterfall-pro/?ref=visual-waterfall";
const URL_VIDEO = "https://www.youtube.com/watch?v=zDxpsXMD3WM";

export class Visual implements IVisual {

    private host:                  IVisualHost;
    private container:             HTMLElement;
    private renderer:              WaterfallRenderer;
    private selectionManager:      ISelectionManager;
    private localization:          ILocalizationManager;
    private formattingSettings:    VisualFormattingSettingsModel;
    private formattingSettingsSvc: FormattingSettingsService;
    private subSelectionHelper:    HtmlSubSelectionHelper;
    public visualOnObjectFormatting: powerbi.extensibility.visual.VisualOnObjectFormatting;

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
    private editing = false;
    private formatMode = false;
    /** Última plantilla vista: al cambiarla editando se aplica de verdad (aplicarPlantilla). */
    private tplVisto: string | null = null;
    private fmt: NumberFormatter | null = null;

    constructor(options: VisualConstructorOptions) {
        this.host         = options.host;
        this.container    = options.element;
        this.localization = this.host.createLocalizationManager();

        this.container.style.cssText =
            "width:100%;height:100%;overflow:hidden;box-sizing:border-box;" +
            "padding:4px 8px;position:relative";
        this.container.classList.add("wf");

        // CON el gestor de localizacion: sin el, las claves del panel no se resuelven y sale en ingles.
        this.formattingSettingsSvc = new FormattingSettingsService(this.localization);
        this.formattingSettings    = new VisualFormattingSettingsModel();
        this.selectionManager      = this.host.createSelectionManager();
        this.renderer              = new WaterfallRenderer(this.container, this.localization);

        // Bookmarks. Power BI llama aqui cuando un marcador -o el panel de
        // seleccion, o un boton de "borrar filtros"- restaura una seleccion desde
        // fuera del visual. Solo repinta: sin eventos de render ni persistProperties.
        this.selectionManager.registerOnSelectCallback(
            (ids: powerbi.extensibility.ISelectionId[]) => {
                this.selectedIndices = this.indicesFromSelection(ids);
                if (this.lastOptions) this.draw(this.lastOptions);
            });

        this.notifier = new LicenseNotifier(this.host);
        getLicenseState(this.host).then((state: LicenseState) => {
            this.license = state;
            // Repintar es el punto: la licencia resuelve despues del primer render. Sin eventos: no es un update().
            if (this.lastOptions) this.draw(this.lastOptions);
        });

        // Menú contextual en el contenedor estable (no se destruye en cada render)
        this.container.addEventListener("contextmenu", (event: MouseEvent) => {
            event.preventDefault();
            if (this.formatMode) return;
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

        this.subSelectionHelper = HtmlSubSelectionHelper.createHtmlSubselectionHelper({
            hostElement: options.element,
            subSelectionService: options.host.subSelectionService,
            selectionIdCallback: () => undefined,
        });
        this.visualOnObjectFormatting = {
            getSubSelectionStyles: (subs) => this.getSubSelectionStyles(subs),
            getSubSelectionShortcuts: (subs) => this.getSubSelectionShortcuts(subs),
            getSubSelectables: (filter) => this.subSelectionHelper.getAllSubSelectables(filter),
        };
    }

    // ── Textos ───────────────────────────────────────────────────────────────

    /** Texto por clave: primero la tabla del bundle (Desktop no traduce claves que no estén en capabilities). */
    private t(key: string, fallback: string): string {
        const loc = String(this.host?.locale || "");
        const tabla = STRINGS[loc] || STRINGS[Object.keys(STRINGS).find(l => l.slice(0, 2) === loc.slice(0, 2)) || ""];
        if (tabla && tabla[key]) return tabla[key];
        try {
            const s = this.localization?.getDisplayName(key);
            return s && s !== key ? s : fallback;
        } catch { return fallback; }
    }

    private tf(key: string, fallback: string, ...args: string[]): string {
        return this.t(key, fallback).replace(/\{(\d+)\}/g, (_m, i) => args[Number(i)] ?? "");
    }

    private interactionsAllowed(): boolean {
        const h = this.host as any;
        return (h?.hostCapabilities?.allowInteractions ?? h?.allowInteractions) !== false;
    }

    // ── Update: eventos de render 1:1 ────────────────────────────────────────

    public update(options: VisualUpdateOptions): void {
        // Un renderingStarted y un renderingFinished/Failed por cada update(). Los repintados que no vienen de
        // update() (licencia, clic, marcadores) usan draw(), que no emite eventos (rechazo 1200.1.2 de Likert).
        this.host.eventService.renderingStarted(options);

        const viewMode = (options as any).viewMode;
        this.editing = typeof viewMode === "number" && viewMode !== 0;
        this.formatMode = !!(options as any).formatMode;
        this.subSelectionHelper.setFormatMode(this.formatMode);
        this.container.classList.toggle("fmt", this.formatMode);
        this.container.style.pointerEvents = this.interactionsAllowed() ? "auto" : "none";
        const pal: any = this.host.colorPalette;
        this.container.style.setProperty("--wf-focus", pal?.isHighContrast ? (pal.foregroundSelected?.value || pal.foreground?.value || "#FFFF00") : "#005A9E");

        if (!options.dataViews?.[0]) {
            this.lastOptions = options;
            this.showLandingPage(options.viewport);
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
        // 64 = FormattingSubSelectionChange (const enum que no todas las versiones de la API exponen)
        const isMode       = (type & VisualUpdateType.ViewMode) !== 0 || (type & 64) !== 0;

        if (!isData && !isResize && !isFormatting && !isMode && this.lastOptions) {
            // Nada que repintar, pero el modo de formato y las subselecciones sí pueden haber cambiado.
            this.lastOptions = options;
            this.markSubSelectables();
            if (this.formatMode) this.subSelectionHelper.updateOutlinesFromSubSelections((options as any).subSelections ?? [], true);
            this.host.eventService.renderingFinished(options);
            return;
        }

        this.lastOptions = options;

        // Si había un render pendiente por debounce, se da por terminado (no fallido: fue sustituido).
        if (this.debounceId) {
            clearTimeout(this.debounceId);
            if (this.pendingOptions) {
                this.host.eventService.renderingFinished(this.pendingOptions);
            }
        }

        this.pendingOptions = options;
        this.debounceId = setTimeout(() => {
            this.pendingOptions = null;
            this.debounceId = null;
            try {
                this.draw(options);
                this.host.eventService.renderingFinished(options);
            } catch (e) {
                this.host.eventService.renderingFailed(options, String(e));
            }
        }, 300);
    }

    // ── Dibujo (sin eventos de render) ───────────────────────────────────────

    private draw(options: VisualUpdateOptions): void {
        const dataView = options.dataViews?.[0];
        if (!dataView) { this.showLandingPage(options.viewport); return; }

        const settings  = this.formattingSettings;
        let rawBars: WaterfallBar[] = mapDataView(dataView);
        if (rawBars.length === 0) { this.showLandingPage(options.viewport); return; }

        // Plantillas: lo no fijado toma el valor de la plantilla; al ELEGIR una, se borra lo que define.
        const objs: any = dataView.metadata?.objects ?? {};
        const tpl = String(objs?.style?.template ?? "classic");
        this.applyTemplateDefaults(tpl, objs);
        if (this.editing && this.tplVisto !== null && this.tplVisto !== tpl) this.aplicarPlantilla(tpl);
        this.tplVisto = tpl;

        if (settings.chartSettings.sortBars.value) rawBars = sortByImpact(rawBars);

        const otherLabel  = settings.chartSettings.otherLabel.value || this.t("UI_Others", "Others");
        const driversInData = rawBars.filter(b => b.barType === "delta").length;

        // El limite del tier gratuito AGRUPA, no recorta: el puente sigue cerrando y las cifras siguen siendo
        // correctas; lo que se pierde es granularidad, que es una razon legitima para pagar.
        const userMax = settings.chartSettings.maxCategories.value;
        const freeMax = this.license.isLicensed ? 0 : this.license.maxBars;
        const effectiveMax = userMax > 0 && freeMax > 0 ? Math.min(userMax, freeMax)
                           : userMax > 0 ? userMax : freeMax;

        const groupedByTier = freeMax > 0 && driversInData > freeMax;
        if (effectiveMax > 0) {
            rawBars = applyTopN(rawBars, effectiveMax, otherLabel);
        }

        const computed       = computeBars(rawBars);
        const summary        = computeSummary(computed);
        this.lastComputed    = computed;
        this.lastSummary     = summary;
        this.selectionIds    = this.buildSelectionIds(dataView, computed);

        // Ajustes de pago que el usuario ha tocado de verdad (metadata.objects: solo lo fijado explicitamente).
        // El valor forma parte de la huella: cambiar el angulo de -30 a -45 tiene que volver a avisar.
        const lbl = objs?.labelSettings;
        const touched: { label: string; key: string; kind: "density" | "ibcs" | "table" }[] = [];
        const add = (v: any, label: string, kind: "density" | "ibcs" | "table") => {
            if (v !== undefined && v !== false && v !== 0 && v !== "0") touched.push({ label, key: `${label}=${JSON.stringify(v)}`, kind });
        };
        add(lbl?.labelRotation,             this.t("Pro_Angle", "label angle"), "density");
        add(lbl?.labelMaxChars,             this.t("Pro_Truncate", "label truncation"), "density");
        add(lbl?.hideOverlapping,           this.t("Pro_Hide", "hiding labels that do not fit"), "density");
        add(objs?.ibcs?.mode,               this.t("Pro_Ibcs", "IBCS mode"), "ibcs");
        add(objs?.tableSettings?.show,      this.t("Pro_Table", "the data table"), "table");

        // Vista previa Pro: editando, con la licencia ya resuelta y legible. Lo Pro que el autor ha encendido se
        // dibuja con marca de agua; en lectura, o donde la licencia no se lee, el resultado gratuito.
        const licensed = this.license.isLicensed;
        const preview = !licensed && this.editing && this.license.resolved && !this.license.serviceUnavailable;
        const on = (kind: string) => licensed || (preview && touched.some(x => x.kind === kind));

        const vp     = options.viewport;
        const width  = Math.max(100, vp.width  - 16);
        const height = Math.max(60,  vp.height - 8);

        const cats = dataView.categorical?.categories ?? [];
        const catCol = cats.find(c => c.source?.roles?.["category"]);
        const measureCol = (dataView.categorical?.values ? Array.from(dataView.categorical.values) : [])
            .find(v => v.source?.roles?.["measure"]);
        let colFmt: string | undefined;
        try { colFmt = measureCol ? (valueFormatter.getFormatStringByColumn(measureCol.source as any) || measureCol.source.format || undefined) : undefined; }
        catch { colFmt = measureCol?.source?.format; }
        this.fmt = new NumberFormatter(settings, this.host.locale, colFmt);

        this.renderer.render({
            container:     this.container,
            bars:          computed,
            summary,
            settings,
            selectionIds:  this.selectionIds,
            selectedIndices: this.selectedIndices,
            isLicensed:    licensed,
            proTable:      on("table"),
            proIbcs:       on("ibcs"),
            proDensity:    on("density"),
            fmt:           this.fmt,
            t:             (k, f) => this.t(k, f),
            measureName:   measureCol?.source?.displayName ?? "",
            categoryName:  catCol?.source?.displayName ?? "",
            highContrast: this.host.colorPalette.isHighContrast,
            contrastForeground: this.host.colorPalette.foreground.value,
            contrastBackground: this.host.colorPalette.background.value,
            width,
            height,
            onBarClick:    (data) => this.handleBarClick(data),
            onBarHover:    (data) => this.handleBarHover(data),
            onBarLeave:    ()     => this.host.tooltipService.hide({ immediately: false, isTouchEvent: false })
        });

        // La nota dice cuantos drivers se han agrupado, que es informacion sobre el grafico; la ruta de compra la
        // pone Power BI con su propia notificacion.
        LicenseOverlay.renderGroupingNote(this.container, driversInData, this.license, groupedByTier, otherLabel,
            (n, g, o) => this.tf("UI_Grouped", "{0} largest drivers shown · {1} grouped into \"{2}\"", String(n), String(g), o));

        const needsLicence = groupedByTier || touched.length > 0;
        this.notifier?.required(this.license, needsLicence);
        if (touched.length) {
            this.notifier?.blocked(
                this.license,
                this.tf("UI_ProBlocked", "Waterfall Advanced: {0} — part of the Pro plan.", touched.map(x => x.label).join(", ")),
                touched.map(x => x.key).sort().join("|"));
        } else if (groupedByTier) {
            this.notifier?.blocked(
                this.license,
                this.tf("UI_ProDrivers", "Waterfall Advanced: showing all {0} drivers individually is part of the Pro plan.", String(driversInData)),
                `grouped:${driversInData}`);
        }

        this.renderWatermark(preview && touched.length > 0 ? touched.map(x => x.label) : []);
        this.renderGuide(vp, preview);
        this.renderBuildMarker();
        this.markSubSelectables();
        if (this.formatMode) this.subSelectionHelper.updateOutlinesFromSubSelections((options as any).subSelections ?? [], true);
    }

    // ── Plantillas ───────────────────────────────────────────────────────────

    private applyTemplateDefaults(tpl: string, objs: any): void {
        const tp = TEMPLATES[tpl];
        if (!tp) return;
        Object.keys(tp).forEach(obj => {
            const card: any = (this.formattingSettings.cards as any[]).find(c => c.name === obj);
            if (!card) return;
            Object.keys(tp[obj]).forEach(prop => {
                if (objs?.[obj]?.[prop] !== undefined) return;
                const sl: any = (card.slices ?? []).find((x: any) => x.name === prop);
                if (!sl) return;
                sl.value = sl instanceof formattingSettings.ColorPicker ? { value: String(tp[obj][prop]) } : tp[obj][prop];
            });
        });
    }

    /** Al ELEGIR una plantilla se borran los ajustes guardados que ella define, para que se vea. */
    private aplicarPlantilla(nombre: string): void {
        const tp = TEMPLATES[nombre] ?? {};
        const remove: any[] = Object.keys(tp).map(obj => ({
            objectName: obj, selector: null as any,
            properties: Object.keys(tp[obj]).reduce((acc: any, p) => { acc[p] = null; return acc; }, {})
        }));
        if (remove.length) this.host.persistProperties({ remove });
    }

    private persistir(objectName: string, properties: any): void {
        this.host.persistProperties({ merge: [{ objectName, selector: null as any, properties }] });
    }

    // ── Vista previa Pro: marca de agua ──────────────────────────────────────

    /** "Pro preview" y debajo lo que la ha encendido. Con DOM y textContent, nunca innerHTML. */
    private renderWatermark(labels: string[]): void {
        this.container.querySelectorAll(".wf-watermark").forEach(n => n.remove());
        if (!labels.length) return;
        const capa = document.createElement("div");
        capa.className = "wf-watermark";
        capa.setAttribute("aria-hidden", "true");
        capa.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
            "gap:4px;pointer-events:none;z-index:35;opacity:0.72;transform:rotate(-20deg);font-family:'Segoe UI',sans-serif";
        const w = this.container.clientWidth || 300, h = this.container.clientHeight || 200;
        const fs = Math.round(Math.max(20, Math.min(72, w / 8, h / 3.5)));
        const linea = (texto: string, px: number) => {
            const el = document.createElement("div");
            el.textContent = texto;
            el.style.cssText = `font-size:${px}px;font-weight:700;letter-spacing:0.06em;color:#FFFFFF;text-align:center;` +
                "text-shadow:0 0 3px #1B2A41,0 0 3px #1B2A41,0 0 3px #1B2A41";
            capa.appendChild(el);
        };
        linea(this.t("UI_ProPreview", "Pro preview"), fs);
        linea(labels.join(" · "), Math.round(fs * 0.34));
        this.container.appendChild(capa);
    }

    // ── Guía (consejos de configuración, solo editando) ──────────────────────

    /**
     * Barra de consejos abajo, solo editando, con datos y si cabe: plantillas en un clic y las funciones Pro para
     * probarlas con tus datos (sin licencia, bajo la marca de agua). persistProperties solo desde un clic. ✕ la
     * cierra (style.guide = false); se reabre en Formato → Plantilla de estilo.
     */
    private renderGuide(vp: powerbi.IViewport, _preview: boolean): void {
        this.container.querySelectorAll(".wf-guide").forEach(n => n.remove());
        const s = this.formattingSettings;
        if (!this.editing || this.formatMode || !s.style.guide.value || !this.interactionsAllowed()) return;
        if (!vp || vp.width < 340 || vp.height < 200) return;
        const pal: any = this.host.colorPalette;
        const hc = !!pal?.isHighContrast;
        const azul = hc ? (pal.foregroundSelected?.value || "#FFFF00") : "#2B6CB0";
        const fg = hc ? (pal.foreground?.value || "#FFF") : "";
        const g = document.createElement("div");
        g.className = "wf-guide";
        g.setAttribute("role", "region");
        g.setAttribute("aria-label", this.t("Guide_Title", "Setup tips"));
        if (hc) Object.assign(g.style, { background: pal.background?.value || "#000", color: fg, borderColor: azul });
        g.onclick = e => e.stopPropagation();
        g.onkeydown = e => e.stopPropagation();
        const fila = (titulo: string) => {
            const f = document.createElement("div");
            f.className = "wf-g-row";
            const l = document.createElement("span");
            l.className = "wf-g-lbl";
            l.textContent = titulo;
            f.appendChild(l);
            g.appendChild(f);
            return f;
        };
        const boton = (f: HTMLElement, texto: string, on: boolean, accion: () => void) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "wf-g-btn";
            b.textContent = texto;
            b.setAttribute("aria-pressed", String(on));
            b.style.borderColor = azul;
            if (on) { b.style.background = azul; b.style.color = hc ? (pal.background?.value || "#000") : "#FFFFFF"; } else b.style.color = azul;
            b.addEventListener("click", accion);
            f.appendChild(b);
        };
        const f1 = fila(this.t("Guide_TryStyle", "Try a style:"));
        const actual = String((s.style.template.value as any)?.value ?? "classic");
        ([["classic", "Classic"], ["modern", "Modern"], ["soft", "Soft"], ["mono", "One colour"], ["dark", "Dark"]] as [string, string][])
            .forEach(([v, d]) => boton(f1, this.t("Enum_" + v, d), v === actual, () => this.persistir("style", { template: v })));
        const objs: any = this.lastOptions?.dataViews?.[0]?.metadata?.objects ?? {};
        const f2 = fila(this.license.isLicensed ? this.t("Guide_ProOn", "Pro:") : this.t("Guide_TryPro", "Try Pro:"));
        const tabla = objs?.tableSettings?.show === true;
        boton(f2, this.t("Guide_Table", "Data table"), tabla, () => this.persistir("tableSettings", { show: !tabla }));
        const ibcs = objs?.ibcs?.mode === true;
        boton(f2, this.t("Guide_Ibcs", "IBCS"), ibcs, () => this.persistir("ibcs", { mode: !ibcs }));
        const angulo = objs?.labelSettings?.labelRotation === "-45";
        boton(f2, this.t("Guide_Angle", "Tilted labels"), angulo, () => this.persistir("labelSettings", { labelRotation: angulo ? "0" : "-45" }));
        const x = document.createElement("button");
        x.type = "button";
        x.className = "wf-g-close";
        x.textContent = "✕";
        x.title = this.t("Guide_Close", "Hide tips (Format → Style template)");
        x.setAttribute("aria-label", x.title);
        if (hc) x.style.color = fg;
        x.addEventListener("click", () => this.persistir("style", { guide: false }));
        g.appendChild(x);
        this.container.appendChild(g);
    }

    // ── Tooltip on hover ─────────────────────────────────────────────────────

    private handleBarHover(data: ClickEventData): void {
        if (this.formatMode) return;
        const { bar, clientX, clientY, selectionId } = data;
        const rect = this.container.getBoundingClientRect();
        const fmt  = this.fmt ?? new NumberFormatter(this.formattingSettings, this.host.locale);

        const isTotal = bar.barType === "total" || bar.barType === "subtotal";
        const dataItems: powerbi.extensibility.VisualTooltipDataItem[] = [
            { displayName: bar.label, value: fmt.format(isTotal ? bar.top : bar.value, bar.formatString) }
        ];

        if (!isTotal) {
            dataItems.push({ displayName: this.t("varianceVal", "Variance"), value: fmt.formatDelta(bar.value, bar.formatString) });
            dataItems.push({ displayName: this.t("pctVsBase", "% vs base"), value: (bar.deltaRel >= 0 ? "+" : "") + bar.deltaRel.toFixed(1) + "%" });
        }
        if (bar.target != null) {
            dataItems.push({ displayName: this.t("target", "Target"),    value: fmt.format(bar.target, bar.formatString) });
            dataItems.push({ displayName: this.t("targetGap", "Target gap"), value: fmt.formatDelta(bar.top - bar.target, bar.formatString) });
        }
        const tipos: Record<string, string> = {
            total: this.t("UI_Total", "Total"), subtotal: this.t("UI_Subtotal", "Subtotal"), delta: this.t("UI_Delta", "Change")
        };
        dataItems.push({ displayName: this.t("type", "Type"), value: tipos[bar.barType] ?? bar.barType });
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
        if (this.formatMode || !this.interactionsAllowed()) return;   // en modo formato el clic elige qué formatear
        const { index, selectionId, multiSelect } = data;

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
            if (this.lastOptions) this.draw(this.lastOptions);
        }
    }

    /**
     * Traduce los selection IDs que devuelve Power BI a indices de barra.
     *
     * Se comparan con equals() y no por identidad: los que llegan de un bookmark
     * son objetos reconstruidos, no los mismos que emitio el visual.
     */
    private indicesFromSelection(ids: powerbi.extensibility.ISelectionId[]): Set<number> {
        const out = new Set<number>();
        if (!ids?.length) return out;
        this.selectionIds.forEach((sid, i) => {
            if (!sid) return;
            const match = ids.some(id =>
                (sid as any).equals ? (sid as any).equals(id) : sid === id);
            if (match) out.add(i);
        });
        return out;
    }

    // ── Selection IDs ─────────────────────────────────────────────────────────

    private buildSelectionIds(dataView: powerbi.DataView, bars: ComputedBar[]):
            (powerbi.visuals.ISelectionId | null)[] {
        const catCol = dataView.categorical?.categories?.find(c => c.source?.roles?.["category"]);
        if (!catCol) return bars.map((): powerbi.visuals.ISelectionId | null => null);
        return bars.map((bar): powerbi.visuals.ISelectionId | null => {
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

    // ── Pantalla de inicio (serie TCViz) ─────────────────────────────────────

    /** En tres tamaños. Los enlaces solo se abren con un clic (host.launchUrl). */
    private showLandingPage(vp?: powerbi.IViewport): void {
        while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
        const w = vp?.width || this.container.clientWidth || 0, h = vp?.height || this.container.clientHeight || 0;
        const size = (w >= 560 && h >= 300) ? "l" : (w >= 320 && h >= 200) ? "m" : "s";
        const pal: any = this.host.colorPalette;
        const hc = !!pal?.isHighContrast;
        const fg = hc ? (pal.foreground?.value || "#FFFFFF") : "";
        const el = document.createElement("div");
        el.className = "wf-landing wf-landing-" + size;
        if (hc) el.style.background = pal.background?.value || "#000000";
        const mk = (tag: string, cls?: string, text?: string): HTMLElement => {
            const n = document.createElement(tag);
            if (cls) n.className = cls;
            if (text !== undefined) n.textContent = text;
            if (fg) n.style.color = fg;
            return n;
        };
        const head = mk("div", "cl-head");
        const img = document.createElement("img");
        img.src = LANDING_ICON; img.alt = ""; img.className = "cl-icon";
        head.appendChild(img);
        const titles = mk("div");
        titles.appendChild(mk("div", "cl-title", "Waterfall Advanced"));
        if (size !== "s") titles.appendChild(mk("div", "cl-tag", this.t("Landing_Tagline", "From opening to closing figure: what moved it, step by step.")));
        head.appendChild(titles);
        el.appendChild(head);
        const link = (txt: string, url: string, cls: string, sub?: string): HTMLElement => {
            const a = mk("a", cls) as HTMLAnchorElement;
            a.href = url; a.tabIndex = 0;
            a.appendChild(document.createTextNode(txt));
            if (sub) a.appendChild(mk("span", "cl-sub", sub));
            if (hc) { a.style.background = "transparent"; a.style.borderColor = fg; }
            const open = (e: Event): void => { e.preventDefault(); e.stopPropagation(); if (this.interactionsAllowed()) this.host.launchUrl(url); };
            a.addEventListener("click", open);
            a.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") open(e); });
            return a;
        };
        if (size === "s") {
            el.appendChild(mk("p", "cl-do", this.t("landingHint", "Connect Category and Value to render the waterfall")));
            el.appendChild(link(this.t("Landing_Guide", "Guide"), URL_GUIDE, "cl-a"));
            this.container.appendChild(el);
            return;
        }
        const cols = mk("div", "cl-cols");
        const pasos = mk("div");
        pasos.appendChild(mk("div", "cl-lbl", this.t("Landing_Steps", "Get started")));
        const ol = mk("ol", "cl-steps");
        const paso = (n: string, b: string, txt: string) => {
            const li = mk("li");
            const num = mk("span", "cl-n", n);
            if (hc) Object.assign(num.style, { background: "transparent", border: "1px solid " + fg });
            li.appendChild(num);
            const sp = mk("span");
            sp.appendChild(mk("b", "cl-well", b));
            sp.appendChild(document.createTextNode(" — " + txt));
            li.appendChild(sp);
            ol.appendChild(li);
        };
        paso("1", this.t("Role_Category", "Category"), this.t("Landing_Step1", "the steps of the bridge: P&L lines, drivers or months"));
        paso("2", this.t("Role_Value", "Value"), this.t("Landing_Step2", "the amount of each step; the first and last rows are totals"));
        paso("3", this.t("Role_BarType", "Bar type"), this.t("Landing_Step3", "optional: mark subtotals with \"subtotal\""));
        pasos.appendChild(ol);
        if (size === "l") {
            const pro = mk("div", "cl-pro");
            const chip = mk("span", "cl-chip", "Pro");
            if (hc) { chip.style.background = "transparent"; chip.style.border = "1px solid " + fg; }
            pro.appendChild(chip);
            pro.appendChild(mk("span", "", this.t("Landing_Pro", "Every driver, a data table and IBCS — try them on your data while you edit.")));
            pasos.appendChild(pro);
        }
        cols.appendChild(pasos);
        const links = mk("div");
        links.appendChild(mk("div", "cl-lbl", this.t("Landing_Help", "Help")));
        const ll = mk("div", "cl-links");
        ll.appendChild(link(this.t("Landing_Guide", "Guide"), URL_GUIDE, "cl-card", this.t("Landing_GuideSub", "support page")));
        ll.appendChild(link(this.t("Landing_Product", "Product page"), URL_PRODUCT, "cl-card", "tcviz.com"));
        if (size === "l") ll.appendChild(link(this.t("Landing_Video", "Video"), URL_VIDEO, "cl-card", "YouTube"));
        links.appendChild(ll);
        cols.appendChild(links);
        el.appendChild(cols);
        this.container.appendChild(el);
    }

    // ── On-object ─────────────────────────────────────────────────────────────

    /** Pieza → [tarjeta, clave del nombre, nombre en inglés]. */
    private static readonly SUB: Record<string, [string, string, string]> = {
        bars:      ["colorSettings", "card_colorSettings", "Colors"],
        labels:    ["labelSettings", "card_labelSettings", "Labels"],
        catLabels: ["labelSettings", "card_labelSettings", "Labels"],
        axis:      ["valueAxis", "card_valueAxis", "Value axis"],
        legend:    ["colorSettings", "card_colorSettings", "Colors"],
        cards:     ["cardSettings", "card_cardSettings", "Summary Cards"],
        table:     ["tableSettings", "card_tableSettings", "Data Table (Pro)"],
    };

    /** Marca lo que se puede elegir en modo formato. Fuera de él, no deja rastro. */
    private markSubSelectables(): void {
        this.container.querySelectorAll("[data-o]").forEach(el => {
            if (!this.formatMode) { el.classList.remove(HtmlSubSelectableClass); return; }
            const o = el.getAttribute("data-o");
            const info = Visual.SUB[o];
            if (!info) return;
            el.classList.add(HtmlSubSelectableClass);
            el.setAttribute(SubSelectableObjectNameAttribute, o);
            el.setAttribute(SubSelectableDisplayNameAttribute, this.t(info[1], info[2]));
            el.setAttribute(SubSelectableTypeAttribute, String(o === "bars"
                ? powerbi.visuals.SubSelectionStylesType.Shape : powerbi.visuals.SubSelectionStylesType.Text));
        });
    }

    private getSubSelectionStyles(subs: powerbi.visuals.CustomVisualSubSelection[]): powerbi.visuals.SubSelectionStyles | undefined {
        const o = subs[0]?.customVisualObjects[0]?.objectName;
        const ref = (obj: string, prop: string, key: string, def: string) => ({ reference: { objectName: obj, propertyName: prop }, label: this.t(key, def) });
        const Shape = powerbi.visuals.SubSelectionStylesType.Shape, Text = powerbi.visuals.SubSelectionStylesType.Text;
        switch (o) {
            case "bars": return { type: Shape, fill: ref("colorSettings", "positiveColor", "positiveColor", "Increase color") } as any;
            case "labels": return { type: Text, fontSize: ref("labelSettings", "fontSize", "fontSize", "Font size"),
                fontColor: ref("labelSettings", "valueLabelColor", "valueLabelColor", "Value label color") } as any;
            case "catLabels": return { type: Text, fontSize: ref("labelSettings", "categoryFontSize", "categoryFontSize", "Category label font size"),
                fontColor: ref("labelSettings", "categoryLabelColor", "categoryLabelColor", "Category / axis label color") } as any;
            case "axis": return { type: Text, fontSize: ref("valueAxis", "fontSize", "fontSize", "Font size"),
                fontColor: ref("valueAxis", "color", "color", "Color") } as any;
            case "legend": return { type: Text, fontSize: ref("colorSettings", "legendFontSize", "legendFontSize", "Legend font size"),
                fontColor: ref("colorSettings", "legendTextColor", "legendTextColor", "Legend text color") } as any;
            case "cards": return { type: Text, fontSize: ref("cardSettings", "valueFontSize", "valueFontSize", "Value font size"),
                fontColor: ref("cardSettings", "textColor", "textColor", "Text colour") } as any;
            case "table": return { type: Text, fontSize: ref("tableSettings", "fontSize", "fontSize", "Font size") } as any;
        }
        return undefined;
    }

    private getSubSelectionShortcuts(subs: powerbi.visuals.CustomVisualSubSelection[]): powerbi.visuals.VisualSubSelectionShortcuts | undefined {
        const o = subs[0]?.customVisualObjects[0]?.objectName;
        const info = Visual.SUB[o];
        if (!info) return undefined;
        const id = (obj: string, prop: string) => ({ objectName: obj, propertyName: prop });
        const toggle = (obj: string, prop: string, key: string, def: string) => ({ type: powerbi.visuals.VisualShortcutType.Toggle, ...id(obj, prop),
            relatedToggledFormattingIds: [id(obj, prop)], disabledLabel: this.t(key, def), enabledLabel: this.t(key, def) });
        const reset = (obj: string, props: string[]) => ({ type: powerbi.visuals.VisualShortcutType.Reset, relatedResetFormattingIds: props.map(p => id(obj, p)) });
        const picker = (obj: string, prop: string, key: string, def: string) => ({ type: powerbi.visuals.VisualShortcutType.Picker, ...id(obj, prop), label: this.t(key, def) });
        // FormattingSettingsService forma el uid "<objeto>-card" y Power BI lo publica como "Visual-<objeto>-card".
        const nav = { type: powerbi.visuals.VisualShortcutType.Navigate, destinationInfo: { cardUid: "Visual-" + info[0] + "-card" }, label: this.t(info[1], info[2]) };
        const div = { type: powerbi.visuals.VisualShortcutType.Divider };
        switch (o) {
            case "bars":
                return [picker("chartSettings", "orientation", "orientation", "Orientation"),
                    toggle("chartSettings", "showConnectors", "showConnectors", "Connector lines"),
                    toggle("colorSettings", "colorBlindSafe", "colorBlindSafe", "Colour-blind safe palette"),
                    toggle("colorSettings", "patternOnDecrease", "patternOnDecrease", "Hatch decreases"), div,
                    reset("colorSettings", ["positiveColor", "negativeColor", "totalColor"]), nav] as any;
            case "labels":
                return [picker("labelSettings", "labelMode", "labelMode", "Label mode"),
                    toggle("labelSettings", "showLabels", "showLabels", "Show labels"), div,
                    reset("labelSettings", ["fontSize", "valueLabelColor"]), nav] as any;
            case "catLabels":
                return [picker("labelSettings", "labelRotation", "labelRotation", "Category label angle (Pro)"),
                    toggle("categoryAxis", "showTitle", "ax_showTitle", "Axis title"), div,
                    reset("labelSettings", ["categoryFontSize", "categoryLabelColor"]), nav] as any;
            case "axis":
                return [toggle("valueAxis", "show", "va_show", "Show value axis"),
                    toggle("valueAxis", "gridlines", "va_gridlines", "Gridlines"),
                    toggle("valueAxis", "showTitle", "ax_showTitle", "Axis title"), div,
                    reset("valueAxis", ["fontSize", "color"]), nav] as any;
            case "legend":
                return [picker("colorSettings", "legendPosition", "legendPosition", "Legend position"),
                    toggle("colorSettings", "showLegend", "showLegend", "Show legend"), div,
                    reset("colorSettings", ["legendFontSize", "legendTextColor"]), nav] as any;
            case "cards":
                return [toggle("cardSettings", "show", "cards_show", "Show summary cards"), div,
                    reset("cardSettings", ["labelFontSize", "valueFontSize"]), nav] as any;
            case "table":
                return [picker("tableSettings", "position", "table_position", "Position"),
                    toggle("tableSettings", "showRunning", "showRunning", "Running total column"), div, nav] as any;
        }
        return undefined;
    }

    // ── Formatting model ─────────────────────────────────────────────────────

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        const s = this.formattingSettings;
        const custom = (s.numberFormat.source.value as any)?.value !== "model";
        [s.numberFormat.currencySymbol, s.numberFormat.symbolPosition, s.numberFormat.scaleMode, s.numberFormat.decimals, s.numberFormat.thousandsSep]
            .forEach(sl => { sl.visible = custom; });
        s.colorSettings.legendPosition.visible = !!s.colorSettings.showLegend.value;
        s.valueAxis.title.visible = !!s.valueAxis.showTitle.value;
        s.categoryAxis.title.visible = !!s.categoryAxis.showTitle.value;
        const model = this.formattingSettingsSvc.buildFormattingModel(s);
        // fx en el color de subida: el color FIJO tiene que guardarse a nivel general, no con el selector comodín
        // (si no, llega por fila, el panel no lo recuerda y el visual lo toma por regla). Bar Chart 1.11.
        model.cards.forEach((card: any) => (card.groups ?? []).forEach((g: any) => (g.slices ?? []).forEach((sl: any) => {
            const d = sl?.control?.properties?.descriptor;
            if (d?.objectName === "colorSettings" && d?.propertyName === "positiveColor") d.altConstantValueSelector = null;
        })));
        return model;
    }

    /**
     * Power BI recrea el visual al cambiar de pagina. Un temporizador vivo levantaria la
     * barra de Upgrade sobre un visual que ya no existe.
     */
    public destroy(): void {
        this.notifier?.dispose();
        if (this.debounceId) clearTimeout(this.debounceId);
    }
}
