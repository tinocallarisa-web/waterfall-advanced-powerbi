import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard  = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;

// ─── Color settings ───────────────────────────────────────────────────────────

class ColorSettings extends FormattingSettingsCard {
    colorBlindSafe = new formattingSettings.ToggleSwitch({
        name: "colorBlindSafe", displayName: "Colour-blind safe palette",
        value: false
    });
    patternOnDecrease = new formattingSettings.ToggleSwitch({
        name: "patternOnDecrease", displayName: "Hatch decreases",
        value: false
    });
    // El formato condicional necesita LAS DOS cosas, e instanceKind solo es la
    // trampa: hace aparecer el boton fx mientras Power BI sigue sin un ambito
    // donde escribir la regla resuelta, asi que no llega nada al dataView.
    //
    //   instanceKind 3 = VisualEnumerationInstanceKinds.ConstantOrRule
    //                    (const enum: no se puede referenciar en tiempo de ejecucion)
    //   selector       = dataViewWildcard.createDataViewWildcardSelector(
    //                        DataViewWildcardMatchingOption.InstancesAndTotals)
    //
    // Con el selector puesto, Power BI resuelve la regla por categoria y devuelve
    // los colores en categorical.categories[0].objects[i].
    positiveColor = new formattingSettings.ColorPicker({
        name: "positiveColor", displayName: "Increase color",
        value: { value: "#1D9E75" },
        selector: { data: [{ dataViewWildcard: { matchingOption: 0 } }] } as any,
        instanceKind: 3
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
    legendFontSize = new formattingSettings.NumUpDown({
        name: "legendFontSize", displayName: "Legend font size", value: 9,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 7  },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 18 }
        }
    });
    legendTextColor = new formattingSettings.ColorPicker({
        name: "legendTextColor", displayName: "Legend text color",
        value: { value: "#777777" }
    });
    cardBackgroundAuto = new formattingSettings.ToggleSwitch({
        name: "cardBackgroundAuto", displayName: "Summary card background: auto (translucent)", value: true
    });
    cardBackgroundColor = new formattingSettings.ColorPicker({
        name: "cardBackgroundColor", displayName: "Summary card background (when not auto)",
        value: { value: "#F5F5F3" }
    });
    name        = "colorSettings";
    displayName = "Colors";
    slices      = [this.colorBlindSafe, this.patternOnDecrease, this.positiveColor, this.negativeColor, this.totalColor, this.targetColor,
        this.legendFontSize, this.legendTextColor, this.cardBackgroundAuto, this.cardBackgroundColor];
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
    autoValueLabelColor = new formattingSettings.ToggleSwitch({
        name: "autoValueLabelColor", displayName: "Value label color: match bar", value: true
    });
    valueLabelColor = new formattingSettings.ColorPicker({
        name: "valueLabelColor", displayName: "Value label color (when not matching bar)",
        value: { value: "#252423" }
    });
    categoryLabelColor = new formattingSettings.ColorPicker({
        name: "categoryLabelColor", displayName: "Category / axis label color",
        value: { value: "#888780" }
    });
    // Densidad de etiquetas. Un waterfall no falla por calcular mal, falla por
    // saturarse: quince categorias con nombres de linea de P&L y sus importes no
    // caben, se solapan y el grafico deja de leerse. Pesa mas todavia en packs
    // exportados a PDF, que es donde se consumen estos informes.
    labelRotation = new formattingSettings.ItemDropdown({
        name: "labelRotation", displayName: "Category label angle (Pro)",
        items: [
            { displayName: "Horizontal",   value: "0"  },
            { displayName: "Tilted (-30°)", value: "-30" },
            { displayName: "Tilted (-45°)", value: "-45" },
            { displayName: "Vertical (-90°)", value: "-90" }
        ],
        value: { displayName: "Horizontal", value: "0" }
    });
    labelMaxChars = new formattingSettings.NumUpDown({
        name: "labelMaxChars", displayName: "Truncate category labels at (Pro)", value: 0,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0  },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 60 }
        }
    });
    hideOverlapping = new formattingSettings.ToggleSwitch({
        name: "hideOverlapping", displayName: "Hide labels that do not fit (Pro)", value: false
    });
    categoryFontSize = new formattingSettings.NumUpDown({
        name: "categoryFontSize", displayName: "Category label font size", value: 10,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 8  },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 18 }
        }
    });
    name        = "labelSettings";
    displayName = "Labels";
    slices      = [this.showLabels, this.labelMode, this.fontSize,
        this.autoValueLabelColor, this.valueLabelColor, this.categoryLabelColor, this.categoryFontSize,
        this.labelRotation, this.labelMaxChars, this.hideOverlapping];
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
    targetLabel = new formattingSettings.TextInput({
        name: "targetLabel", displayName: "Target label",
        placeholder: "Target", value: "Target"
    });
    targetShowValue = new formattingSettings.ToggleSwitch({
        name: "targetShowValue", displayName: "Show target value", value: true
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
    invertColorSemantics = new formattingSettings.ToggleSwitch({
        name: "invertColorSemantics", displayName: "Invert increase/decrease colors",
        value: false
    });
    maxCategories = new formattingSettings.NumUpDown({
        name: "maxCategories", displayName: "Max drivers shown (0 = no limit)", value: 0,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0  },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 50 }
        }
    });
    otherLabel = new formattingSettings.TextInput({
        name: "otherLabel", displayName: "\"Others\" bar label",
        placeholder: "Others", value: "Others"
    });
    orientation = new formattingSettings.ItemDropdown({
        name: "orientation", displayName: "Orientation",
        items: [
            { displayName: "Vertical",   value: "vertical"   },
            { displayName: "Horizontal", value: "horizontal" }
        ],
        value: { displayName: "Vertical", value: "vertical" }
    });
    name        = "chartSettings";
    displayName = "Chart";
    slices      = [this.showConnectors, this.showSubtotals, this.showTarget, this.targetLabel, this.targetShowValue, this.showVarianceCards,
        this.sortBars, this.invertColorSemantics, this.maxCategories, this.otherLabel, this.orientation];
}

// ─── AI Narrative settings (Finance tier only) ────────────────────────────────

class CardSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show", displayName: "Show summary cards", value: true
    });
    labelFontSize = new formattingSettings.NumUpDown({
        name: "labelFontSize", displayName: "Caption font size", value: 9,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 7  },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 16 }
        }
    });
    valueFontSize = new formattingSettings.NumUpDown({
        name: "valueFontSize", displayName: "Value font size", value: 13,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 9  },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 28 }
        }
    });
    textColorAuto = new formattingSettings.ToggleSwitch({
        name: "textColorAuto", displayName: "Text colour: follow theme", value: true
    });
    textColor = new formattingSettings.ColorPicker({
        name: "textColor", displayName: "Text colour", value: { value: "#252423" }
    });
    backgroundAuto = new formattingSettings.ToggleSwitch({
        name: "backgroundAuto", displayName: "Background: follow theme", value: true
    });
    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor", displayName: "Background", value: { value: "#F3F2F1" }
    });
    name        = "cardSettings";
    displayName = "Summary Cards";
    slices      = [this.show, this.labelFontSize, this.valueFontSize,
        this.textColorAuto, this.textColor, this.backgroundAuto, this.backgroundColor];
}

class IbcsSettings extends FormattingSettingsCard {
    // IBCS es una notacion, no un tema de color: unifica como se leen los
    // informes financieros entre empresas. En monocromo, y con el enfasis en la
    // desviacion, que es lo que se mira en un bridge.
    mode = new formattingSettings.ToggleSwitch({
        name: "mode", displayName: "IBCS mode (Pro)", value: false
    });
    name        = "ibcs";
    displayName = "IBCS";
    slices      = [this.mode];
}

// ─── Root model ───────────────────────────────────────────────────────────────

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    colorSettings = new ColorSettings();
    labelSettings = new LabelSettings();
    numberFormat  = new NumberFormatSettings();
    chartSettings = new ChartSettings();
    cardSettings  = new CardSettings();
    ibcs          = new IbcsSettings();
    cards         = [
        this.colorSettings,
        this.labelSettings,
        this.numberFormat,
        this.chartSettings,
        this.cardSettings,
        this.ibcs
    ];
}
