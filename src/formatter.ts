import { VisualFormattingSettingsModel } from "./settings";

/**
 * Formateador centralizado que aplica símbolo, escala y decimales
 * según la configuración del panel de formato.
 */
export class NumberFormatter {

    private symbol:   string;
    private prefix:   boolean;
    private scale:    string;
    private decimals: number;
    private sepMiles: boolean;

    constructor(settings: VisualFormattingSettingsModel) {
        const nf        = settings.numberFormat;
        this.symbol   = nf.currencySymbol.value.value  as string;
        this.prefix   = (nf.symbolPosition.value.value as string) === "prefix";
        this.scale    = nf.scaleMode.value.value        as string;
        this.decimals = nf.decimals.value;
        this.sepMiles = nf.thousandsSep.value;
    }

    /** Formatea un valor absoluto (para etiquetas y tooltips) */
    format(v: number): string {
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
            numStr = scaled.toLocaleString(undefined, {
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

    /** Formatea para el eje Y (siempre auto-escala, sin símbolo) */
    formatAxis(v: number): string {
        const abs  = Math.abs(v);
        const sign = v < 0 ? "−" : "";
        if      (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1) + "M";
        else if (abs >= 1_000)     return sign + (abs / 1_000).toFixed(0) + "k";
        return Math.round(v).toString();
    }

    /** Formatea variación con signo explícito */
    formatDelta(v: number): string {
        const sign = v >= 0 ? "+" : "";
        return sign + this.format(v);
    }
}
