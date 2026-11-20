import { WaterfallBar } from "./dataMapper";

export interface ComputedBar extends WaterfallBar {
    base:     number;   // y inferior de la barra en coordenadas de datos
    top:      number;   // y superior de la barra en coordenadas de datos
    running:  number;   // acumulado tras esta barra
    delta:    number;   // variación vs valor inicial (para etiquetas %)
    deltaRel: number;   // variación relativa % vs valor inicial
}

export interface WaterfallSummary {
    initialValue:  number;
    finalValue:    number;
    totalDelta:    number;
    totalDeltaRel: number;
    biggestGain:   ComputedBar | null;
    biggestLoss:   ComputedBar | null;
    anomalies:     ComputedBar[];
}

/**
 * Calcula la geometría de cada barra (base, top, running).
 *
 * Reglas:
 *   "total" posición 0  → base=0, top=value,   running=value
 *   "total" última pos  → base=0, top=running,  value=running  (muestra acumulado)
 *   "subtotal"          → base=0, top=running,  value=running  (FIX: value normalizado)
 *   "delta" positivo    → base=running, top=running+value
 *   "delta" negativo    → base=running+value, top=running
 */
export function computeBars(bars: WaterfallBar[]): ComputedBar[] {
    let running = 0;
    const n = bars.length;
    const initialValue = bars[0]?.value ?? 0;

    return bars.map((bar, i): ComputedBar => {
        let base: number;
        let top: number;
        let normalizedValue: number;

        if (bar.barType === "total" && i === 0) {
            // Total inicial: ancla el waterfall
            running        = bar.value;
            base           = 0;
            top            = bar.value;
            normalizedValue = bar.value;

        } else if (bar.barType === "total") {
            // Total final: siempre desde cero hasta el acumulado
            base           = 0;
            top            = running;
            normalizedValue = running;   // FIX: value = acumulado real

        } else if (bar.barType === "subtotal") {
            // Snapshot del acumulado, no modifica running
            base           = 0;
            top            = running;
            normalizedValue = running;   // FIX: value normalizado al running actual

        } else {
            // Delta normal
            if (bar.value >= 0) {
                base = running;
                top  = running + bar.value;
            } else {
                base = running + bar.value;
                top  = running;
            }
            running        += bar.value;
            normalizedValue = bar.value;
        }

        // delta y deltaRel: variación respecto al total inicial
        const delta    = (bar.barType === "total" && i > 0) || bar.barType === "subtotal"
            ? top - initialValue
            : bar.value;
        const deltaRel = initialValue !== 0
            ? (delta / Math.abs(initialValue)) * 100
            : 0;

        return {
            ...bar,
            value:    normalizedValue,
            base,
            top,
            running,
            delta,
            deltaRel
        };
    });
}

/**
 * Resumen estadístico del waterfall.
 */
export function computeSummary(computed: ComputedBar[]): WaterfallSummary {
    const totals = computed.filter(b => b.barType === "total");
    const deltas = computed.filter(b => b.barType === "delta");

    const initialValue  = totals[0]?.top  ?? 0;
    const finalValue    = totals[totals.length - 1]?.top ?? 0;
    const totalDelta    = finalValue - initialValue;
    const totalDeltaRel = initialValue !== 0
        ? (totalDelta / Math.abs(initialValue)) * 100
        : 0;

    const biggestGain = deltas
        .filter(b => b.value > 0)
        .sort((a, b) => b.value - a.value)[0] ?? null;

    const biggestLoss = deltas
        .filter(b => b.value < 0)
        .sort((a, b) => a.value - b.value)[0] ?? null;

    // Detección de anomalías: barras cuyo valor se aleja > 2σ de la media de deltas
    const deltaValues = deltas.map(b => b.value);
    const mean = deltaValues.length > 0
        ? deltaValues.reduce((s, v) => s + v, 0) / deltaValues.length
        : 0;
    const variance = deltaValues.length > 0
        ? deltaValues.map(v => Math.pow(v - mean, 2)).reduce((s, v) => s + v, 0) / deltaValues.length
        : 0;
    const std = Math.sqrt(variance);

    const anomalies = std > 0
        ? deltas.filter(b => Math.abs(b.value - mean) > 2 * std)
        : [];

    return {
        initialValue,
        finalValue,
        totalDelta,
        totalDeltaRel,
        biggestGain,
        biggestLoss,
        anomalies
    };
}

/**
 * Dominio Y para el eje, con márgenes para etiquetas y barras negativas.
 *
 * 1.3: si todos los acumulados y totales son >= 0, el eje empieza en 0. Hasta la 1.2 el margen de abajo (8 % del
 * rango) se aplicaba siempre y un P&L todo en positivo bajaba el eje a -1,7 M sin ningún valor negativo. Con algún
 * negativo se mantiene el margen de siempre.
 */
export function computeYDomain(computed: ComputedBar[]): [number, number] {
    const allY  = computed.flatMap(b => [b.base, b.top]);
    const minV  = Math.min(...allY);
    const maxV  = Math.max(...allY);
    const range = maxV - minV || Math.abs(maxV) || 1; // evita range=0
    return [minV >= 0 ? 0 : minV - range * 0.08, maxV + range * 0.15];
}

/**
 * ¿Tienen sentido las tarjetas de resumen (total inicial y final, variación %, mayor subida y mayor bajada)? (1.3)
 *
 * Las tarjetas leen el puente como la comparación de UNA MISMA cifra entre dos momentos (ventas 2025 → ventas 2026).
 * No la hay, y se ocultan, cuando:
 *   1. falta el total de apertura o el de cierre (menos de dos barras "total"), o la apertura es 0: sin las dos
 *      cifras, el total final repite el inicial y la variación sale 0 % o infinita;
 *   2. todos los cambios van en el mismo sentido (solo bajadas o solo subidas): es una descomposición, no una
 *      comparación — el P&L de ventas a EBITDA (solo costes) o una suma desde cero. Ahí la "variación" de -77 % entre
 *      ventas y EBITDA no significa nada y una de las dos tarjetas de mayor cambio sale vacía ("—").
 * Un puente de periodos con cambios en los dos sentidos las conserva. El autor puede mostrarlas siempre apagando
 * Tarjetas de resumen → Ocultar si el puente no es una comparación.
 */
export function cardsMakeSense(computed: ComputedBar[], summary: WaterfallSummary): boolean {
    const totals = computed.filter(b => b.barType === "total");
    if (totals.length < 2 || !summary.initialValue) return false;
    const deltas = computed.filter(b => b.barType === "delta" && b.value !== 0);
    return deltas.some(b => b.value > 0) && deltas.some(b => b.value < 0);
}
