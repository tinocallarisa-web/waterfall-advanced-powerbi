import powerbi from "powerbi-visuals-api";
import { ComputedBar, WaterfallSummary, computeYDomain } from "./waterfallEngine";
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
    highContrast:  boolean;
    contrastForeground: string;
    contrastBackground: string;
    width:         number;
    height:        number;
    onBarClick:    (data: ClickEventData) => void;
    onBarHover:    (data: ClickEventData) => void;
    onBarLeave:    () => void;
}

export class WaterfallRenderer {

    private svg!:        SVGSVGElement;
    private scrollWrap!: HTMLDivElement;
    private container:   HTMLElement;
    private loc:         ILocalizationManager;

    private readonly PAD_LEFT   = 52;
    private readonly PAD_RIGHT  = 16;
    private readonly PAD_TOP    = 28;
    private readonly CARD_H     = 76;
    private readonly MIN_BAR_W  = 22;
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

        const { bars, summary, settings, selectionIds, selectedIndices, isLicensed, highContrast,
            contrastForeground, contrastBackground, width, height,
                onBarClick, onBarHover, onBarLeave } = opts;
        if (bars.length === 0) { this.renderEmpty(); return; }

        const fmt = new NumberFormatter(settings);
        const cs  = settings.colorSettings;
        const ls  = settings.labelSettings;
        const ch  = settings.chartSettings;

        const invert = ch.invertColorSemantics.value;

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
        const ibcs = isLicensed && settings.ibcs.mode.value;
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
        const showCards  = ch.showVarianceCards.value && settings.cardSettings.show.value;
        const svgH       = showCards ? height - this.CARD_H : height;
        const horizontal = ch.orientation.value.value === "horizontal";

        this.scrollWrap = document.createElement("div");
        this.scrollWrap.style.cssText = horizontal
            ? `overflow-y:auto;overflow-x:hidden;width:100%;height:${svgH}px;`
            : `overflow-x:auto;overflow-y:hidden;width:100%;height:${svgH}px;`;

        this.svg = this.makeSVG(width, svgH);
        this.scrollWrap.appendChild(this.svg);
        this.container.appendChild(this.scrollWrap);
        this.renderLegend(colors, highContrast ? contrastForeground : cs.legendTextColor.value.value,
            cs.legendFontSize.value);

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
                highContrast, contrastForeground, width, svgH, onBarClick, onBarHover, onBarLeave,
                cs.patternOnDecrease.value, isLicensed);
        } else {
            this.renderVertical(bars, summary, ch, ls, colors, fmt, selectionIds, selectedIndices,
                highContrast, contrastForeground, width, svgH, onBarClick, onBarHover, onBarLeave,
                cs.patternOnDecrease.value, isLicensed);
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
        const PAD_BOTTOM = Math.min(
            svgH * 0.45,
            Math.max(20 + maxLabelLines * 15, 20 + rotRise));

        const chartW = width - this.PAD_LEFT - this.PAD_RIGHT;
        const chartH = svgH  - this.PAD_TOP  - PAD_BOTTOM;

        const [minY, maxY] = computeYDomain(bars);
        const yRange = maxY - minY;
        const yScale = (v: number) =>
            this.PAD_TOP + chartH - ((v - minY) / yRange) * chartH;

        const n   = bars.length;
        const gap = Math.max(4, Math.min(10, chartW * 0.015));
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
        barW = Math.max(10, barW);
        const xOf = (i: number) => this.PAD_LEFT + i * (barW + gap);

        this.renderYAxis(yScale, minY, maxY, plotW, fmt, ls.categoryLabelColor.value.value);

        const zeroY = yScale(0);
        this.line(this.PAD_LEFT, zeroY, this.PAD_LEFT + plotW, zeroY, "#888780", 0.8);

        if (ch.showConnectors.value) {
            bars.forEach((bar, i) => {
                if (i === 0) return;
                const connY = yScale(bars[i - 1].running);
                this.line(xOf(i - 1) + barW, connY, xOf(i), connY, "#bbb", 0.6, "4 3");
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
            rect.setAttribute("tabindex", "0");
            rect.setAttribute("role", "img");
            rect.setAttribute("aria-label", `${bar.label}: ${fmt.format(bar.value)}`);
            rect.style.cursor = "pointer"; rect.style.transition = "opacity 0.15s";
            rect.addEventListener("focus", () => rect.setAttribute("stroke", highContrast ? contrastForeground : "#252423"));
            rect.addEventListener("blur", () => rect.removeAttribute("stroke"));

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

            if (summary.anomalies.find(a => a.label === bar.label)) {
                const acx = x + barW - 7;
                const acy = yTop + 7;
                const dot = this.el("circle") as SVGCircleElement;
                dot.setAttribute("cx", String(acx)); dot.setAttribute("cy", String(acy));
                dot.setAttribute("r", "5"); dot.setAttribute("fill", "#E24B4A");
                dot.setAttribute("stroke", "#fff"); dot.setAttribute("stroke-width", "1");
                this.svg.appendChild(dot);
                const warn = this.el("text") as SVGTextElement;
                warn.setAttribute("x", String(acx)); warn.setAttribute("y", String(acy + 2.5));
                warn.setAttribute("font-size", "7"); warn.setAttribute("fill", "#fff");
                warn.setAttribute("text-anchor", "middle"); warn.setAttribute("font-weight", "700");
                warn.textContent = "!"; this.svg.appendChild(warn);
            }

            if (ch.showTarget.value && bar.target != null && bar.barType === "total") {
                const ty = yScale(bar.target);
                this.line(x - 4, ty, x + barW + 4, ty, colors.target, 1.5, "5 3");

                // "tgt" no lo entiende nadie fuera de quien programo esto, y el
                // objetivo sin su cifra no dice si se cumple ni por cuanto.
                const tLabel = (ch.targetLabel.value || "Target") +
                    (ch.targetShowValue.value ? " " + fmt.format(bar.target) : "");
                // Si no cabe a la derecha, la etiqueta se pone a la izquierda de
                // la linea en vez de salirse del lienzo.
                const tW = this.textWidth(tLabel, 9);
                const rightRoom = width - (x + barW + 6) - this.PAD_RIGHT;
                if (tW <= rightRoom) {
                    this.text(x + barW + 6, ty + 3, tLabel, 9, colors.target, "start");
                } else {
                    this.text(x - 6, ty + 3, tLabel, 9, colors.target, "end");
                }
            }

            if (ls.showLabels.value) {
                const label = this.buildLabel(bar, ls.labelMode.value.value as string, fmt);
                const labelColor = ls.autoValueLabelColor.value ? fill : ls.valueLabelColor.value.value;
                this.text(x + barW / 2, yTop - 5, label, ls.fontSize.value, labelColor, "middle", "500");
            }

            const rot      = rotDeg;
            const maxChars = isLicensed ? (ls.labelMaxChars.value ?? 0) : 0;
            // Rotada, la etiqueta ya no compite por el ancho de la barra.
            const fitsWidth = rot !== 0 ||
                this.textWidth(bar.label, ls.categoryFontSize.value) <= barW + gap;
            if (!(isLicensed && ls.hideOverlapping.value) || fitsWidth) {
                const anchor = rot ? "end" : "middle";
                this.truncate(bar.label, maxChars).split(/\\n|\n/).forEach((line, li) => {
                    this.text(x + barW / 2, this.PAD_TOP + chartH + 16 + li * 15,
                        line, ls.categoryFontSize.value, ls.categoryLabelColor.value.value,
                        anchor, "400", rot);
                });
            }
        });
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
        const PAD_LEFT_H = Math.min(
            Math.max(width * 0.45, 70),
            Math.max(70, longestH + GUTTER + 10));
        const PAD_BOTTOM_H  = 28;

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

        this.renderXAxis(xScale, minV, maxV, plotH, fmt, PAD_LEFT_H, ls.categoryLabelColor.value.value);

        const zeroX = xScale(0);
        this.line(zeroX, this.PAD_TOP, zeroX, this.PAD_TOP + plotH, "#888780", 0.8);

        if (ch.showConnectors.value) {
            bars.forEach((bar, i) => {
                if (i === 0) return;
                const connX = xScale(bars[i - 1].running);
                this.line(connX, yOf(i - 1) + barH, connX, yOf(i), "#bbb", 0.6, "4 3");
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
            rect.setAttribute("tabindex", "0");
            rect.setAttribute("role", "img");
            rect.setAttribute("aria-label", `${bar.label}: ${fmt.format(bar.value)}`);
            rect.style.cursor = "pointer"; rect.style.transition = "opacity 0.15s";
            rect.addEventListener("focus", () => rect.setAttribute("stroke", highContrast ? contrastForeground : "#252423"));
            rect.addEventListener("blur", () => rect.removeAttribute("stroke"));

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

            if (summary.anomalies.find(a => a.label === bar.label)) {
                const acx = bx + bw - 7;
                const acy = y + 7;
                const dot = this.el("circle") as SVGCircleElement;
                dot.setAttribute("cx", String(acx)); dot.setAttribute("cy", String(acy));
                dot.setAttribute("r", "5"); dot.setAttribute("fill", "#E24B4A");
                dot.setAttribute("stroke", "#fff"); dot.setAttribute("stroke-width", "1");
                this.svg.appendChild(dot);
                const warn = this.el("text") as SVGTextElement;
                warn.setAttribute("x", String(acx)); warn.setAttribute("y", String(acy + 2.5));
                warn.setAttribute("font-size", "7"); warn.setAttribute("fill", "#fff");
                warn.setAttribute("text-anchor", "middle"); warn.setAttribute("font-weight", "700");
                warn.textContent = "!"; this.svg.appendChild(warn);
            }

            if (ch.showTarget.value && bar.target != null && bar.barType === "total") {
                const tx = xScale(bar.target);
                this.line(tx, y - 4, tx, y + barH + 4, colors.target, 1.5, "5 3");
                const tLabel = (ch.targetLabel.value || "Target") +
                    (ch.targetShowValue.value ? " " + fmt.format(bar.target) : "");
                const tW = this.textWidth(tLabel, 9);
                // Centrada se saldria por la derecha en el ultimo tramo del eje.
                const anchor = tx + tW / 2 > width - this.PAD_RIGHT ? "end" : "middle";
                this.text(tx, y - 6, tLabel, 9, colors.target, anchor);
            }

            if (ls.showLabels.value) {
                const label = this.buildLabel(bar, ls.labelMode.value.value as string, fmt);
                const labelX = bar.value >= 0 || bar.barType !== "delta" ? bx + bw + 6 : bx - 6;
                const anchor = bar.value >= 0 || bar.barType !== "delta" ? "start" : "end";
                const labelColor = ls.autoValueLabelColor.value ? fill : ls.valueLabelColor.value.value;
                this.text(labelX, y + barH / 2 + 4, label, ls.fontSize.value, labelColor, anchor, "500");
            }

            // Si aun asi no cabe -etiqueta larguisima, o fuente muy grande- se
            // recorta a lo que entra. Un corte limpio con puntos suspensivos se
            // lee; que la letra se salga del lienzo, no.
            const fitsChars = Math.floor((PAD_LEFT_H - GUTTER - 10) / (catFsH * 0.60));
            const userMax   = isLicensed ? (ls.labelMaxChars.value ?? 0) : 0;
            const cap       = userMax > 0 ? Math.min(userMax, fitsChars) : fitsChars;
            const catLabel  = this.truncate(
                bar.label.split(/\\n|\n/).join(" "), cap);
            this.text(PAD_LEFT_H - 8, y + barH / 2 + 4, catLabel, ls.categoryFontSize.value, ls.categoryLabelColor.value.value, "end");
        });
    }

    private renderYAxis(yScale: (v: number) => number, minY: number, maxY: number,
                        chartW: number, fmt: NumberFormatter, tickColor: string): void {
        for (let t = 0; t <= 5; t++) {
            const v = minY + (maxY - minY) * (t / 5);
            const y = yScale(v);
            this.line(this.PAD_LEFT, y, this.PAD_LEFT + chartW, y, "#e8e8e6", 0.5);
            this.text(this.PAD_LEFT - 5, y + 3, fmt.formatAxis(v), 9, tickColor, "end");
        }
    }

    private renderXAxis(xScale: (v: number) => number, minV: number, maxV: number,
                        chartH: number, fmt: NumberFormatter, padLeft: number, tickColor: string): void {
        for (let t = 0; t <= 5; t++) {
            const v = minV + (maxV - minV) * (t / 5);
            const x = xScale(v);
            this.line(x, this.PAD_TOP, x, this.PAD_TOP + chartH, "#e8e8e6", 0.5);
            this.text(x, this.PAD_TOP + chartH + 14, fmt.formatAxis(v), 9, tickColor, "middle");
        }
    }

    private renderLegend(colors: Record<string, string>, textColor: string, fs = 9): void {
        const items = [
            ["Total", colors.total], ["Increase", colors.pos], ["Decrease", colors.neg]
        ];
        // La separacion y el tamano del cuadrito siguen a la fuente. Con 78px
        // fijos, subir el tamano hacia que las etiquetas se pisaran entre si.
        const sw   = Math.round(fs * 0.9);
        const step = Math.max(...items.map(([l]) => this.textWidth(String(l), fs))) + sw + 26;
        items.forEach(([label, color], index) => {
            const x = this.PAD_LEFT + index * step;
            const swatch = this.el("rect") as SVGRectElement;
            swatch.setAttribute("x", String(x)); swatch.setAttribute("y", String(16 - sw));
            swatch.setAttribute("width", String(sw)); swatch.setAttribute("height", String(sw));
            swatch.setAttribute("rx", "1"); swatch.setAttribute("fill", color);
            this.svg.appendChild(swatch);
            this.text(x + sw + 4, 16, label, fs, textColor, "start");
        });
    }

    private renderVarianceCards(summary: WaterfallSummary, colors: Record<string, string>,
                                fmt: NumberFormatter, ls: VisualFormattingSettingsModel["labelSettings"],
                                cs: VisualFormattingSettingsModel["colorSettings"],
                                cd?: VisualFormattingSettingsModel["cardSettings"]): void {
        const textColor = cd && !cd.textColorAuto.value
            ? cd.textColor.value.value : ls.categoryLabelColor.value.value;
        const cardBg = cd && !cd.backgroundAuto.value
            ? cd.backgroundColor.value.value
            : cs.cardBackgroundAuto.value ? "rgba(128,128,128,0.15)" : cs.cardBackgroundColor.value.value;
        const labelFs = cd ? cd.labelFontSize.value : 9;
        const valueFs = cd ? cd.valueFontSize.value : 13;
        const g = (key: string) => {
            const fallbacks: Record<string, string> = {
                initialTotal: "Initial total", finalTotal: "Final total",
                variance: "Variance %", biggestGain: "Biggest gain",
                biggestLoss: "Biggest loss", base: "base", vsBase: "vs base"
            };
            const loc = this.loc.getDisplayName(key);
            return (loc && loc !== key) ? loc : (fallbacks[key] ?? key);
        };

        const row = document.createElement("div");
        row.style.cssText = "display:flex;gap:6px;padding:6px 0 0;flex-wrap:wrap;box-sizing:border-box";

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
            card.style.cssText = `flex:1;min-width:88px;background:${cardBg};border-radius:6px;padding:6px 10px;box-sizing:border-box`;
            const lbl = document.createElement("div");
            lbl.style.cssText = `font-size:${labelFs}px;color:${textColor};opacity:0.75;margin-bottom:2px;text-transform:uppercase;letter-spacing:.3px`;
            lbl.textContent = c.label;
            const val = document.createElement("div");
            val.style.cssText = `font-size:${valueFs}px;font-weight:600;color:${textColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`;
            val.textContent = c.value;
            const sub = document.createElement("div");
            sub.style.cssText = `font-size:10px;color:${c.subColor};margin-top:1px`;
            sub.textContent = c.sub;
            card.appendChild(lbl); card.appendChild(val); card.appendChild(sub);
            row.appendChild(card);
        });

        this.container.appendChild(row);
    }

    private buildLabel(bar: ComputedBar, mode: string, fmt: NumberFormatter): string {
        if (bar.barType === "total" || bar.barType === "subtotal") return fmt.format(bar.top);
        const deltaStr = fmt.formatDelta(bar.value);
        const relStr   = (bar.value >= 0 ? "+" : "") + Math.abs(bar.deltaRel).toFixed(1) + "%";
        if (mode === "abs") return deltaStr;
        if (mode === "rel") return relStr;
        return deltaStr + " / " + relStr;
    }

    private renderEmpty(): void {
        const p = document.createElement("p");
        p.style.cssText = "font-size:12px;color:#888;padding:20px;margin:0";
        p.textContent   = "Connect a category and a value measure to render the waterfall.";
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

    private line(x1: number, y1: number, x2: number, y2: number,
                 stroke: string, sw = 0.5, dash?: string): void {
        const l = this.el("line") as SVGLineElement;
        l.setAttribute("x1", String(x1)); l.setAttribute("y1", String(y1));
        l.setAttribute("x2", String(x2)); l.setAttribute("y2", String(y2));
        l.setAttribute("stroke", stroke); l.setAttribute("stroke-width", String(sw));
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
    private textWidth(label: string, fs: number): number {
        // 0.60em por caracter. Segoe UI ronda 0.55 de media, pero la media no
        // sirve aqui: basta con que una etiqueta la pase para que toque el borde.
        // Quedarse corto se ve; sobrar 3px no lo nota nadie.
        return label.length * fs * 0.60;
    }

    private text(x: number, y: number, content: string, fs: number,
                 fill: string, anchor = "middle", weight = "400", rotate = 0): void {
        const t = this.el("text") as SVGTextElement;
        t.setAttribute("x", String(x)); t.setAttribute("y", String(y));
        t.setAttribute("font-size", String(fs)); t.setAttribute("fill", fill);
        t.setAttribute("text-anchor", anchor); t.setAttribute("font-weight", weight);
        t.setAttribute("font-family", "Segoe UI, sans-serif");
        if (rotate) t.setAttribute("transform", `rotate(${rotate} ${x} ${y})`);
        t.textContent = content; this.svg.appendChild(t);
    }
}
