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
}

interface RenderOptions {
    container:     HTMLElement;
    bars:          ComputedBar[];
    summary:       WaterfallSummary;
    settings:      VisualFormattingSettingsModel;
    selectionIds:  (powerbi.visuals.ISelectionId | null)[];
    selectedIdx:   number | null;
    width:         number;
    height:        number;
    onBarClick:    (data: ClickEventData) => void;
    onContextMenu: (data: ClickEventData) => void;
    onBarHover:    (data: ClickEventData) => void;
    onBarLeave:    () => void;
}

export class WaterfallRenderer {

    private svg!:      SVGSVGElement;
    private container: HTMLElement;
    private loc:       ILocalizationManager;

    private readonly PAD_LEFT  = 52;
    private readonly PAD_RIGHT = 16;
    private readonly PAD_TOP   = 28;
    private readonly CARD_H    = 76;

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

        const { bars, summary, settings, selectionIds, selectedIdx, width, height,
                onBarClick, onContextMenu, onBarHover, onBarLeave } = opts;
        if (bars.length === 0) { this.renderEmpty(); return; }

        const fmt = new NumberFormatter(settings);
        const cs  = settings.colorSettings;
        const ls  = settings.labelSettings;
        const ch  = settings.chartSettings;

        const colors = {
            pos:    cs.positiveColor.value.value,
            neg:    cs.negativeColor.value.value,
            total:  cs.totalColor.value.value,
            target: cs.targetColor.value.value,
        };

        const showCards     = ch.showVarianceCards.value;
        const maxLabelLines = Math.max(...bars.map(b => b.label.split(/\\n|\n/).length));
        const PAD_BOTTOM    = 20 + maxLabelLines * 15;

        const svgH   = showCards ? height - this.CARD_H : height;
        const chartW = width  - this.PAD_LEFT - this.PAD_RIGHT;
        const chartH = svgH   - this.PAD_TOP  - PAD_BOTTOM;

        const [minY, maxY] = computeYDomain(bars);
        const yRange = maxY - minY;
        const yScale = (v: number) =>
            this.PAD_TOP + chartH - ((v - minY) / yRange) * chartH;

        const n    = bars.length;
        const gap  = Math.max(4, Math.min(10, chartW * 0.015));
        const barW = Math.max(10, (chartW - gap * (n - 1)) / n);
        const xOf  = (i: number) => this.PAD_LEFT + i * (barW + gap);

        this.svg = this.makeSVG(width, svgH);
        this.container.appendChild(this.svg);

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

        this.renderYAxis(yScale, minY, maxY, chartW, fmt);

        const zeroY = yScale(0);
        this.line(this.PAD_LEFT, zeroY, this.PAD_LEFT + chartW, zeroY, "#888780", 0.8);

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

            const fill = (bar.barType === "total" || bar.barType === "subtotal")
                ? colors.total : bar.value >= 0 ? colors.pos : colors.neg;

            const isSelected    = selectedIdx === null || selectedIdx === i;
            const isHighlighted = bar.isHighlighted !== false;
            const baseOpacity   = bar.barType === "subtotal" && !ch.showSubtotals.value ? 0.3 : 1;
            const opacity       = (!isSelected || !isHighlighted) ? baseOpacity * 0.25 : baseOpacity;

            const rect = this.el("rect") as SVGRectElement;
            rect.setAttribute("x", String(x)); rect.setAttribute("y", String(yTop));
            rect.setAttribute("width", String(barW)); rect.setAttribute("height", String(bh));
            rect.setAttribute("rx", "3"); rect.setAttribute("fill", fill);
            rect.setAttribute("opacity", String(opacity));
            rect.style.cursor = "pointer"; rect.style.transition = "opacity 0.15s";

            rect.addEventListener("mouseenter", () => rect.setAttribute("opacity", "0.72"));
            rect.addEventListener("mouseleave", () => {
                rect.setAttribute("opacity", String(opacity));
                onBarLeave();
            });
            rect.addEventListener("mousemove", (ev: MouseEvent) =>
                onBarHover({ bar, index: i, clientX: ev.clientX, clientY: ev.clientY,
                    selectionId: selectionIds[i] ?? null }));
            rect.addEventListener("click", (ev: MouseEvent) =>
                onBarClick({ bar, index: i, clientX: ev.clientX, clientY: ev.clientY,
                    selectionId: selectionIds[i] ?? null }));
            rect.addEventListener("contextmenu", (ev: MouseEvent) => {
                ev.preventDefault();
                onContextMenu({ bar, index: i, clientX: ev.clientX, clientY: ev.clientY,
                    selectionId: selectionIds[i] ?? null });
            });
            this.svg.appendChild(rect);

            if (summary.anomalies.find(a => a.label === bar.label)) {
                const dot = this.el("circle") as SVGCircleElement;
                dot.setAttribute("cx", String(x + barW / 2)); dot.setAttribute("cy", String(yTop - 9));
                dot.setAttribute("r", "4"); dot.setAttribute("fill", "#E24B4A");
                this.svg.appendChild(dot);
                const warn = this.el("text") as SVGTextElement;
                warn.setAttribute("x", String(x + barW / 2)); warn.setAttribute("y", String(yTop - 6));
                warn.setAttribute("font-size", "7"); warn.setAttribute("fill", "#fff");
                warn.setAttribute("text-anchor", "middle"); warn.setAttribute("font-weight", "700");
                warn.textContent = "!"; this.svg.appendChild(warn);
            }

            if (ch.showTarget.value && bar.target != null && bar.barType === "total") {
                const ty = yScale(bar.target);
                this.line(x - 4, ty, x + barW + 4, ty, colors.target, 1.5, "5 3");
                this.text(x + barW + 6, ty + 3, "▸ tgt", 9, colors.target, "start");
            }

            if (ls.showLabels.value) {
                const label = this.buildLabel(bar, ls.labelMode.value.value as string, fmt);
                this.text(x + barW / 2, yTop - 5, label, ls.fontSize.value, fill, "middle", "500");
            }

            bar.label.split(/\\n|\n/).forEach((line, li) => {
                this.text(x + barW / 2, this.PAD_TOP + chartH + 16 + li * 15,
                    line, 10, "#888780", "middle");
            });
        });

        if (showCards) this.renderVarianceCards(summary, colors, fmt);
    }

    private renderYAxis(yScale: (v: number) => number, minY: number, maxY: number,
                        chartW: number, fmt: NumberFormatter): void {
        for (let t = 0; t <= 5; t++) {
            const v = minY + (maxY - minY) * (t / 5);
            const y = yScale(v);
            this.line(this.PAD_LEFT, y, this.PAD_LEFT + chartW, y, "#e8e8e6", 0.5);
            this.text(this.PAD_LEFT - 5, y + 3, fmt.formatAxis(v), 9, "#999", "end");
        }
    }

    private renderVarianceCards(summary: WaterfallSummary, colors: Record<string, string>,
                                fmt: NumberFormatter): void {
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
            { label: g("initialTotal"), value: fmt.format(summary.initialValue), sub: g("base"), subColor: "#888" },
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
            card.style.cssText = "flex:1;min-width:88px;background:#f5f5f3;border-radius:6px;padding:6px 10px;box-sizing:border-box";
            const lbl = document.createElement("div");
            lbl.style.cssText = "font-size:9px;color:#888;margin-bottom:2px;text-transform:uppercase;letter-spacing:.3px";
            lbl.textContent = c.label;
            const val = document.createElement("div");
            val.style.cssText = "font-size:13px;font-weight:600;color:#252423;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
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

    private text(x: number, y: number, content: string, fs: number,
                 fill: string, anchor = "middle", weight = "400"): void {
        const t = this.el("text") as SVGTextElement;
        t.setAttribute("x", String(x)); t.setAttribute("y", String(y));
        t.setAttribute("font-size", String(fs)); t.setAttribute("fill", fill);
        t.setAttribute("text-anchor", anchor); t.setAttribute("font-weight", weight);
        t.setAttribute("font-family", "Segoe UI, sans-serif");
        t.textContent = content; this.svg.appendChild(t);
    }
}
