import { valueFormatter } from "powerbi-visuals-utils-formattingutils";
import { VisualFormattingSettingsModel } from "./settings";

/**
 * Formateador centralizado. Dos modos:
 *   - "custom" (por defecto, el de 1.1): símbolo, escala y decimales del panel de formato.
 *   - "model" (1.2): la cadena de formato de la medida en el modelo —la dinámica de cada fila si el DAX la decide—
 *     con el idioma del informe, como los visuales nativos.
 */
export class NumberFormatter {

    private symbol:   string;
    private prefix:   boolean;
    private scale:    string;
    private decimals: number;
    private sepMiles: boolean;
    private model:    boolean;
    private cache = new Map<string, valueFormatter.IValueFormatter>();

    constructor(settings: VisualFormattingSettingsModel, private locale?: string, private columnFormat?: string) {
        const nf        = settings.numberFormat;
        this.symbol   = nf.currencySymbol.value.value  as string;
        this.prefix   = (nf.symbolPosition.value.value as string) === "prefix";
        this.scale    = nf.scaleMode.value.value        as string;
        this.decimals = nf.decimals.value;
        this.sepMiles = nf.thousandsSep.value;
        this.model    = (nf.source?.value?.value as string) === "model";
    }

    private fmt(format: string | undefined, value?: number): valueFormatter.IValueFormatter {
        const k = (format ?? "") + "|" + (value ?? "");
        let f = this.cache.get(k);
        if (!f) {
            f = valueFormatter.create({ format: format || "#,0.##", value, cultureSelector: this.locale });
            this.cache.set(k, f);
        }
        return f;
    }

    /** Formatea un valor absoluto (para etiquetas y tooltips). formatString: la de la fila, si el DAX la decide. */
    format(v: number, formatString?: string): string {
        if (this.model) {
            try { return this.fmt(formatString || this.columnFormat).format(v); } catch { /* cae al formato propio */ }
        }
        const neg  = v < 0;
        const abs  = Math.abs(v);
        const sign = neg ? "−" : "";

        let scaled: number;
        let suffix: string;

        if (this.scale === "auto") {
            if      (abs >= 1_000_000) { scaled = abs / 1_000_000; suffix = "M"; }
            else if (abs >= 1_000)     { scaled = abs / 1_000;     suffix = "k"; }
            else                       { scaled = abs;             suffix = "";  }
        } else if (this.scale === "M") {
            scaled = abs / 1_000_000; suffix = "M";
        } else if (this.scale === "k") {
            scaled = abs / 1_000; suffix = "k";
        } else {
            scaled = abs; suffix = "";
        }

        let numStr: string;
        if (suffix === "" && this.sepMiles) {
            numStr = scaled.toLocaleString(this.locale || undefined, {
                minimumFractionDigits: this.decimals,
                maximumFractionDigits: this.decimals
            });
        } else {
            numStr = scaled.toFixed(this.decimals);
        }

        const withSuffix = numStr + suffix;
        const withSymbol = this.symbol
            ? (this.prefix ? this.symbol + withSuffix : withSuffix + this.symbol)
            : withSuffix;

        return sign + withSymbol;
    }

    /**
     * Etiquetas de las marcas del eje (1.3), todas con la misma unidad y los decimales justos para que dos marcas nunca
     * se repitan (antes "1k" salía dos veces: 950 y 1.100 redondeaban igual). Unidad: la mayor (M, k) con la que el
     * paso se escribe con un decimal como mucho; si no, sin unidad (0, 250, 500, 750, 1.000). En modo modelo, la cadena
     * de la medida con unidades automáticas, subiendo la precisión hasta que no se repitan; si no lo logra, la propia.
     */
    formatAxisTicks(ticks: number[], step: number): string[] {
        const range = Math.max(...ticks.map(Math.abs), 0);
        const unico = (l: string[]) => new Set(l).size === l.length;
        if (this.model) {
            for (let p = -1; p <= 4; p++) {
                try {
                    const f = valueFormatter.create({ format: this.columnFormat || "#,0.##", value: range, cultureSelector: this.locale,
                        ...(p >= 0 ? { precision: p } : {}) } as any);
                    const l = ticks.map(v => f.format(v));
                    if (unico(l)) return l;
                } catch { break; }
            }
        }
        const dec = (x: number): number => {
            for (let d = 0; d <= 3; d++) if (Math.abs(Math.round(x * Math.pow(10, d)) - x * Math.pow(10, d)) < 1e-6) return d;
            return 3;
        };
        const unidades: [number, string][] = this.scale === "M" ? [[1e6, "M"]] : this.scale === "k" ? [[1e3, "k"]]
            : this.scale === "none" ? [[1, ""]] : [[1e6, "M"], [1e3, "k"], [1, ""]];
        let [u, suf] = unidades[unidades.length - 1];
        if (unidades.length > 1) {
            const ok = unidades.find(([uu]) => uu <= Math.max(range, 1) && dec(step / uu) <= 1);
            if (ok) [u, suf] = ok;
        }
        const d = Math.min(3, dec(step / u));
        return ticks.map(v => {
            if (v === 0) return "0";
            const abs = Math.abs(v) / u;
            const num = suf === "" && this.sepMiles
                ? abs.toLocaleString(this.locale || undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
                : abs.toLocaleString(this.locale || undefined, { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false });
            const conSuf = num + suf;
            return (v < 0 ? "−" : "") + (this.symbol ? (this.prefix ? this.symbol + conSuf : conSuf + this.symbol) : conSuf);
        });
    }

    /** Formatea variación con signo explícito */
    formatDelta(v: number, formatString?: string): string {
        const s = this.format(v, formatString);
        return v >= 0 && !s.startsWith("+") ? "+" + s : s;
    }
}
