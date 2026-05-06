import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;

export type BarType = "total" | "subtotal" | "delta";

export interface WaterfallBar {
    label:          string;
    value:          number;
    target?:        number;
    barType:        BarType;
    sortOrder?:     number;
    isHighlighted?: boolean;
}

/**
 * Mapea dataView CATEGORICAL a WaterfallBar[].
 *
 * categories → "category"  (Grouping, for/in)
 *              "sortOrder" (Grouping, for/in) — sin SUM, valor nativo
 * values     → "measure"  (Measure)
 *              "target"   (Measure, opcional)
 *              "barType"  (Measure — texto, Power BI lo pasa tal cual)
 */
export function mapDataView(dataView: DataView): WaterfallBar[] {
    const categorical = dataView?.categorical;
    if (!categorical) return [];

    const categories = categorical.categories ?? [];
    const valCols: powerbi.DataViewValueColumn[] = categorical.values
        ? Array.from(categorical.values)
        : [];

    // Groupings en categories
    const catCol       = categories.find(c => c.source?.roles?.["category"]);
    const sortOrderCol = categories.find(c => c.source?.roles?.["sortOrder"]);

    // Measures en values
    const measureCol = valCols.find(v => v.source?.roles?.["measure"]);
    const targetCol  = valCols.find(v => v.source?.roles?.["target"]);
    const barTypeCol = valCols.find(v => v.source?.roles?.["barType"]);

    if (!catCol || !measureCol) return [];

    const n = catCol.values.length;

    let bars: WaterfallBar[] = Array.from({ length: n }, (_, i): WaterfallBar => {
        const label     = String(catCol.values[i]     ?? `Item ${i + 1}`);
        const value     = Number(measureCol.values[i] ?? 0);
        const target    = targetCol?.values[i] != null
            ? Number(targetCol.values[i]) : undefined;
        const sortOrder = sortOrderCol?.values[i] != null
            ? Number(sortOrderCol.values[i]) : i;
        const typeRaw   = barTypeCol?.values[i] != null
            ? String(barTypeCol.values[i]).toLowerCase().trim() : "";

        let barType: BarType;
        if      (typeRaw === "total")    barType = "total";
        else if (typeRaw === "subtotal") barType = "subtotal";
        else                             barType = "delta";

        return { label, value, target, barType, sortOrder };
    });

    // Ordenar por sortOrder si está conectado
    if (sortOrderCol) {
        bars = bars.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }

    // Auto-detección de totales si no hay barType conectado
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
