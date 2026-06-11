import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;

export type BarType = "total" | "subtotal" | "delta";

export interface WaterfallBar {
    label:          string;
    value:          number;
    target?:        number;
    barType:        BarType;
    sortOrder?:     number;
    isHighlighted?: boolean;  // true cuando viene filtro entrante de otro visual
    hasHighlight?:  boolean;  // true si hay algún highlight activo en el dataView
}

/**
 * Mapea dataView CATEGORICAL a WaterfallBar[].
 * Maneja highlights entrantes de otros visuals (Filter-in).
 */
export function mapDataView(dataView: DataView): WaterfallBar[] {
    const categorical = dataView?.categorical;
    if (!categorical) return [];

    const categories = categorical.categories ?? [];
    const valCols: powerbi.DataViewValueColumn[] = categorical.values
        ? Array.from(categorical.values)
        : [];

    const catCol       = categories.find(c => c.source?.roles?.["category"]);
    const sortOrderCol = categories.find(c => c.source?.roles?.["sortOrder"]);
    const measureCol   = valCols.find(v => v.source?.roles?.["measure"]);
    const targetCol    = valCols.find(v => v.source?.roles?.["target"]);
    const barTypeCol   = valCols.find(v => v.source?.roles?.["barType"]);

    if (!catCol || !measureCol) return [];

    const n = catCol.values.length;

    // Detectar si hay highlights activos — Power BI los envía en measureCol.highlights
    const highlights    = measureCol.highlights;
    const hasHighlight  = highlights != null && highlights.some(h => h != null);

    let bars: WaterfallBar[] = Array.from({ length: n }, (_, i): WaterfallBar => {
        const label     = String(catCol.values[i]     ?? `Item ${i + 1}`);
        const sortOrder = sortOrderCol?.values[i] != null
            ? Number(sortOrderCol.values[i]) : i;
        const typeRaw   = barTypeCol?.values[i] != null
            ? String(barTypeCol.values[i]).toLowerCase().trim() : "";

        // Si hay highlight activo, usar el valor highlight; si no, el valor normal
        const rawValue      = measureCol.values[i];
        const highlightValue = highlights?.[i];
        const value         = hasHighlight
            ? (highlightValue != null ? Number(highlightValue) : 0)
            : Number(rawValue ?? 0);

        // isHighlighted: true si esta barra tiene highlight o no hay ninguno activo
        const isHighlighted = !hasHighlight || highlightValue != null;

        const target = targetCol?.values[i] != null
            ? Number(targetCol.values[i]) : undefined;

        let barType: BarType;
        if      (typeRaw === "total")    barType = "total";
        else if (typeRaw === "subtotal") barType = "subtotal";
        else                             barType = "delta";

        return { label, value, target, barType, sortOrder, isHighlighted, hasHighlight };
    });

    if (sortOrderCol) {
        bars = bars.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }

    if (!barTypeCol) {
        bars[0].barType               = "total";
        bars[bars.length - 1].barType = "total";
    }

    return bars;
}

export function sortByImpact(bars: WaterfallBar[]): WaterfallBar[] {
    if (bars.length < 3) return bars;
    const first  = bars[0];
    const last   = bars[bars.length - 1];
    const middle = bars.slice(1, bars.length - 1);
    const sortedDeltas = middle
        .filter(b => b.barType === "delta")
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const sortedMiddle = middle.map(b =>
        b.barType === "delta" ? sortedDeltas.shift()! : b
    );
    return [first, ...sortedMiddle, last];
}
