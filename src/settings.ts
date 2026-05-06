import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard  = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;

// ─── Color settings ───────────────────────────────────────────────────────────

class ColorSettings extends FormattingSettingsCard {
    positiveColor = new formattingSettings.ColorPicker({
        name: "positiveColor", displayName: "Increase color",
        value: { value: "#1D9E75" }
    });
    negativeColor = new formattingSettings.ColorPicker({
        name: "negativeColor", displayName: "Decrease color",
        value: { value: "#E24B4A" }
    });
    totalColor = new formattingSettings.ColorPicker({
        name: "totalColor", displayName: "Total / subtotal color",
        value: { value: "#378ADD" }
    });
    targetColor = new formattingSettings.ColorPicker({
        name: "targetColor", displayName: "Target line color",
        value: { value: "#888780" }
    });
    name        = "colorSettings";
    displayName = "Colors";
    slices      = [this.positiveColor, this.negativeColor, this.totalColor, this.targetColor];
}

// ─── Label settings ───────────────────────────────────────────────────────────

class LabelSettings extends FormattingSettingsCard {
    showLabels = new formattingSettings.ToggleSwitch({
        name: "showLabels", displayName: "Show labels", value: true
    });
    labelMode = new formattingSettings.ItemDropdown({
        name: "labelMode", displayName: "Label mode",
        items: [
            { displayName: "Absolute",   value: "abs"  },
            { displayName: "Relative %", value: "rel"  },
            { displayName: "Both",       value: "both" }
        ],
        value: { displayName: "Absolute", value: "abs" }
    });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize", displayName: "Font size", value: 11,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 8  },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 20 }
        }
    });
    name        = "labelSettings";
    displayName = "Labels";
    slices      = [this.showLabels, this.labelMode, this.fontSize];
}

// ─── Number format settings ───────────────────────────────────────────────────

class NumberFormatSettings extends FormattingSettingsCard {
    currencySymbol = new formattingSettings.ItemDropdown({
        name: "currencySymbol", displayName: "Currency symbol",
        items: [
            { displayName: "None",     value: ""  },
            { displayName: "€ Euro",   value: "€" },
            { displayName: "$ Dollar", value: "$" },
            { displayName: "£ Pound",  value: "£" },
            { displayName: "¥ Yen",    value: "¥" }
        ],
        value: { displayName: "None", value: "" }
    });
    symbolPosition = new formattingSettings.ItemDropdown({
        name: "symbolPosition", displayName: "Symbol position",
        items: [
            { displayName: "Prefix", value: "prefix" },
            { displayName: "Suffix", value: "suffix" }
        ],
        value: { displayName: "Prefix", value: "prefix" }
    });
    scaleMode = new formattingSettings.ItemDropdown({
        name: "scaleMode", displayName: "Scale",
        items: [
            { displayName: "Auto",          value: "auto" },
            { displayName: "None",          value: "none" },
            { displayName: "Thousands (k)", value: "k"   },
            { displayName: "Millions (M)",  value: "M"   }
        ],
        value: { displayName: "Auto", value: "auto" }
    });
    decimals = new formattingSettings.NumUpDown({
        name: "decimals", displayName: "Decimals", value: 1,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 4 }
        }
    });
    thousandsSep = new formattingSettings.ToggleSwitch({
        name: "thousandsSep", displayName: "Thousands separator", value: true
    });
    name        = "numberFormat";
    displayName = "Number format";
    slices      = [this.currencySymbol, this.symbolPosition, this.scaleMode, this.decimals, this.thousandsSep];
}

// ─── Chart settings ───────────────────────────────────────────────────────────

class ChartSettings extends FormattingSettingsCard {
    showConnectors = new formattingSettings.ToggleSwitch({
        name: "showConnectors", displayName: "Connector lines", value: true
    });
    showSubtotals = new formattingSettings.ToggleSwitch({
        name: "showSubtotals", displayName: "Show subtotals", value: true
    });
    showTarget = new formattingSettings.ToggleSwitch({
        name: "showTarget", displayName: "Show target", value: true
    });
    showVarianceCards = new formattingSettings.ToggleSwitch({
        name: "showVarianceCards", displayName: "Summary cards", value: true
    });
    sortBars = new formattingSettings.ToggleSwitch({
        name: "sortBars", displayName: "Sort by impact", value: false
    });
    name        = "chartSettings";
    displayName = "Chart";
    slices      = [this.showConnectors, this.showSubtotals, this.showTarget, this.showVarianceCards, this.sortBars];
}

// ─── AI Narrative settings (Finance tier only) ────────────────────────────────

class AISettings extends FormattingSettingsCard {
    aiProvider = new formattingSettings.ItemDropdown({
        name: "aiProvider", displayName: "AI Provider",
        items: [
            { displayName: "Anthropic (Claude)", value: "anthropic" },
            { displayName: "OpenAI (GPT)",       value: "openai"    }
        ],
        value: { displayName: "Anthropic (Claude)", value: "anthropic" }
    });
    apiKey = new formattingSettings.TextInput({
        name:        "apiKey",
        displayName: "API Key",
        placeholder: "sk-ant-... or sk-...",
        value:       ""
    });
    aiLanguage = new formattingSettings.ItemDropdown({
        name: "aiLanguage", displayName: "Narrative language",
        items: [
            { displayName: "English", value: "en" },
            { displayName: "Spanish", value: "es" },
            { displayName: "French",  value: "fr" },
            { displayName: "German",  value: "de" }
        ],
        value: { displayName: "English", value: "en" }
    });
    name        = "aiSettings";
    displayName = "AI Narratives (Finance)";
    slices      = [this.aiProvider, this.apiKey, this.aiLanguage];
}

// ─── Root model ───────────────────────────────────────────────────────────────

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    colorSettings = new ColorSettings();
    labelSettings = new LabelSettings();
    numberFormat  = new NumberFormatSettings();
    chartSettings = new ChartSettings();
    aiSettings    = new AISettings();
    cards         = [
        this.colorSettings,
        this.labelSettings,
        this.numberFormat,
        this.chartSettings,
        this.aiSettings
    ];
}
