import powerbi from "powerbi-visuals-api";
import { ComputedBar, WaterfallSummary, computeYDomain, niceTicks } from "./waterfallEngine";
import { VisualFormattingSettingsModel } from "./settings";
import { NumberFormatter } from "./formatter";

import ILocalizationManager = powerbi.extensibility.ILocalizationManager;

const SVG_NS = "http://www.w3.org/2000/svg";

export interface ClickEventData {
    bar:         ComputedBar;
    index:       number;
    clientX:     number;
    clientY:     number;
    selectionId: powerbi.visuals.ISelectionId | null;
    multiSelect: boolean;
}

interface RenderOptions {
    container:     HTMLElement;
    bars:          ComputedBar[];
    summary:       WaterfallSummary;
    settings:      VisualFormattingSettingsModel;
    selectionIds:  (powerbi.visuals.ISelectionId | null)[];
    selectedIndices: Set<number>;
    /** Si el usuario tiene licencia. Decide los ajustes marcados (Pro). */
    isLicensed:    boolean;
    /** Funciones Pro que se dibujan: con licencia, o en la vista previa (editando, el ajuste puesto). */
    proTable:      boolean;
    proIbcs:       boolean;
    proDensity:    boolean;
    fmt:           NumberFormatter;
    /** Textos traducidos (clave, inglés). */
    t:             (key: string, fallback: string) => string;
    measureName:   string;
    categoryName:  string;
    /** Plantilla para fondo oscuro: el halo de los textos pasa a ser oscuro. */
    darkBackground: boolean;
    highContrast:  boolean;
    contrastForeground: string;
    contrastBackground: string;
    /** 1.3: el puente compara dos momentos (cardsMakeSense) o el autor pidió las tarjetas siempre. */
    cardsAllowed:  boolean;
    /** 1.3: tintas del lienzo (estilo de la colección o tema): cuadrícula, línea del cero y conectores. */
    ink:           { grid: string; line: string; connector: string };
    /** 1.3: tipo de letra del estilo (Ledger y Editorial, Georgia). */
    fontFamily:    string;
    /** 1.3, tarjeta Accesibilidad: tamaño mínimo de texto, color y grosor del foco de teclado. */
    minTextSize:   number;
    focusColor:    string;
    focusWidth:    number;
    width:         number;
    height:        number;
    onBarClick:    (data: ClickEventData) => void;
    onBarHover:    (data: ClickEventData) => void;
    onBarLeave:    () => void;
}

/** Columnas y fuente de la tabla de datos (1.3), decididas antes de dibujar para que quepa sin scroll. */
interface TablePlan { fs: number; running: boolean; share: boolean; valueW: number; runningW: number; shareW: number; needW: number; }

export class WaterfallRenderer {

    private svg!:        SVGSVGElement;
    private scrollWrap!: HTMLDivElement;
    private container:   HTMLElement;
    private loc:         ILocalizationManager;

    private PAD_LEFT   = 52;
    private readonly PAD_RIGHT  = 16;
    private PAD_TOP    = 28;
    /** Hueco abajo para la leyenda cuando va abajo (1.2). */
    private legendBottom = 0;
    private tr: (key: string, fallback: string) => string = (_k, f) => f;
    private readonly CARD_H     = 76;
    /** 1.3: antes 22 px, que en un visual de 530 px con 13 barras ya sacaba scroll. Solo hay scroll por debajo de 8. */
    private readonly MIN_BAR_W  = 8;
    private readonly MIN_BAR_H  = 20;

    constructor(container: HTMLElement, loc: ILocalizationManager) {
        this.container = container;
        this.loc       = loc;
        this.container.style.fontFamily = "Segoe UI, sans-serif";
        this.container.style.userSelect = "none";
    }

    render(opts: RenderOptions): void {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        const { bars, summary, settings, selectionIds, selectedIndices, highContrast,
            contrastForeground, width, height,
                onBarClick, onBarHover, onBarLeave } = opts;
        this.tr = opts.t;
        this.darkBg = !!opts.darkBackground;
        this.hcFg = highContrast ? contrastForeground : "";
        this.hcBg = highContrast ? opts.contrastBackground : "";
        this.minText = Math.min(24, Math.max(6, Number(opts.minTextSize) || 6));
        // 1.3: en un visual pequeño el texto del gráfico encoge con él, como ya hacía la tabla (60 % como mínimo y nunca
        // por debajo de 8 px ni del tamaño mínimo de Accesibilidad). A partir de unos 760×440 se usa el tamaño elegido.
        this.scale = Math.min(1, Math.max(0.6, Math.min(opts.width / 760, opts.height / 440)));
        this.font = opts.fontFamily || "Segoe UI, sans-serif";
        this.ink = opts.ink;
        this.focus = { color: highContrast ? contrastForeground : opts.focusColor, width: opts.focusWidth };
        if (bars.length === 0) { this.renderEmpty(); return; }

        const fmt = opts.fmt;
        const isLicensed = opts.proDensity;
        const cs  = settings.colorSettings;
        const ls  = settings.labelSettings;
        const ch  = settings.chartSettings;

        const invert = ch.invertColorSemantics.value;
        const vaS = settings.valueAxis;
        this.vaSettings = {
            show: !!vaS.show.value, gridlines: !!vaS.gridlines.value, fontSize: vaS.fontSize.value,
            color: highContrast ? contrastForeground : vaS.color.value.value,
            title: vaS.showTitle.value ? (vaS.title.value || opts.measureName) : ""
        };
        const caS = settings.categoryAxis;
        this.catTitle = caS.showTitle.value ? (caS.title.value || opts.categoryName) : "";

        // Paleta Okabe-Ito: azul y naranja se distinguen con deuteranopia y
        // protanopia, que es donde el verde/rojo por defecto falla. Afecta a
        // cerca del 8% de los hombres, y un bridge financiero es justo donde
        // confundir una subida con una bajada mas caro sale.
        const CB_POS = "#0072B2";
        const CB_NEG = "#E69F00";
        const CB_TOTAL = "#56585B";
        // IBCS manda sobre la paleta accesible: es una notacion completa, y
        // mezclarla con otros colores la invalida. En un bridge el enfasis va en
        // la desviacion negativa, que es lo que se mira primero.
        const ibcs = opts.proIbcs && settings.ibcs.mode.value;
        const safe = cs.colorBlindSafe.value;
        const posColor = ibcs ? "#8C8C8C" : safe ? CB_POS : cs.positiveColor.value.value;
        const negColor = ibcs ? "#262626" : safe ? CB_NEG : cs.negativeColor.value.value;
        const totColor = ibcs ? "#404040" : safe ? CB_TOTAL : cs.totalColor.value.value;
        const colors = {
            pos:    highContrast ? contrastForeground : (invert ? negColor : posColor),
            neg:    highContrast ? contrastForeground : (invert ? posColor : negColor),
            total:  highContrast ? contrastForeground : totColor,
            target: highContrast ? contrastForeground : cs.targetColor.value.value,
        };

        // El interruptor vive ahora en su propia tarjeta. Se respeta el antiguo
        // de Chart para no romper informes guardados: si cualquiera de los dos
        // esta apagado, las tarjetas no se pintan.
        // En un mosaico pequeño las tarjetas se comerían el gráfico: se ocultan solas.
        // 1.3: y cuando el puente no es una comparación (cardsAllowed, ver cardsMakeSense) se ocultan también.
        const showCards  = ch.showVarianceCards.value && settings.cardSettings.show.value && opts.cardsAllowed && height >= 220 && width >= 280;
        const horizontal = ch.orientation.value.value === "horizontal";

        // Tabla de datos (Pro). Reserva su parte antes de calcular el lienzo: si
        // se anadiera despues, el SVG ya estaria dimensionado y la tabla lo
        // empujaria fuera del visual.
        const ts        = settings.tableSettings;
        const showTable = opts.proTable && ts.show.value;
        const tablePct  = showTable ? Math.min(60, Math.max(20, ts.widthPct.value)) / 100 : 0;
        const tableRight = showTable && ts.position.value.value === "right";

        const bodyH  = showCards ? height - this.CARD_H : height;
        // 1.3: la tabla se planifica antes que el gráfico: columnas que caben (se quitan primero % apertura y Acumulado),
        // fuente que cabe a lo alto, y a la derecha ocupa solo el ancho que necesita, hasta el % elegido. El gráfico se
        // queda el resto (con el hueco de 8 px entre los dos): nada sale del visual ni saca scroll.
        const tablePlan = showTable ? this.planTable(bars, summary, fmt, ts,
            tableRight ? Math.round(width * tablePct) : width - 16,
            tableRight ? bodyH : Math.round(bodyH * tablePct)) : null;
        const tableW = tableRight && tablePlan ? Math.min(Math.round(width * tablePct), tablePlan.needW) : 0;
        const chartW = tableRight ? width - tableW - 8 : width;
        const svgH   = showTable && !tableRight
            ? Math.round(bodyH * (1 - tablePct)) : bodyH;

        // Fila que contiene grafico y tabla cuando la tabla va a la derecha.
        const body = document.createElement("div");
        body.style.cssText = tableRight
            ? `display:flex;gap:8px;width:100%;height:${bodyH}px;box-sizing:border-box`
            : `display:block;width:100%`;
        this.container.appendChild(body);

        this.scrollWrap = document.createElement("div");
        this.scrollWrap.style.cssText = horizontal
            ? `overflow-y:auto;overflow-x:hidden;width:${chartW}px;height:${svgH}px;flex:0 0 auto`
            : `overflow-x:auto;overflow-y:hidden;width:${chartW}px;height:${svgH}px;flex:0 0 auto`;

        this.svg = this.makeSVG(chartW, svgH);
        this.scrollWrap.appendChild(this.svg);
        body.appendChild(this.scrollWrap);
        // Leyenda (1.2): se puede ocultar y poner abajo; en un mosaico muy bajo desaparece sola.
        const legendOn = cs.showLegend.value && svgH >= 140;
        const legendAtBottom = legendOn && cs.legendPosition.value.value === "bottom";
        // El hueco de arriba crece con la fuente de la leyenda: con 18 px se montaba sobre el eje.
        this.PAD_TOP = legendOn && !legendAtBottom ? Math.max(28, Math.round(cs.legendFontSize.value * 1.6) + 14) : 12;
        this.legendBottom = legendAtBottom ? Math.round(cs.legendFontSize.value * 1.8) + 6 : 0;
        if (legendOn) {
            this.renderLegend(colors, highContrast ? contrastForeground : cs.legendTextColor.value.value,
                cs.legendFontSize.value, legendAtBottom ? svgH - 6 : Math.max(16, cs.legendFontSize.value + 6), cs.legendFontFamily.value);
        }

        const defs = this.el("defs") as SVGDefsElement;
        const marker = this.el("marker") as SVGMarkerElement;
        marker.setAttribute("id", "wf-arr"); marker.setAttribute("viewBox", "0 0 10 10");
        marker.setAttribute("refX", "8"); marker.setAttribute("refY", "5");
        marker.setAttribute("markerWidth", "5"); marker.setAttribute("markerHeight", "5");
        marker.setAttribute("orient", "auto-start-reverse");
        const mPath = this.el("path") as SVGPathElement;
        mPath.setAttribute("d", "M2 1L8 5L2 9"); mPath.setAttribute("fill", "none");
        mPath.setAttribute("stroke", "#888780"); mPath.setAttribute("stroke-width", "1.5");
        mPath.setAttribute("stroke-linecap", "round");
        marker.appendChild(mPath); defs.appendChild(marker); this.svg.appendChild(defs);

        if (horizontal) {
            this.renderHorizontal(bars, summary, ch, ls, colors, fmt, selectionIds, selectedIndices,
                highContrast, contrastForeground, chartW, svgH, onBarClick, onBarHover, onBarLeave,
                cs.patternOnDecrease.value, isLicensed);
        } else {
            this.renderVertical(bars, summary, ch, ls, colors, fmt, selectionIds, selectedIndices,
                highContrast, contrastForeground, chartW, svgH, onBarClick, onBarHover, onBarLeave,
                cs.patternOnDecrease.value, isLicensed);
        }

        if (showTable) {
            this.renderDataTable(body, bars, summary, fmt, ts, tablePlan, colors,
                tableRight, tableRight ? tableW : 0,
                tableRight ? bodyH : Math.round(bodyH * tablePct),
                highContrast ? contrastForeground : ls.categoryLabelColor.value.value);
        }

        if (showCards) this.renderVarianceCards(summary, colors, fmt, ls, cs, settings.cardSettings);
    }

    private renderVertical(bars: ComputedBar[], summary: WaterfallSummary, ch: VisualFormattingSettingsModel["chartSettings"],
            ls: VisualFormattingSettingsModel["labelSettings"], colors: Record<string, string>, fmt: NumberFormatter,
            selectionIds: (powerbi.visuals.ISelectionId | null)[], selectedIndices: Set<number>,
            highContrast: boolean, contrastForeground: string, width: number, svgH: number,
            onBarClick: RenderOptions["onBarClick"], onBarHover: RenderOptions["onBarHover"], onBarLeave: RenderOptions["onBarLeave"],
            hatchDecrease = false, isLicensed = false): void {

        const maxLabelLines = Math.max(...bars.map(b => b.label.split(/\\n|\n/).length));
        // El margen inferior tiene que dar cabida a la etiqueta ROTADA. Una
        // etiqueta a -45 grados ocupa hacia abajo su ancho por el seno del
        // angulo, no la altura de una linea de texto: sin esto, rotar sacaba
        // las etiquetas fuera del lienzo y Power BI las recortaba por la
        // izquierda, que es justo lo que rotar pretendia evitar.
        // Los tres ajustes de densidad son de pago y aqui es donde se aplica:
        // etiquetarlos "(Pro)" en el panel y no comprobarlo despues es prometer
        // un muro que no existe.
        const rotDeg  = isLicensed ? (Number(ls.labelRotation.value.value) || 0) : 0;
        const catFs   = ls.categoryFontSize.value;
        const longestW = Math.max(...bars.map(b =>
            this.textWidth(b.label.split(/\\n|\n/)[0], catFs)));
        const rotRise = rotDeg
            ? longestW * Math.abs(Math.sin(rotDeg * Math.PI / 180)) + 12
            : 0;
        const va = this.vaSettings;
        const catTitle = this.catTitle;
        const PAD_BOTTOM = Math.min(
            svgH * 0.45,
            Math.max(20 + maxLabelLines * 15, 20 + rotRise)) + this.legendBottom + (catTitle ? 16 : 0);
        this.PAD_LEFT = (va.show ? 52 : 12) + (va.title ? 16 : 0);

        const chartW = width - this.PAD_LEFT - this.PAD_RIGHT;
        const chartH = svgH  - this.PAD_TOP  - PAD_BOTTOM;

        const [minY, maxY] = computeYDomain(bars);
        const yRange = maxY - minY;
        const yScale = (v: number) =>
            this.PAD_TOP + chartH - ((v - minY) / yRange) * chartH;

        // 1.3: todas las barras caben en el ancho disponible. El hueco se estrecha con la barra (15 % de cada paso, entre
        // 2 y 10 px) y solo hay scroll si ni así caben barras de 8 px.
        const n   = bars.length;
        const slot = chartW / n;
        const gap = Math.max(2, Math.min(10, slot * 0.15));
        let barW  = (chartW - gap * (n - 1)) / n;
        let plotW = chartW;
        if (barW < this.MIN_BAR_W) {
            barW  = this.MIN_BAR_W;
            plotW = barW * n + gap * (n - 1);
            const totalW = this.PAD_LEFT + plotW + this.PAD_RIGHT;
            this.svg.setAttribute("width", String(totalW));
            this.svg.style.width = totalW + "px";
            this.svg.setAttribute("viewBox", `0 0 ${totalW} ${svgH}`);
        }
        const xOf = (i: number) => this.PAD_LEFT + i * (barW + gap);
        const svgW = Math.max(width, this.PAD_LEFT + plotW + this.PAD_RIGHT);
        this.deferred = [];
        this.late = [];
        this.queue = [];
        this.boxes = [];
        const maxAbs = Math.max(...bars.map(b => Math.abs(b.value)), 1);
        // Zonas que las etiquetas no pueden ocupar: la franja de las categorías y la leyenda de arriba.
        this.boxes.push({ x0: 0, y0: this.PAD_TOP + chartH + 1, x1: svgW, y1: svgH, bar: -3 });
        if (this.PAD_TOP > 12) this.boxes.push({ x0: 0, y0: 0, x1: svgW, y1: this.PAD_TOP - 8, bar: -3 });

        // Etiquetas de categoría que no caben en su paso (1.3, sin rotar): se recortan con "…" al ancho del paso y, si ni
        // cuatro letras caben, se muestra una de cada k. El nombre completo sigue en la descripción emergente.
        const catFsV = ls.categoryFontSize.value;
        const charW = this.textWidth("Abcdefghij", catFsV, "400") / 10;   // ancho medio real con la letra del estilo
        // Rotadas: la distancia entre dos etiquetas vecinas es el paso por el seno del ángulo; si es menor que una línea
        // de texto se pisan, y se muestra una de cada k. Y se recortan a lo que cabe en el margen inferior.
        const sinR = Math.abs(Math.sin(rotDeg * Math.PI / 180));
        const catEvery = rotDeg
            ? Math.max(1, Math.ceil(this.fz(catFsV) * 1.6 / ((barW + gap) * sinR)))
            : Math.max(1, Math.ceil(4.5 * charW / (barW + gap)));
        const rotFit = rotDeg
            ? Math.max(3, Math.floor((PAD_BOTTOM - this.legendBottom - (catTitle ? 16 : 0) - 14) / sinR / charW))
            : 0;
        const catChars = Math.floor((catEvery * (barW + gap) - 2) / charW);

        this.renderYAxis(yScale, minY, maxY, plotW, fmt, ls.categoryLabelColor.value.value);
        if (va.title) {
            const tt = this.text(12, this.PAD_TOP + chartH / 2, va.title, va.fontSize, va.color, "middle", "600", -90);
            tt.setAttribute("data-o", "axis");
        }
        if (catTitle) {
            const ct = this.text(this.PAD_LEFT + plotW / 2, svgH - this.legendBottom - 4, catTitle, ls.categoryFontSize.value,
                ls.categoryLabelColor.value.value, "middle", "600");
            ct.setAttribute("data-o", "catLabels");
        }

        const zeroY = yScale(0);
        this.line(this.PAD_LEFT, zeroY, this.PAD_LEFT + plotW, zeroY, this.ink.line, 0.8);

        if (ch.showConnectors.value) {
            bars.forEach((bar, i) => {
                if (i === 0) return;
                const connY = yScale(bars[i - 1].running);
                this.line(xOf(i - 1) + barW, connY, xOf(i), connY, this.ink.connector, 0.6, "4 3");
            });
        }

        bars.forEach((bar, i) => {
            if (bar.barType === "subtotal" && !ch.showSubtotals.value) return;

            const x    = xOf(i);
            const yTop = yScale(bar.top);
            const yBot = yScale(bar.base);
            const bh   = Math.max(2, Math.abs(yBot - yTop));

            const baseFill = bar.conditionalColor || ((bar.barType === "total" || bar.barType === "subtotal")
                ? colors.total : bar.value >= 0 ? colors.pos : colors.neg);
            // La trama solo en las bajadas reales, no en totales ni subtotales:
            // un total negativo es un resultado, no una caida.
            const fill = (hatchDecrease && !highContrast &&
                          bar.barType === "delta" && bar.value < 0)
                ? this.hatchFill(baseFill) : baseFill;

            const isSelected    = selectedIndices.size === 0 || selectedIndices.has(i);
            const isHighlighted = bar.isHighlighted !== false;
            const baseOpacity   = bar.barType === "subtotal" && !ch.showSubtotals.value ? 0.3 : 1;
            const opacity       = (!isSelected || !isHighlighted) ? baseOpacity * 0.25 : baseOpacity;

            const rect = this.el("rect") as SVGRectElement;
            rect.setAttribute("x", String(x)); rect.setAttribute("y", String(yTop));
            rect.setAttribute("width", String(barW)); rect.setAttribute("height", String(bh));
            rect.setAttribute("rx", "3"); rect.setAttribute("fill", fill);
            rect.setAttribute("opacity", String(opacity));
            rect.setAttribute("data-bar-index", String(i));
            rect.setAttribute("data-o", "bars");
            rect.setAttribute("tabindex", "0");
            rect.setAttribute("role", "img");
            rect.setAttribute("aria-label", `${bar.label}: ${fmt.format(bar.value, bar.formatString)}`);
            rect.style.cursor = "pointer"; rect.style.transition = "opacity 0.15s";
            this.focusRing(rect);

            rect.addEventListener("mouseenter", () => rect.setAttribute("opacity", "0.72"));
            rect.addEventListener("mouseleave", () => {
                rect.setAttribute("opacity", String(opacity));
                onBarLeave();
            });
            rect.addEventListener("mousemove", (ev: MouseEvent) =>
                onBarHover({ bar, index: i, clientX: ev.clientX, clientY: ev.clientY,
                    selectionId: selectionIds[i] ?? null, multiSelect: ev.ctrlKey || ev.metaKey }));
            rect.addEventListener("click", (ev: MouseEvent) =>
                onBarClick({ bar, index: i, clientX: ev.clientX, clientY: ev.clientY,
                    selectionId: selectionIds[i] ?? null, multiSelect: ev.ctrlKey || ev.metaKey }));
            rect.addEventListener("keydown", (ev: KeyboardEvent) => {
                if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    onBarClick({ bar, index: i, clientX: x + barW / 2, clientY: yTop,
                        selectionId: selectionIds[i] ?? null, multiSelect: ev.ctrlKey || ev.metaKey });
                }
            });
            this.svg.appendChild(rect);
            this.boxes.push({ x0: x, y0: yTop, x1: x + barW, y1: yTop + bh, bar: i });

            if (ch.showAnomalies.value && summary.anomalies.find(a => a.label === bar.label)) {
                const rA = Math.max(5, this.fz(7) * 0.72) + 2;
                const acx = x + barW - rA;
                const acy = yTop + rA;
                const dot = this.el("circle") as SVGCircleElement;
                dot.setAttribute("cx", String(acx)); dot.setAttribute("cy", String(acy));
                dot.setAttribute("r", String(Math.max(5, this.fz(7) * 0.72))); dot.setAttribute("fill", this.hcFg || "#E24B4A");
                dot.setAttribute("stroke", this.hcBg || "#fff"); dot.setAttribute("stroke-width", "1");
                this.svg.appendChild(dot);
                const warn = this.el("text") as SVGTextElement;
                // 1.3: el "!" respeta el tamaño mínimo de texto de Accesibilidad (y el círculo crece con él).
                warn.setAttribute("x", String(acx)); warn.setAttribute("y", String(acy + this.fz(7) * 0.36));
                warn.setAttribute("font-size", String(this.fz(7))); warn.setAttribute("fill", this.hcBg || "#fff");
                warn.setAttribute("text-anchor", "middle"); warn.setAttribute("font-weight", "700");
                warn.textContent = "!"; this.svg.appendChild(warn);
            }

            const anchorBar = bar.barType === "total" || bar.barType === "subtotal";

            // El objetivo se dibuja DESPUÉS de todas las barras: si no, la barra siguiente lo tapa.
            // 1.3: la línea siempre; su etiqueta busca un sitio que no pise barras ni otras etiquetas (encima, debajo, a
            // un lado) y, si no lo hay, se abrevia a la cifra; si ni así cabe, se omite (la cifra sigue en la tabla y en
            // la descripción emergente).
            // La línea ocupa su sitio desde ya: ninguna etiqueta de valor puede quedar cruzada por ella.
            if (ch.showTarget.value && bar.target != null && bar.barType === "total")
                this.boxes.push({ x0: x - 4, y0: yScale(bar.target) - 1, x1: x + barW + 4, y1: yScale(bar.target) + 1, bar: -1 });
            if (ch.showTarget.value && bar.target != null && bar.barType === "total") this.queue.push({ p: 1, f: () => {
                const ty = yScale(bar.target);
                this.line(x - 4, ty, x + barW + 4, ty, colors.target, 1.5, "5 3");
                const full = (ch.targetLabel.value || "Target") + (ch.targetShowValue.value ? " " + fmt.format(bar.target) : "");
                const short = ch.targetShowValue.value ? fmt.format(bar.target) : "";
                const th = this.fz(9);
                for (const tLabel of [full, short].filter(t => !!t)) {
                    const tW = this.textWidth(tLabel, 9);
                    const cxc = Math.min(Math.max(x + barW / 2, tW / 2 + 2), svgW - tW / 2 - 2);
                    const cands: [number, number][] = [[cxc, ty - 4], [cxc, ty + th + 2], [x + barW + 6 + tW / 2, ty + th / 2 - 1], [x - 6 - tW / 2, ty + th / 2 - 1]];
                    const ok = cands.find(([cx, by]) => this.isFree(this.boxAt(cx, by, tW, th), -2, svgW, svgH));
                    if (ok) {
                        this.boxes.push({ ...this.boxAt(ok[0], ok[1], tW, th), bar: -1 });
                        const tt = this.text(ok[0], ok[1], tLabel, 9, colors.target, "middle", "600");
                        tt.setAttribute("data-o", "targetLabel");
                        this.halo(tt, colors.target);
                        break;
                    }
                }
            } });

            // Etiquetas de valor (1.3): primero las de totales y subtotales, luego las de los cambios de mayor a menor. Cada
            // una prueba encima de la barra, dentro (si cabe) y debajo; si choca con una barra u otra etiqueta en los tres
            // sitios, se omite en vez de montarse ("+97.0k−143.0k"). La cifra sigue en la descripción emergente.
            if (ls.showLabels.value) this.queue.push({ p: anchorBar ? 0 : 2 + (1 - Math.abs(bar.value) / maxAbs), f: () => {
                const label = this.buildLabel(bar, ls.labelMode.value.value as string, fmt);
                // 1.3: la cifra se reduce hasta caber en el paso de su barra (mínimo 8 px) antes de darla por perdida; así no
                // hace falta quitar decimales para verla en un visual estrecho.
                let fsL = ls.fontSize.value;
                while (this.fz(fsL) > Math.max(8, this.minText) && this.measure(label, fsL, "500") > barW + gap * 0.8) fsL -= 0.5;
                // Para chocar se usa un ancho más ajustado (0,55 em) que el de reservar márgenes (0,60 em).
                const tw = this.measure(label, fsL, "500") + 2, th = this.fz(fsL);
                const color = ls.autoValueLabelColor.value ? baseFill : ls.valueLabelColor.value.value;
                const inside = highContrast ? (this.hcBg || "#FFFFFF") : (this.luminance(baseFill) > 0.55 ? "#1B1B1B" : "#FFFFFF");
                const nearTarget = ch.showTarget.value && bar.target != null && bar.barType === "total" &&
                    Math.abs(yScale(bar.target) - yTop) < fsL + 12;
                const fitsInside = bh > th + 8 && tw <= barW + 2;
                // Encima: centrada, o alineada con el borde derecho o izquierdo de su barra si la centrada choca.
                const mid = x + barW / 2, xs = [mid, x + barW - tw / 2, x + tw / 2];
                const cands: [number, number, string, boolean][] = [];
                const above = () => xs.forEach(cx => cands.push([cx, yTop - 5, color, true]));
                if (!nearTarget) above();
                if (fitsInside) cands.push([mid, yTop + th + 3, inside, false]);
                if (nearTarget) above();
                if (bar.barType === "delta" && bar.value < 0) xs.forEach(cx => cands.push([cx, yTop + bh + th + 2, color, true]));
                const ok = cands.find(([cx, by, , out]) => {
                    const bx = this.boxAt(cx, by, tw, th);
                    return this.isFree(bx, out ? -2 : i, svgW, svgH) && (out || bx.y1 <= yTop + bh);
                });
                if (!ok) return;
                this.boxes.push({ ...this.boxAt(ok[0], ok[1], tw, th), bar: -1 });
                const lt = this.text(ok[0], ok[1], label, fsL, ok[2], "middle", "500");
                lt.setAttribute("data-o", "labels");
                if (ok[3]) this.halo(lt, ok[2]);   // dentro de la barra no hace falta halo
            } });

            // Color de la etiqueta de eje: el de la barra cuando es un anclaje.
            // En alto contraste no se toca, que ahi manda el tema del sistema.
            const catColor = (ls.anchorLabelsMatchBar.value && !highContrast &&
                              (bar.barType === "total" || bar.barType === "subtotal"))
                ? colors.total : ls.categoryLabelColor.value.value;
            const rot      = rotDeg;
            const maxChars = isLicensed ? (ls.labelMaxChars.value ?? 0) : 0;
            // Rotada, la etiqueta ya no compite por el ancho de la barra.
            const fitsWidth = rot !== 0 ||
                this.textWidth(bar.label, ls.categoryFontSize.value) <= barW + gap;
            if ((!(isLicensed && ls.hideOverlapping.value) || fitsWidth) && i % catEvery === 0) {
                const anchor = rot ? "end" : "middle";
                const cap = rot ? (maxChars > 0 ? Math.min(maxChars, rotFit) : rotFit) : (maxChars > 0 ? Math.min(maxChars, catChars - 1) : catChars - 1);
                this.truncate(bar.label, rot ? cap : Math.max(1, cap)).split(/\\n|\n/).forEach((line, li) => {
                    this.text(x + barW / 2, this.PAD_TOP + chartH + 16 + li * 15,
                        line, ls.categoryFontSize.value, catColor,
                        anchor, "400", rot).setAttribute("data-o", "catLabels");
                });
            }
        });
        this.queue.sort((a, b) => a.p - b.p).forEach(q => q.f());
    }

    private renderHorizontal(bars: ComputedBar[], summary: WaterfallSummary, ch: VisualFormattingSettingsModel["chartSettings"],
            ls: VisualFormattingSettingsModel["labelSettings"], colors: Record<string, string>, fmt: NumberFormatter,
            selectionIds: (powerbi.visuals.ISelectionId | null)[], selectedIndices: Set<number>,
            highContrast: boolean, contrastForeground: string, width: number, svgH: number,
            onBarClick: RenderOptions["onBarClick"], onBarHover: RenderOptions["onBarHover"], onBarLeave: RenderOptions["onBarLeave"],
            hatchDecrease = false, isLicensed = false): void {

        // El margen se calcula con el tamano de fuente REAL, no con 6px por
        // caracter: a 14pt esa estimacion se queda corta y la etiqueta se sale.
        // Y el techo sube de 160px a un 40% del ancho, que es lo que permite
        // que quepa un nombre de linea de P&L completo.
        const catFsH   = ls.categoryFontSize.value;
        const longestH = Math.max(...bars.map(b =>
            this.textWidth(b.label.split(/\\n|\n/)[0], catFsH)));
        // GUTTER es el aire entre el borde del visual y la primera letra. Sin
        // el, la etiqueta mas larga queda pegada al marco y se lee como cortada
        // aunque este entera.
        const GUTTER = 10;
        const titleLeft = this.catTitle ? 16 : 0;
        const PAD_LEFT_H = Math.min(
            Math.max(width * 0.45, 70),
            Math.max(70, longestH + GUTTER + 10)) + titleLeft;
        const vaH = this.vaSettings;
        const catTitleH = this.catTitle;
        const PAD_BOTTOM_H  = (vaH.show ? 28 : 8) + (vaH.title ? 16 : 0) + this.legendBottom;

        const chartW = width - PAD_LEFT_H - this.PAD_RIGHT - 8;
        const chartH = svgH  - this.PAD_TOP - PAD_BOTTOM_H;

        const [minV, maxV] = computeYDomain(bars);
        const vRange = maxV - minV;
        const xScale = (v: number) =>
            PAD_LEFT_H + ((v - minV) / vRange) * chartW;

        const n   = bars.length;
        const gap = Math.max(4, Math.min(10, chartH * 0.02));
        let barH  = (chartH - gap * (n - 1)) / n;
        let plotH = chartH;
        if (barH < this.MIN_BAR_H) {
            barH  = this.MIN_BAR_H;
            plotH = barH * n + gap * (n - 1);
            const totalH = this.PAD_TOP + plotH + PAD_BOTTOM_H;
            this.svg.setAttribute("height", String(totalH));
            this.svg.style.height = totalH + "px";
            this.svg.setAttribute("viewBox", `0 0 ${width} ${totalH}`);
        }
        barH = Math.max(10, barH);
        const yOf = (i: number) => this.PAD_TOP + i * (barH + gap);
        this.deferred = [];
        this.late = [];

        this.renderXAxis(xScale, minV, maxV, plotH, fmt, PAD_LEFT_H, ls.categoryLabelColor.value.value);
        if (vaH.title) {
            const tt = this.text(PAD_LEFT_H + chartW / 2, this.PAD_TOP + plotH + (vaH.show ? 30 : 14), vaH.title, vaH.fontSize, vaH.color, "middle", "600");
            tt.setAttribute("data-o", "axis");
        }
        if (catTitleH) {
            const ct = this.text(10, this.PAD_TOP + plotH / 2, catTitleH, ls.categoryFontSize.value, ls.categoryLabelColor.value.value, "middle", "600", -90);
            ct.setAttribute("data-o", "catLabels");
        }

        const zeroX = xScale(0);
        this.line(zeroX, this.PAD_TOP, zeroX, this.PAD_TOP + plotH, this.ink.line, 0.8);

        if (ch.showConnectors.value) {
            bars.forEach((bar, i) => {
                if (i === 0) return;
                const connX = xScale(bars[i - 1].running);
                this.line(connX, yOf(i - 1) + barH, connX, yOf(i), this.ink.connector, 0.6, "4 3");
            });
        }

        bars.forEach((bar, i) => {
            if (bar.barType === "subtotal" && !ch.showSubtotals.value) return;

            const y     = yOf(i);
            const xTop  = xScale(bar.top);
            const xBot  = xScale(bar.base);
            const bx    = Math.min(xTop, xBot);
            const bw    = Math.max(2, Math.abs(xTop - xBot));

            const baseFill = bar.conditionalColor || ((bar.barType === "total" || bar.barType === "subtotal")
                ? colors.total : bar.value >= 0 ? colors.pos : colors.neg);
            // La trama solo en las bajadas reales, no en totales ni subtotales:
            // un total negativo es un resultado, no una caida.
            const fill = (hatchDecrease && !highContrast &&
                          bar.barType === "delta" && bar.value < 0)
                ? this.hatchFill(baseFill) : baseFill;

            const isSelected    = selectedIndices.size === 0 || selectedIndices.has(i);
            const isHighlighted = bar.isHighlighted !== false;
            const baseOpacity   = bar.barType === "subtotal" && !ch.showSubtotals.value ? 0.3 : 1;
            const opacity       = (!isSelected || !isHighlighted) ? baseOpacity * 0.25 : baseOpacity;

            const rect = this.el("rect") as SVGRectElement;
            rect.setAttribute("x", String(bx)); rect.setAttribute("y", String(y));
            rect.setAttribute("width", String(bw)); rect.setAttribute("height", String(barH));
            rect.setAttribute("rx", "3"); rect.setAttribute("fill", fill);
            rect.setAttribute("opacity", String(opacity));
            rect.setAttribute("data-bar-index", String(i));
            rect.setAttribute("data-o", "bars");
            rect.setAttribute("tabindex", "0");
            rect.setAttribute("role", "img");
            rect.setAttribute("aria-label", `${bar.label}: ${fmt.format(bar.value, bar.formatString)}`);
            rect.style.cursor = "pointer"; rect.style.transition = "opacity 0.15s";
            this.focusRing(rect);

            rect.addEventListener("mouseenter", () => rect.setAttribute("opacity", "0.72"));
            rect.addEventListener("mouseleave", () => {
                rect.setAttribute("opacity", String(opacity));
                onBarLeave();
            });
            rect.addEventListener("mousemove", (ev: MouseEvent) =>
                onBarHover({ bar, index: i, clientX: ev.clientX, clientY: ev.clientY,
                    selectionId: selectionIds[i] ?? null, multiSelect: ev.ctrlKey || ev.metaKey }));
            rect.addEventListener("click", (ev: MouseEvent) =>
                onBarClick({ bar, index: i, clientX: ev.clientX, clientY: ev.clientY,
                    selectionId: selectionIds[i] ?? null, multiSelect: ev.ctrlKey || ev.metaKey }));
            rect.addEventListener("keydown", (ev: KeyboardEvent) => {
                if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    onBarClick({ bar, index: i, clientX: bx + bw / 2, clientY: y,
                        selectionId: selectionIds[i] ?? null, multiSelect: ev.ctrlKey || ev.metaKey });
                }
            });
            this.svg.appendChild(rect);

            if (ch.showAnomalies.value && summary.anomalies.find(a => a.label === bar.label)) {
                const rA = Math.max(5, this.fz(7) * 0.72) + 2;
                const acx = bx + bw - rA;
                const acy = y + rA;
                const dot = this.el("circle") as SVGCircleElement;
                dot.setAttribute("cx", String(acx)); dot.setAttribute("cy", String(acy));
                dot.setAttribute("r", String(Math.max(5, this.fz(7) * 0.72))); dot.setAttribute("fill", this.hcFg || "#E24B4A");
                dot.setAttribute("stroke", this.hcBg || "#fff"); dot.setAttribute("stroke-width", "1");
                this.svg.appendChild(dot);
                const warn = this.el("text") as SVGTextElement;
                // 1.3: el "!" respeta el tamaño mínimo de texto de Accesibilidad (y el círculo crece con él).
                warn.setAttribute("x", String(acx)); warn.setAttribute("y", String(acy + this.fz(7) * 0.36));
                warn.setAttribute("font-size", String(this.fz(7))); warn.setAttribute("fill", this.hcBg || "#fff");
                warn.setAttribute("text-anchor", "middle"); warn.setAttribute("font-weight", "700");
                warn.textContent = "!"; this.svg.appendChild(warn);
            }

            if (ch.showTarget.value && bar.target != null && bar.barType === "total") this.deferred.push(() => {
                const tx = xScale(bar.target);
                this.line(tx, y - 4, tx, y + barH + 4, colors.target, 1.5, "5 3");
                const tLabel = (ch.targetLabel.value || "Target") +
                    (ch.targetShowValue.value ? " " + fmt.format(bar.target) : "");
                const tW = this.textWidth(tLabel, 9);
                // Centrada se saldria por la derecha en el ultimo tramo del eje.
                const anchor = tx + tW / 2 > width - this.PAD_RIGHT ? "end" : "middle";
                this.halo(this.text(tx, y - 6, tLabel, 9, colors.target, anchor), colors.target);
            });

            if (ls.showLabels.value) this.late.push(() => {
                const label = this.buildLabel(bar, ls.labelMode.value.value as string, fmt);
                const labelX = bar.value >= 0 || bar.barType !== "delta" ? bx + bw + 6 : bx - 6;
                const anchor = bar.value >= 0 || bar.barType !== "delta" ? "start" : "end";
                const labelColor = ls.autoValueLabelColor.value ? baseFill : ls.valueLabelColor.value.value;
                const lt = this.text(labelX, y + barH / 2 + 4, label, ls.fontSize.value, labelColor, anchor, "500");
                lt.setAttribute("data-o", "labels");
                this.halo(lt, labelColor);
            });

            // Si aun asi no cabe -etiqueta larguisima, o fuente muy grande- se
            // recorta a lo que entra. Un corte limpio con puntos suspensivos se
            // lee; que la letra se salga del lienzo, no.
            const fitsChars = Math.floor((PAD_LEFT_H - titleLeft - GUTTER - 10) / (catFsH * 0.60));
            const userMax   = isLicensed ? (ls.labelMaxChars.value ?? 0) : 0;
            const cap       = userMax > 0 ? Math.min(userMax, fitsChars) : fitsChars;
            const catLabel  = this.truncate(
                bar.label.split(/\\n|\n/).join(" "), cap);
            const catColorH = (ls.anchorLabelsMatchBar.value && !highContrast &&
                               (bar.barType === "total" || bar.barType === "subtotal"))
                ? colors.total : ls.categoryLabelColor.value.value;
            this.text(PAD_LEFT_H - 8, y + barH / 2 + 4, catLabel, ls.categoryFontSize.value, catColorH, "end").setAttribute("data-o", "catLabels");
        });
        this.deferred.forEach(f => f());
        this.late.forEach(f => f());
    }

    /** Ajustes del eje de valores (1.2), los pone render() antes de dibujar. */
    private vaSettings = { show: true, gridlines: true, fontSize: 9, color: "#888780", title: "" };
    private catTitle = "";

    private renderYAxis(yScale: (v: number) => number, minY: number, maxY: number,
                        chartW: number, fmt: NumberFormatter, _tickColor: string): void {
        const va = this.vaSettings;
        // 1.3: marcas redondas (1-2-2,5-5 × 10^n), tantas como quepan con aire, y sin etiquetas repetidas.
        const plotH = Math.abs(yScale(minY) - yScale(maxY));
        const { ticks, step } = niceTicks(minY, maxY, Math.max(2, Math.min(6, Math.floor(plotH / (this.fz(va.fontSize) * 3.2)))));
        const labels = fmt.formatAxisTicks(ticks, step);
        ticks.forEach((v, i) => {
            const y = yScale(v);
            if (va.gridlines) this.line(this.PAD_LEFT, y, this.PAD_LEFT + chartW, y, this.ink.grid, 0.5);
            if (va.show) {
                this.text(this.PAD_LEFT - 5, y + 3, labels[i], va.fontSize, va.color, "end").setAttribute("data-o", "axis");
                // Obstáculo para las etiquetas del gráfico (1.3): no se montan sobre las marcas del eje.
                const w = this.textWidth(labels[i], va.fontSize), h = this.fz(va.fontSize);
                this.boxes.push({ x0: this.PAD_LEFT - 5 - w, y0: y + 3 - h * 0.85, x1: this.PAD_LEFT - 3, y1: y + 3 + h * 0.2, bar: -3 });
            }
        });
    }

    private renderXAxis(xScale: (v: number) => number, minV: number, maxV: number,
                        chartH: number, fmt: NumberFormatter, _padLeft: number, _tickColor: string): void {
        const va = this.vaSettings;
        // 1.3: marcas redondas y sin repetir; en horizontal, según el ancho que ocupa cada etiqueta.
        const plotW = Math.abs(xScale(maxV) - xScale(minV));
        const { ticks, step } = niceTicks(minV, maxV, Math.max(2, Math.min(6, Math.floor(plotW / (this.fz(va.fontSize) * 7)))));
        const labels = fmt.formatAxisTicks(ticks, step);
        ticks.forEach((v, i) => {
            const x = xScale(v);
            if (va.gridlines) this.line(x, this.PAD_TOP, x, this.PAD_TOP + chartH, this.ink.grid, 0.5);
            if (va.show) this.text(x, this.PAD_TOP + chartH + 14, labels[i], va.fontSize, va.color, "middle").setAttribute("data-o", "axis");
        });
    }

    private renderLegend(colors: Record<string, string>, textColor: string, fs = 9, baseY = 16, family = ""): void {
        const items = [
            [this.tr("UI_Total", "Total"), colors.total], [this.tr("UI_Increase", "Increase"), colors.pos], [this.tr("UI_Decrease", "Decrease"), colors.neg]
        ];
        // La separacion y el tamano del cuadrito siguen a la fuente. Con 78px
        // fijos, subir el tamano hacia que las etiquetas se pisaran entre si.
        const sw   = Math.round(fs * 0.9);
        const step = Math.max(...items.map(([l]) => this.textWidth(String(l), fs))) + sw + 26;
        items.forEach(([label, color], index) => {
            const x = this.PAD_LEFT + index * step;
            const swatch = this.el("rect") as SVGRectElement;
            swatch.setAttribute("x", String(x)); swatch.setAttribute("y", String(baseY - sw));
            swatch.setAttribute("width", String(sw)); swatch.setAttribute("height", String(sw));
            swatch.setAttribute("rx", "1"); swatch.setAttribute("fill", color);
            swatch.setAttribute("data-o", "legend");
            this.svg.appendChild(swatch);
            const lt = this.text(x + sw + 4, baseY, label, fs, textColor, "start");
            lt.setAttribute("data-o", "legend");
            if (family) lt.setAttribute("font-family", family);
        });
    }

    /**
     * Tabla de datos junto al puente.
     *
     * Un waterfall responde "por que" y una tabla responde "cuanto". En un comite
     * se preguntan las dos cosas seguidas, y hasta ahora eso obligaba a poner una
     * matriz al lado: otro visual que filtrar, otro que formatear, y la
     * posibilidad de que los dos no cuenten lo mismo.
     *
     * Se construye con createElement y textContent, nunca con innerHTML: las
     * etiquetas vienen del modelo del usuario.
     */
    private renderDataTable(
            parent: HTMLElement, bars: ComputedBar[], summary: WaterfallSummary,
            fmt: NumberFormatter, ts: VisualFormattingSettingsModel["tableSettings"],
            plan: TablePlan, colors: Record<string, string>, toTheRight: boolean,
            w: number, h: number, textColor: string): void {

        const fs = plan.fs;
        const showRunning = plan.running, showShare = plan.share;

        // Fondo propio para que la tabla se lea como un bloque aparte y no
        // flotando sobre el grafico. En automatico va un tinte neutro que
        // funciona sobre fondo claro y oscuro, porque el visual hereda el tema
        // del informe y no sabemos cual es.
        const bg = this.hcBg || (ts.backgroundAuto.value
            ? "rgba(128,128,128,0.10)" : ts.backgroundColor.value.value);
        // El separador va del lado por el que la tabla toca el grafico.
        const border = ts.showBorder.value
            ? (toTheRight ? "border-left:1px solid rgba(128,128,128,0.35);"
                          : "border-top:1px solid rgba(128,128,128,0.35);")
            : "";

        const wrap = document.createElement("div");
        wrap.className = "wf-data-table";
        wrap.setAttribute("data-o", "table");
        wrap.style.cssText = (toTheRight
            ? `flex:0 0 auto;width:${w}px;height:${h}px;overflow:auto;box-sizing:border-box;padding:4px 8px;`
            : `width:100%;height:${h}px;overflow:auto;box-sizing:border-box;padding:6px 8px 4px;`)
            + `background:${bg};border-radius:6px;${border}`;

        const table = document.createElement("table");
        table.style.cssText =
            `border-collapse:collapse;width:100%;table-layout:fixed;font-size:${fs}px;font-family:${this.font};color:${textColor}`;
        // Anchos fijos: los números, lo que miden; el nombre, el resto (con "…" si no cabe).
        const cg = document.createElement("colgroup");
        [0, plan.valueW].concat(showRunning ? [plan.runningW] : [], showShare ? [plan.shareW] : []).forEach((cw, i) => {
            const c = document.createElement("col");
            if (i) c.style.width = cw + "px";
            cg.appendChild(c);
        });
        table.appendChild(cg);

        const num = (el: HTMLElement) => {
            el.style.textAlign = "right";
            el.style.whiteSpace = "nowrap";
            el.style.paddingLeft = "10px";
        };

        const head = document.createElement("tr");
        const cols = [""].concat([this.tr("UI_Value", "Value")],
            showRunning ? [this.tr("UI_Running", "Running")] : [],
            showShare ? [this.tr("UI_PctOpen", "% open")] : []);
        cols.forEach((label, i) => {
            const th = document.createElement("th");
            th.textContent = label;
            th.style.cssText =
                `text-align:${i ? "right" : "left"};font-weight:600;opacity:.7;` +
                `padding:2px 0 4px;border-bottom:1px solid currentColor;` +
                `position:sticky;top:0;background:${bg}`;
            if (i) num(th);
            head.appendChild(th);
        });
        table.appendChild(head);

        const opening = summary.initialValue || 0;

        bars.forEach(bar => {
            const tr = document.createElement("tr");
            const anchor = bar.barType === "total" || bar.barType === "subtotal";

            const name = document.createElement("td");
            name.textContent = bar.label.split(/\\n|\n/).join(" ");
            name.style.cssText =
                `padding:2px 0;${anchor ? "font-weight:600;" : ""}` +
                `overflow:hidden;text-overflow:ellipsis;white-space:nowrap`;
            name.title = bar.label;          // el nombre completo, al pasar el raton
            tr.appendChild(name);

            const val = document.createElement("td");
            val.textContent = fmt.format(bar.value);
            num(val);
            val.style.padding = "2px 0";
            if (anchor) val.style.fontWeight = "600";
            // Los drivers llevan el color de su signo; los anclajes no, porque un
            // total negativo es un resultado, no una caida.
            else val.style.color = bar.value >= 0 ? colors.pos : colors.neg;
            tr.appendChild(val);

            if (showRunning) {
                const run = document.createElement("td");
                run.textContent = fmt.format(bar.running);
                num(run); run.style.padding = "2px 0"; run.style.opacity = ".8";
                tr.appendChild(run);
            }
            if (showShare) {
                const sh = document.createElement("td");
                sh.textContent = opening ? (bar.value / opening * 100).toFixed(1) + "%" : "—";
                num(sh); sh.style.padding = "2px 0"; sh.style.opacity = ".8";
                tr.appendChild(sh);
            }

            if (anchor) tr.style.borderTop = "1px solid currentColor";
            table.appendChild(tr);
        });

        wrap.appendChild(table);
        parent.appendChild(wrap);
    }

    /**
     * Plan de la tabla (1.3): qué columnas caben y con qué fuente, sin scroll. Orden: todas a la fuente elegida; sin
     * % apertura; sin Acumulado; y luego se baja la fuente (hasta el mínimo de Accesibilidad, nunca por debajo de 8)
     * hasta que quepa a lo ancho y a lo alto. Si ni así cabe, la última opción (y la tabla hará scroll).
     */
    private planTable(bars: ComputedBar[], summary: WaterfallSummary, fmt: NumberFormatter,
                      ts: VisualFormattingSettingsModel["tableSettings"], availW: number, availH: number): TablePlan {
        const opening = summary.initialValue || 0;
        const colW = (head: string, vals: string[], fs: number) =>
            Math.ceil(Math.max(this.textWidth(head, fs), ...vals.map(v => this.textWidth(v, fs)))) + 10;
        const names = bars.map(b => b.label.split(/\\n|\n/).join(" "));
        const vVals = bars.map(b => fmt.format(b.value)), rVals = bars.map(b => fmt.format(b.running));
        const sVals = bars.map(b => opening ? (b.value / opening * 100).toFixed(1) + "%" : "—");
        const opciones: [boolean, boolean][] = [[!!ts.showRunning.value, !!ts.showShare.value], [!!ts.showRunning.value, false], [false, false]];
        const fs0 = this.fz(ts.fontSize.value), fsMin = Math.min(fs0, Math.max(8, this.minText));
        let last: TablePlan | null = null;
        for (let fs = fs0; fs >= fsMin; fs--) {
            const seen = new Set<string>();
            for (const [running, share] of opciones) {
                const key = running + "|" + share;
                if (seen.has(key)) continue;
                seen.add(key);
                const valueW = colW(this.tr("UI_Value", "Value"), vVals, fs);
                const runningW = running ? colW(this.tr("UI_Running", "Running"), rVals, fs) : 0;
                const shareW = share ? colW(this.tr("UI_PctOpen", "% open"), sVals, fs) : 0;
                const nameMin = Math.min(Math.max(...names.map(n => this.textWidth(n, fs))), fs * 7);
                const nameFull = Math.min(Math.max(...names.map(n => this.textWidth(n, fs))), fs * 14);
                const nums = valueW + runningW + shareW + 18;   // + relleno del contenedor
                const rowsH = (bars.length + 1) * Math.ceil(fs * 1.35 + 5) + 12;
                last = { fs, running, share, valueW, runningW, shareW, needW: Math.ceil(nums + nameFull) };
                if (nums + nameMin <= availW && rowsH <= availH) return last;
            }
        }
        return last;
    }

    private renderVarianceCards(summary: WaterfallSummary, colors: Record<string, string>,
                                fmt: NumberFormatter, ls: VisualFormattingSettingsModel["labelSettings"],
                                cs: VisualFormattingSettingsModel["colorSettings"],
                                cd?: VisualFormattingSettingsModel["cardSettings"]): void {
        const textColor = this.hcFg || (cd && !cd.textColorAuto.value
            ? cd.textColor.value.value : ls.categoryLabelColor.value.value);
        const cardBg = this.hcBg || (cd && !cd.backgroundAuto.value
            ? cd.backgroundColor.value.value
            : "rgba(128,128,128,0.15)");
        const labelFs = this.fz(cd ? cd.labelFontSize.value : 9);
        const valueFs = this.fz(cd ? cd.valueFontSize.value : 13);
        const g = (key: string) => {
            const fallbacks: Record<string, string> = {
                initialTotal: "Initial total", finalTotal: "Final total",
                variance: "Variance %", biggestGain: "Biggest gain",
                biggestLoss: "Biggest loss", base: "base", vsBase: "vs base"
            };
            return this.tr(key, fallbacks[key] ?? key);
        };

        const row = document.createElement("div");
        row.style.cssText = "display:flex;gap:6px;padding:6px 0 0;flex-wrap:wrap;box-sizing:border-box";
        row.setAttribute("data-o", "cards");

        const varPct = (summary.totalDeltaRel >= 0 ? "+" : "") + summary.totalDeltaRel.toFixed(1) + "%";

        const cards: { label: string; value: string; sub: string; subColor: string }[] = [
            { label: g("initialTotal"), value: fmt.format(summary.initialValue), sub: g("base"), subColor: textColor },
            { label: g("finalTotal"), value: fmt.format(summary.finalValue),
              sub: (summary.totalDelta >= 0 ? "▲ " : "▼ ") + fmt.format(Math.abs(summary.totalDelta)),
              subColor: summary.totalDelta >= 0 ? colors.pos : colors.neg },
            { label: g("variance"), value: varPct, sub: fmt.formatDelta(summary.totalDelta),
              subColor: summary.totalDelta >= 0 ? colors.pos : colors.neg },
            { label: g("biggestGain"),
              value: summary.biggestGain ? summary.biggestGain.label.replace(/\\n|\n/g, " ") : "—",
              sub: summary.biggestGain ? fmt.formatDelta(summary.biggestGain.value) : "", subColor: colors.pos },
            { label: g("biggestLoss"),
              value: summary.biggestLoss ? summary.biggestLoss.label.replace(/\\n|\n/g, " ") : "—",
              sub: summary.biggestLoss ? fmt.formatDelta(summary.biggestLoss.value) : "", subColor: colors.neg }
        ];

        cards.forEach(c => {
            const card = document.createElement("div");
            card.style.cssText = `flex:1;min-width:88px;background:${cardBg};border-radius:6px;padding:6px 10px;box-sizing:border-box;font-family:${this.font}` +
                (this.hcFg ? `;border:1px solid ${this.hcFg}` : "");
            const lbl = document.createElement("div");
            lbl.style.cssText = `font-size:${labelFs}px;color:${textColor};opacity:0.75;margin-bottom:2px;text-transform:uppercase;letter-spacing:.3px`;
            lbl.textContent = c.label;
            const val = document.createElement("div");
            val.style.cssText = `font-size:${valueFs}px;font-weight:600;color:${textColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`;
            val.textContent = c.value;
            const sub = document.createElement("div");
            sub.style.cssText = `font-size:${this.fz(10)}px;color:${c.subColor};margin-top:1px`;
            sub.textContent = c.sub;
            card.appendChild(lbl); card.appendChild(val); card.appendChild(sub);
            row.appendChild(card);
        });

        this.container.appendChild(row);
    }

    private buildLabel(bar: ComputedBar, mode: string, fmt: NumberFormatter): string {
        if (bar.barType === "total" || bar.barType === "subtotal") return fmt.format(bar.top, bar.formatString);
        const deltaStr = fmt.formatDelta(bar.value, bar.formatString);
        const relStr   = (bar.value >= 0 ? "+" : "") + Math.abs(bar.deltaRel).toFixed(1) + "%";
        if (mode === "abs") return deltaStr;
        if (mode === "rel") return relStr;
        return deltaStr + " / " + relStr;
    }

    private renderEmpty(): void {
        const p = document.createElement("p");
        p.style.cssText = "font-size:12px;color:#888;padding:20px;margin:0";
        p.textContent   = this.tr("landingHint", "Connect Category and Value to render the waterfall");
        this.container.appendChild(p);
    }

    /**
     * Trama diagonal para las bajadas.
     *
     * La WCAG 1.4.1 pide que el color no sea el unico medio de transmitir
     * informacion. En un bridge, subida y bajada es LA informacion, y hoy se
     * distinguen solo por el color. Con la trama activada, una bajada sigue
     * leyendose en blanco y negro, en una impresion o con daltonismo.
     *
     * Devuelve el fill que hay que aplicar: url(#id) si hay trama, o el color.
     */
    private hatchFill(color: string): string {
        const id = "wf-hatch-" + color.replace(/[^a-zA-Z0-9]/g, "");
        let defs: Element | null = this.svg.querySelector("defs");
        if (!defs) {
            defs = this.el("defs");
            this.svg.insertBefore(defs, this.svg.firstChild);
        }
        if (!defs.querySelector("#" + id)) {
            const pat = this.el("pattern");
            pat.setAttribute("id", id);
            pat.setAttribute("width", "6");
            pat.setAttribute("height", "6");
            pat.setAttribute("patternUnits", "userSpaceOnUse");
            pat.setAttribute("patternTransform", "rotate(45)");
            const bg = this.el("rect");
            bg.setAttribute("width", "6"); bg.setAttribute("height", "6");
            bg.setAttribute("fill", color);
            pat.appendChild(bg);
            const stripe = this.el("rect");
            stripe.setAttribute("width", "2.2"); stripe.setAttribute("height", "6");
            stripe.setAttribute("fill", "rgba(255,255,255,0.55)");
            pat.appendChild(stripe);
            defs.appendChild(pat);
        }
        return `url(#${id})`;
    }

    private makeSVG(w: number, h: number): SVGSVGElement {
        const svg = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
        svg.setAttribute("width", "100%"); svg.setAttribute("height", String(h));
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.style.display = "block";
        return svg;
    }

    private el(tag: string): Element { return document.createElementNS(SVG_NS, tag); }

    /** 1.3 (vertical): etiquetas por orden de prioridad y cajas ocupadas (barras y etiquetas ya puestas). */
    private queue: { p: number; f: () => void }[] = [];
    private boxes: { x0: number; y0: number; x1: number; y1: number; bar: number }[] = [];

    /** Caja de un texto centrado en cx con la línea base en by. */
    private boxAt(cx: number, by: number, w: number, h: number): { x0: number; y0: number; x1: number; y1: number } {
        return { x0: cx - w / 2, y0: by - h * 1.0, x1: cx + w / 2, y1: by + h * 0.35 };   // la caja que ocupa el texto en pantalla (~1,35 em)
    }

    /** ¿La caja cabe en el lienzo sin tocar ninguna ocupada? ownBar: la barra que se puede pisar (dentro de ella). */
    private isFree(b: { x0: number; y0: number; x1: number; y1: number }, ownBar: number, w: number, h: number): boolean {
        if (b.x0 < 0 || b.x1 > w || b.y0 < 0 || b.y1 > h) return false;
        return !this.boxes.some(o => o.bar !== ownBar && b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
    }

    /** Luminancia aproximada de un color #RRGGBB (0 negro … 1 blanco); otro formato cuenta como oscuro. */
    private luminance(c: string): number {
        const m = /^#?([0-9a-f]{6})$/i.exec(String(c || "").trim());
        if (!m) return 0;
        const n = parseInt(m[1], 16);
        return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    }

    /** Lo que se dibuja encima de todas las barras (objetivo). */
    private deferred: (() => void)[] = [];
    /** Lo último: etiquetas de valor, por encima del objetivo. */
    private late: (() => void)[] = [];

    private darkBg = false;
    /** Alto contraste (Windows o forzado en Accesibilidad): todo el texto y las líneas en primer plano. */
    private hcFg = "";
    private hcBg = "";
    private minText = 6;
    private font = "Segoe UI, sans-serif";
    private ink = { grid: "#e8e8e6", line: "#888780", connector: "#bbb" };
    private focus = { color: "#005A9E", width: 2 };

    /** Tamaño de texto con el mínimo de la tarjeta Accesibilidad (1.3). */
    private scale = 1;
    private fz(px: number): number {
        const v = Number(px) || this.minText;
        return Math.max(this.minText, Math.min(v, Math.max(8, Math.round(v * this.scale * 2) / 2)));
    }

    /** Foco de teclado en una barra: color y grosor de la tarjeta Accesibilidad (1.3). */
    private focusRing(rect: SVGRectElement): void {
        rect.addEventListener("focus", () => {
            rect.setAttribute("stroke", this.focus.color);
            rect.setAttribute("stroke-width", String(Math.min(6, Math.max(1, this.focus.width || 2))));
        });
        rect.addEventListener("blur", () => { rect.removeAttribute("stroke"); rect.removeAttribute("stroke-width"); });
    }

    /**
     * Halo detrás del texto para que se lea al cruzar una línea o una barra. Va del color del FONDO del informe, no del
     * texto: claro siempre, oscuro solo con la plantilla para fondo oscuro (un halo oscuro emborronaba sobre blanco).
     */
    private halo(t: SVGTextElement, _color: string): void {
        t.setAttribute("stroke", this.hcBg || (this.darkBg ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)"));
        t.setAttribute("stroke-width", "3");
        t.setAttribute("stroke-linejoin", "round");
        t.setAttribute("paint-order", "stroke");
    }

    private line(x1: number, y1: number, x2: number, y2: number,
                 stroke: string, sw = 0.5, dash?: string): void {
        const l = this.el("line") as SVGLineElement;
        l.setAttribute("x1", String(x1)); l.setAttribute("y1", String(y1));
        l.setAttribute("x2", String(x2)); l.setAttribute("y2", String(y2));
        l.setAttribute("stroke", this.hcFg || stroke); l.setAttribute("stroke-width", String(sw));
        if (dash) l.setAttribute("stroke-dasharray", dash);
        this.svg.appendChild(l);
    }

    /**
     * Recorta una etiqueta a n caracteres, cortando por palabra cuando puede.
     * Cortar a mitad de palabra ahorra pixeles y cuesta comprension.
     */
    private truncate(label: string, maxChars: number): string {
        if (maxChars <= 0 || label.length <= maxChars) return label;
        const cut = label.slice(0, maxChars);
        const space = cut.lastIndexOf(" ");
        return (space > maxChars * 0.6 ? cut.slice(0, space) : cut).trimEnd() + "…";
    }

    /**
     * Ancho aproximado de un texto. Sin medirlo en el DOM: getBBox fuerza un
     * reflow por etiqueta, y con veinte barras eso se nota. 0.55em por caracter
     * es una aproximacion conservadora para Segoe UI.
     */
    /** Ancho real del texto en el lienzo (para colocar etiquetas sin solapes); si el navegador no lo da, la estimación. */
    private measure(label: string, fs: number, weight = "400"): number {
        const t = this.text(-9999, -9999, label, fs, "#000", "start", weight);
        let w = 0;
        try { w = t.getComputedTextLength(); } catch { w = 0; }
        t.remove();
        return w > 0 ? w : this.textWidth(label, fs) * 0.92;
    }

    private textWidth(label: string, fs: number, weight = "600"): number {
        // 1.3: se mide con la letra real del estilo (Georgia en Ledger y Editorial es bastante más ancha que Segoe UI)
        // y en negrita, que es lo más ancho que se pinta, con un 6 % de margen. Si el lienzo no mide, 0,60 em por
        // carácter, que basta para Segoe UI.
        const px = this.fz(fs);
        try {
            const c = WaterfallRenderer.ctx || (WaterfallRenderer.ctx = document.createElement("canvas").getContext("2d"));
            if (c) {
                c.font = `${weight} ${px}px ${this.font}`;
                const w = c.measureText(label).width;
                if (w > 0) return w * 1.06;
            }
        } catch { /* sin lienzo: estimación */ }
        return label.length * px * 0.60;
    }
    private static ctx: CanvasRenderingContext2D | null = null;

    private text(x: number, y: number, content: string, fs: number,
                 fill: string, anchor = "middle", weight = "400", rotate = 0): SVGTextElement {
        const t = this.el("text") as SVGTextElement;
        t.setAttribute("x", String(x)); t.setAttribute("y", String(y));
        t.setAttribute("font-size", String(this.fz(fs))); // En alto contraste todo el texto va en primer plano, salvo el que se escribe a propósito en el fondo (dentro de una barra).
        t.setAttribute("fill", this.hcFg && fill !== this.hcBg ? this.hcFg : fill);
        t.setAttribute("text-anchor", anchor); t.setAttribute("font-weight", weight);
        t.setAttribute("font-family", this.font);
        if (rotate) t.setAttribute("transform", `rotate(${rotate} ${x} ${y})`);
        t.textContent = content; this.svg.appendChild(t);
        return t;
    }
}
