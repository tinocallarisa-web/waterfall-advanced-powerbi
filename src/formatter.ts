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

    /** Formatea para el eje (auto-escala). En modo modelo, unidades automáticas sobre la cadena de la medida. */
    formatAxis(v: number, range = Math.abs(v)): string {
        if (this.model) {
            try { return this.fmt(this.columnFormat, range).format(v); } catch { /* cae al formato propio */ }
        }
        const abs  = Math.abs(v);
        const sign = v < 0 ? "−" : "";
        if      (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1) + "M";
        else if (abs >= 1_000)     return sign + (abs / 1_000).toFixed(0) + "k";
        return Math.round(v).toString();
    }

    /** Formatea variación con signo explícito */
    formatDelta(v: number, formatString?: string): string {
        const s = this.format(v, formatString);
        return v >= 0 && !s.startsWith("+") ? "+" + s : s;
    }
}
