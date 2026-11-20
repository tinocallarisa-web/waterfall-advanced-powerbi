import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import { dataViewWildcard } from "powerbi-visuals-utils-dataviewutils";

import FormattingSettingsCard  = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;

// Las propiedades publicadas hasta 1.1 no cambian de objeto ni de nombre (informes guardados). La 1.2 añade
// propiedades y tarjetas, y claves de traducción (displayNameKey) a todo: hasta ahora el panel no se traducía.

const rango = (min: number, max: number): any => ({
    minValue: { type: powerbi.visuals.ValidatorType.Min, value: min },
    maxValue: { type: powerbi.visuals.ValidatorType.Max, value: max }
});
const item = (value: string, displayName: string, key: string) => ({ value, displayName, displayNameKey: key }) as any;

// ─── Color settings ───────────────────────────────────────────────────────────

// Tarjeta compuesta (1.2): todo sigue en el objeto colorSettings, solo se agrupa en el panel.
class ColorSettings extends formattingSettings.CompositeCard {
    colorBlindSafe = new formattingSettings.ToggleSwitch({
        name: "colorBlindSafe", displayName: "Colour-blind safe palette", displayNameKey: "colorBlindSafe",
        value: false
    });
    patternOnDecrease = new formattingSettings.ToggleSwitch({
        name: "patternOnDecrease", displayName: "Hatch decreases", displayNameKey: "patternOnDecrease",
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
    // los colores en categorical.categories[0].objects[i]. El color FIJO se guarda a
    // nivel general gracias a altConstantValueSelector null (se pone en getFormattingModel).
    // 1.3: el selector se crea con la función de dataviewutils y no con el literal equivalente
    // ({data:[{dataViewWildcard:{matchingOption:0}}]}): es lo que OKviz detecta como formato condicional.
    positiveColor = new formattingSettings.ColorPicker({
        name: "positiveColor", displayName: "Increase color", displayNameKey: "positiveColor",
        value: { value: "#1D9E75" },
        selector: dataViewWildcard.createDataViewWildcardSelector(dataViewWildcard.DataViewWildcardMatchingOption.InstancesAndTotals) as any,
        instanceKind: 3
    });
    negativeColor = new formattingSettings.ColorPicker({
        name: "negativeColor", displayName: "Decrease color", displayNameKey: "negativeColor",
        value: { value: "#E24B4A" }
    });
    totalColor = new formattingSettings.ColorPicker({
        name: "totalColor", displayName: "Total / subtotal color", displayNameKey: "totalColor",
        value: { value: "#378ADD" }
    });
    targetColor = new formattingSettings.ColorPicker({
        name: "targetColor", displayName: "Target line color", displayNameKey: "targetColor",
        value: { value: "#888780" }
    });
    showLegend = new formattingSettings.ToggleSwitch({
        name: "showLegend", displayName: "Show legend", displayNameKey: "showLegend", value: true
    });
    legendPosition = new formattingSettings.ItemDropdown({
        name: "legendPosition", displayName: "Legend position", displayNameKey: "legendPosition",
        items: [item("top", "Top", "Enum_top"), item("bottom", "Bottom", "Enum_bottom")],
        value: item("top", "Top", "Enum_top")
    });
    legendFontFamily = new formattingSettings.FontPicker({
        name: "legendFontFamily", displayName: "Font", displayNameKey: "fontFamily",
        value: "'Segoe UI', wf_segoe-ui_normal, helvetica, arial, sans-serif"
    });
    legendFontSize = new formattingSettings.NumUpDown({
        name: "legendFontSize", displayName: "Legend font size", displayNameKey: "legendFontSize", value: 9,
        options: rango(7, 18)
    });
    legendTextColor = new formattingSettings.ColorPicker({
        name: "legendTextColor", displayName: "Legend text color", displayNameKey: "legendTextColor",
        value: { value: "#777777" }
    });
    name        = "colorSettings";
    displayName = "Colors";
    displayNameKey = "card_colorSettings";
    groups: formattingSettings.Group[] = [
        new formattingSettings.Group({ name: "grpColors", displayName: "Colors", displayNameKey: "grpColors",
            slices: [this.colorBlindSafe, this.patternOnDecrease, this.positiveColor, this.negativeColor, this.totalColor, this.targetColor] } as any),
        new formattingSettings.Group({ name: "grpLegend", displayName: "Legend", displayNameKey: "grpLegend",
            slices: [this.showLegend, this.legendPosition, this.legendFontFamily, this.legendFontSize, this.legendTextColor] } as any)
    ];
}

// ─── Label settings ───────────────────────────────────────────────────────────

class LabelSettings extends FormattingSettingsCard {
    showLabels = new formattingSettings.ToggleSwitch({
        name: "showLabels", displayName: "Show labels", displayNameKey: "showLabels", value: true
    });
    labelMode = new formattingSettings.ItemDropdown({
        name: "labelMode", displayName: "Label mode", displayNameKey: "labelMode",
        items: [item("abs", "Absolute", "Enum_abs"), item("rel", "Relative %", "Enum_rel"), item("both", "Both", "Enum_both")],
        value: item("abs", "Absolute", "Enum_abs")
    });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize", displayName: "Font size", displayNameKey: "fontSize", value: 11,
        options: rango(8, 20)
    });
    autoValueLabelColor = new formattingSettings.ToggleSwitch({
        name: "autoValueLabelColor", displayName: "Value label color: match bar", displayNameKey: "autoValueLabelColor", value: true
    });
    valueLabelColor = new formattingSettings.ColorPicker({
        name: "valueLabelColor", displayName: "Value label color (when not matching bar)", displayNameKey: "valueLabelColor",
        value: { value: "#252423" }
    });
    // Totales y subtotales son los puntos de control del puente: el arranque,
    // los cortes intermedios y el cierre. Darles a sus etiquetas de eje el color
    // de su barra los separa de los drivers de un vistazo.
    anchorLabelsMatchBar = new formattingSettings.ToggleSwitch({
        name: "anchorLabelsMatchBar", displayNameKey: "anchorLabelsMatchBar",
        displayName: "Total / subtotal labels: match bar colour", value: false
    });
    categoryLabelColor = new formattingSettings.ColorPicker({
        name: "categoryLabelColor", displayName: "Category / axis label color", displayNameKey: "categoryLabelColor",
        value: { value: "#888780" }
    });
    // Densidad de etiquetas (Pro). Un waterfall no falla por calcular mal, falla por saturarse.
    labelRotation = new formattingSettings.ItemDropdown({
        name: "labelRotation", displayName: "Category label angle (Pro)", displayNameKey: "labelRotation",
        items: [
            item("0", "Horizontal", "Enum_rot0"),
            item("-30", "Tilted (-30°)", "Enum_rot30"),
            item("-45", "Tilted (-45°)", "Enum_rot45"),
            item("-90", "Vertical (-90°)", "Enum_rot90")
        ],
        value: item("0", "Horizontal", "Enum_rot0")
    });
    labelMaxChars = new formattingSettings.NumUpDown({
        name: "labelMaxChars", displayName: "Truncate category labels at (Pro)", displayNameKey: "labelMaxChars", value: 0,
        options: rango(0, 60)
    });
    hideOverlapping = new formattingSettings.ToggleSwitch({
        name: "hideOverlapping", displayName: "Hide labels that do not fit (Pro)", displayNameKey: "hideOverlapping", value: false
    });
    categoryFontSize = new formattingSettings.NumUpDown({
        name: "categoryFontSize", displayName: "Category label font size", displayNameKey: "categoryFontSize", value: 10,
        options: rango(8, 18)
    });
    name        = "labelSettings";
    displayName = "Labels";
    displayNameKey = "card_labelSettings";
    slices      = [this.showLabels, this.labelMode, this.fontSize,
        this.autoValueLabelColor, this.valueLabelColor, this.anchorLabelsMatchBar, this.categoryLabelColor, this.categoryFontSize,
        this.labelRotation, this.labelMaxChars, this.hideOverlapping];
}

// ─── Number format settings ───────────────────────────────────────────────────

class NumberFormatSettings extends FormattingSettingsCard {
    // "custom" sigue siendo el valor por defecto: los informes guardados se ven igual. "model" usa la cadena de
    // formato de la medida (dinámica si el DAX la decide) y el idioma del informe.
    source = new formattingSettings.ItemDropdown({
        name: "source", displayName: "Number format", displayNameKey: "nf_source",
        items: [item("custom", "Custom (below)", "Enum_custom"), item("model", "Model format", "Enum_model")],
        value: item("custom", "Custom (below)", "Enum_custom")
    });
    currencySymbol = new formattingSettings.ItemDropdown({
        name: "currencySymbol", displayName: "Currency symbol", displayNameKey: "currencySymbol",
        items: [
            item("", "None", "Enum_none"),
            item("€", "€ Euro", "Enum_eur"),
            item("$", "$ Dollar", "Enum_usd"),
            item("£", "£ Pound", "Enum_gbp"),
            item("¥", "¥ Yen", "Enum_jpy")
        ],
        value: item("", "None", "Enum_none")
    });
    symbolPosition = new formattingSettings.ItemDropdown({
        name: "symbolPosition", displayName: "Symbol position", displayNameKey: "symbolPosition",
        items: [item("prefix", "Prefix", "Enum_prefix"), item("suffix", "Suffix", "Enum_suffix")],
        value: item("prefix", "Prefix", "Enum_prefix")
    });
    scaleMode = new formattingSettings.ItemDropdown({
        name: "scaleMode", displayName: "Scale", displayNameKey: "scaleMode",
        items: [
            item("auto", "Auto", "Enum_auto"),
            item("none", "None", "Enum_none"),
            item("k", "Thousands (k)", "Enum_k"),
            item("M", "Millions (M)", "Enum_M")
        ],
        value: item("auto", "Auto", "Enum_auto")
    });
    decimals = new formattingSettings.NumUpDown({
        name: "decimals", displayName: "Decimals", displayNameKey: "decimals", value: 1,
        options: rango(0, 4)
    });
    thousandsSep = new formattingSettings.ToggleSwitch({
        name: "thousandsSep", displayName: "Thousands separator", displayNameKey: "thousandsSep", value: true
    });
    name        = "numberFormat";
    displayName = "Number format";
    displayNameKey = "card_numberFormat";
    slices      = [this.source, this.currencySymbol, this.symbolPosition, this.scaleMode, this.decimals, this.thousandsSep];
}

// ─── Chart settings ───────────────────────────────────────────────────────────

class ChartSettings extends FormattingSettingsCard {
    showConnectors = new formattingSettings.ToggleSwitch({
        name: "showConnectors", displayName: "Connector lines", displayNameKey: "showConnectors", value: true
    });
    showSubtotals = new formattingSettings.ToggleSwitch({
        name: "showSubtotals", displayName: "Show subtotals", displayNameKey: "showSubtotals", value: true
    });
    targetLabel = new formattingSettings.TextInput({
        name: "targetLabel", displayName: "Target label", displayNameKey: "targetLabel",
        placeholder: "Target", value: "Target"
    });
    targetShowValue = new formattingSettings.ToggleSwitch({
        name: "targetShowValue", displayName: "Show target value", displayNameKey: "targetShowValue", value: true
    });
    showTarget = new formattingSettings.ToggleSwitch({
        name: "showTarget", displayName: "Show target", displayNameKey: "showTarget", value: true
    });
    showVarianceCards = new formattingSettings.ToggleSwitch({
        name: "showVarianceCards", displayName: "Summary cards", displayNameKey: "showVarianceCards", value: true
    });
    sortBars = new formattingSettings.ToggleSwitch({
        name: "sortBars", displayName: "Sort by impact", displayNameKey: "sortBars", value: false
    });
    invertColorSemantics = new formattingSettings.ToggleSwitch({
        name: "invertColorSemantics", displayName: "Invert increase/decrease colors", displayNameKey: "invertColorSemantics",
        value: false
    });
    maxCategories = new formattingSettings.NumUpDown({
        name: "maxCategories", displayName: "Max drivers shown (0 = no limit)", displayNameKey: "maxCategories", value: 0,
        options: rango(0, 50)
    });
    otherLabel = new formattingSettings.TextInput({
        name: "otherLabel", displayName: "\"Others\" bar label", displayNameKey: "otherLabel",
        placeholder: "Others", value: "Others"
    });
    // 1.3: el aviso "!" de cambios atípicos (más de 2 desviaciones típicas) se puede apagar. En un P&L la barra mayor
    // (el coste de ventas) salía siempre marcada. Encendido por defecto: los informes guardados se ven igual.
    showAnomalies = new formattingSettings.ToggleSwitch({
        name: "showAnomalies", displayName: "Flag unusual changes (!)", displayNameKey: "showAnomalies", value: true
    });
    orientation = new formattingSettings.ItemDropdown({
        name: "orientation", displayName: "Orientation", displayNameKey: "orientation",
        items: [item("vertical", "Vertical", "Enum_vertical"), item("horizontal", "Horizontal", "Enum_horizontal")],
        value: item("vertical", "Vertical", "Enum_vertical")
    });
    name        = "chartSettings";
    displayName = "Chart";
    displayNameKey = "card_chartSettings";
    slices      = [this.orientation, this.showConnectors, this.showSubtotals, this.showTarget, this.targetLabel, this.targetShowValue,
        this.showVarianceCards, this.showAnomalies, this.sortBars, this.invertColorSemantics, this.maxCategories, this.otherLabel];
}

// ─── Ejes (1.2) ───────────────────────────────────────────────────────────────

class ValueAxisSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Show value axis", displayNameKey: "va_show", value: true });
    gridlines = new formattingSettings.ToggleSwitch({ name: "gridlines", displayName: "Gridlines", displayNameKey: "va_gridlines", value: true });
    fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Font size", displayNameKey: "fontSize", value: 9, options: rango(7, 18) });
    color = new formattingSettings.ColorPicker({ name: "color", displayName: "Color", displayNameKey: "color", value: { value: "#888780" } });
    showTitle = new formattingSettings.ToggleSwitch({ name: "showTitle", displayName: "Axis title", displayNameKey: "ax_showTitle", value: false });
    title = new formattingSettings.TextInput({ name: "title", displayName: "Title text", displayNameKey: "ax_title", placeholder: "Measure name", value: "" });
    topLevelSlice = this.show;
    name = "valueAxis";
    displayName = "Value axis";
    displayNameKey = "card_valueAxis";
    slices = [this.gridlines, this.fontSize, this.color, this.showTitle, this.title];
}

class CategoryAxisSettings extends FormattingSettingsCard {
    showTitle = new formattingSettings.ToggleSwitch({ name: "showTitle", displayName: "Axis title", displayNameKey: "ax_showTitle", value: false });
    title = new formattingSettings.TextInput({ name: "title", displayName: "Title text", displayNameKey: "ax_title", placeholder: "Field name", value: "" });
    name = "categoryAxis";
    displayName = "Category axis";
    displayNameKey = "card_categoryAxis";
    slices = [this.showTitle, this.title];
}

class CardSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show", displayName: "Show summary cards", displayNameKey: "cards_show", value: true
    });
    // 1.3: las tarjetas se ocultan solas cuando el puente no compara dos momentos de la misma cifra (cardsMakeSense en
    // waterfallEngine.ts): sin total de apertura y de cierre, o con todos los cambios en el mismo sentido (un P&L de
    // ventas a EBITDA). Apagarlo las muestra siempre, como hasta la 1.2.
    autoHide = new formattingSettings.ToggleSwitch({
        name: "autoHide", displayName: "Hide when the bridge is not a comparison", displayNameKey: "cards_autoHide", value: true
    });
    labelFontSize = new formattingSettings.NumUpDown({
        name: "labelFontSize", displayName: "Caption font size", displayNameKey: "labelFontSize", value: 9,
        options: rango(7, 16)
    });
    valueFontSize = new formattingSettings.NumUpDown({
        name: "valueFontSize", displayName: "Value font size", displayNameKey: "valueFontSize", value: 13,
        options: rango(9, 28)
    });
    textColorAuto = new formattingSettings.ToggleSwitch({
        name: "textColorAuto", displayName: "Use the report theme text colour", displayNameKey: "textColorAuto", value: true
    });
    textColor = new formattingSettings.ColorPicker({
        name: "textColor", displayName: "Custom text colour — turn the switch above off", displayNameKey: "textColor", value: { value: "#252423" }
    });
    backgroundAuto = new formattingSettings.ToggleSwitch({
        name: "backgroundAuto", displayName: "Use the report theme background", displayNameKey: "backgroundAuto", value: true
    });
    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor", displayName: "Custom background — turn the switch above off", displayNameKey: "backgroundColor", value: { value: "#F3F2F1" }
    });
    name        = "cardSettings";
    displayName = "Summary Cards";
    displayNameKey = "card_cardSettings";
    slices      = [this.show, this.autoHide, this.labelFontSize, this.valueFontSize,
        this.textColorAuto, this.textColor, this.backgroundAuto, this.backgroundColor];
}

class TableSettings extends FormattingSettingsCard {
    // El puente y las cifras exactas en un solo objeto: un bridge responde "por que" y una tabla "cuanto".
    show = new formattingSettings.ToggleSwitch({
        name: "show", displayName: "Show data table (Pro)", displayNameKey: "table_show", value: false
    });
    position = new formattingSettings.ItemDropdown({
        name: "position", displayName: "Position", displayNameKey: "table_position",
        items: [item("right", "Right", "Enum_right"), item("bottom", "Bottom", "Enum_bottom")],
        value: item("right", "Right", "Enum_right")
    });
    showRunning = new formattingSettings.ToggleSwitch({
        name: "showRunning", displayName: "Running total column", displayNameKey: "showRunning", value: true
    });
    showShare = new formattingSettings.ToggleSwitch({
        name: "showShare", displayName: "% of opening column", displayNameKey: "showShare", value: false
    });
    backgroundAuto = new formattingSettings.ToggleSwitch({
        name: "backgroundAuto", displayName: "Use the report theme background", displayNameKey: "backgroundAuto", value: true
    });
    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor", displayName: "Custom background — turn the switch above off", displayNameKey: "backgroundColor", value: { value: "#F3F2F1" }
    });
    showBorder = new formattingSettings.ToggleSwitch({
        name: "showBorder", displayName: "Separator line", displayNameKey: "showBorder", value: true
    });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize", displayName: "Font size", displayNameKey: "fontSize", value: 10,
        options: rango(7, 18)
    });
    widthPct = new formattingSettings.NumUpDown({
        name: "widthPct", displayName: "Width / height %", displayNameKey: "widthPct", value: 34,
        options: rango(20, 60)
    });
    name        = "tableSettings";
    displayName = "Data Table (Pro)";
    displayNameKey = "card_tableSettings";
    slices      = [this.show, this.position, this.showRunning, this.showShare,
        this.backgroundAuto, this.backgroundColor, this.showBorder,
        this.fontSize, this.widthPct];
}

class IbcsSettings extends FormattingSettingsCard {
    // IBCS es una notacion, no un tema de color: monocromo y con el enfasis en la desviacion.
    mode = new formattingSettings.ToggleSwitch({
        name: "mode", displayName: "IBCS mode (Pro)", displayNameKey: "ibcs_mode", value: false
    });
    name        = "ibcs";
    displayName = "IBCS (Pro)";
    displayNameKey = "card_ibcs";
    slices      = [this.mode];
}

// ─── Plantilla de estilo y consejos (1.2) ─────────────────────────────────────

export const STYLE_ITEMS = [
    item("classic", "Report theme", "Enum_reportTheme"),
    item("boardroom", "Boardroom", "Enum_boardroom"),
    item("ledger", "Ledger", "Enum_ledger"),
    item("editorial", "Editorial", "Enum_editorial"),
    item("signal", "Signal", "Enum_signal"),
    item("aurora", "Aurora", "Enum_aurora"),
    item("terrace", "Terrace", "Enum_terrace")
];

class StyleSettings extends FormattingSettingsCard {
    template = new formattingSettings.ItemDropdown({
        name: "template", displayName: "Template", displayNameKey: "style_template",
        // 1.3: el tema del informe (valor interno "classic") y los seis estilos de la colección TCViz, todos gratis.
        // Las plantillas de la 1.2 (modern, soft, mono, dark) ya no se ofrecen, pero un informe que las tenga
        // guardadas se sigue dibujando igual: siguen en TEMPLATES y en la enumeración de capabilities.json.
        items: STYLE_ITEMS,
        value: STYLE_ITEMS[0]
    });
    // Solo con "One colour": de él salen el total (tal cual), las subidas (aclarado) y las bajadas (oscurecido).
    baseColor = new formattingSettings.ColorPicker({
        name: "baseColor", displayName: "Base colour", displayNameKey: "style_baseColor", value: { value: "#2B6CB0" }
    });
    guide = new formattingSettings.ToggleSwitch({
        name: "guide", displayName: "Show setup tips", displayNameKey: "style_guide", value: true
    });
    name = "style";
    displayName = "Style template";
    displayNameKey = "card_style";
    slices = [this.template, this.baseColor, this.guide];
}

// ─── Accesibilidad (1.3): la misma tarjeta que el resto de la cartera. Gratis. ─

const HC_ITEMS = [item("auto", "Automatic (Windows setting)", "Enum_hc_auto"), item("on", "On", "Enum_hc_on")];
class AccessibilitySettings extends FormattingSettingsCard {
    highContrast = new formattingSettings.ItemDropdown({
        name: "highContrast", displayName: "High contrast", displayNameKey: "Prop_accessibility_highContrast", items: HC_ITEMS, value: HC_ITEMS[0]
    });
    focusColor = new formattingSettings.ColorPicker({
        name: "focusColor", displayName: "Focus color", displayNameKey: "Prop_accessibility_focusColor", value: { value: "#005A9E" }
    });
    focusWidth = new formattingSettings.NumUpDown({
        name: "focusWidth", displayName: "Focus width", displayNameKey: "Prop_accessibility_focusWidth", value: 2, options: rango(1, 6)
    });
    minTextSize = new formattingSettings.NumUpDown({
        name: "minTextSize", displayName: "Minimum text size", displayNameKey: "Prop_accessibility_minTextSize", value: 6, options: rango(6, 24)
    });
    name = "accessibility";
    displayName = "Accessibility";
    displayNameKey = "Obj_accessibility";
    slices = [this.highContrast, this.focusColor, this.focusWidth, this.minTextSize];
}

// ─── Root model ───────────────────────────────────────────────────────────────

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    style         = new StyleSettings();
    chartSettings = new ChartSettings();
    colorSettings = new ColorSettings();
    labelSettings = new LabelSettings();
    valueAxis     = new ValueAxisSettings();
    categoryAxis  = new CategoryAxisSettings();
    numberFormat  = new NumberFormatSettings();
    cardSettings  = new CardSettings();
    tableSettings = new TableSettings();
    ibcs          = new IbcsSettings();
    accessibility = new AccessibilitySettings();
    cards         = [
        this.style,
        this.chartSettings,
        this.colorSettings,
        this.labelSettings,
        this.valueAxis,
        this.categoryAxis,
        this.numberFormat,
        this.cardSettings,
        this.tableSettings,
        this.ibcs,
        this.accessibility
    ];
}

/**
 * Plantillas: valores que la plantilla pone donde el autor no ha fijado nada, por objeto. "classic" es el aspecto
 * de 1.1 (los informes guardados sin plantilla se ven igual). Al ELEGIR una, el visual borra esas propiedades
 * guardadas para que se vea.
 */
/** Mezcla un color hex con blanco (t > 0) o con negro (t < 0). */
function tono(hex: string, t: number): string {
    const v = hex.replace("#", "");
    const f = v.length === 3 ? v.split("").map(c => c + c).join("") : v;
    const ch = [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16));
    const out = ch.map(c => Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t)));
    return "#" + out.map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** "One colour" a partir del color base que elija el autor. */
export function monoTemplate(base: string): Record<string, Record<string, string | number | boolean>> {
    const b = /^#?[0-9a-fA-F]{6}$|^#?[0-9a-fA-F]{3}$/.test(base || "") ? (base.startsWith("#") ? base : "#" + base) : "#2B6CB0";
    return {
        colorSettings: { positiveColor: tono(b, 0.45), negativeColor: tono(b, -0.3), totalColor: b, targetColor: "#1E2A36", legendTextColor: "#605E5C" },
        // El tono claro de las subidas no se lee como texto sobre fondo blanco: etiquetas en el tono oscuro.
        labelSettings: { autoValueLabelColor: false, valueLabelColor: tono(b, -0.3), categoryLabelColor: "#605E5C" },
        valueAxis: { color: "#8A8886" }
    };
}

export const TEMPLATES: Record<string, Record<string, Record<string, string | number | boolean>>> = {
    classic: {},
    modern: {
        colorSettings: { positiveColor: "#2F7A47", negativeColor: "#C0504D", totalColor: "#2B6CB0", targetColor: "#1E2A36", legendTextColor: "#605E5C" },
        labelSettings: { categoryLabelColor: "#605E5C", anchorLabelsMatchBar: true },
        valueAxis: { color: "#8A8886" }
    },
    soft: {
        colorSettings: { positiveColor: "#7FB89A", negativeColor: "#E39A93", totalColor: "#8FB3D9", targetColor: "#605E5C", legendTextColor: "#605E5C" },
        labelSettings: { autoValueLabelColor: false, valueLabelColor: "#3D3B39", categoryLabelColor: "#605E5C" },
        valueAxis: { color: "#8A8886" }
    },
    mono: monoTemplate("#2B6CB0"),
    dark: {
        colorSettings: { positiveColor: "#3FB37F", negativeColor: "#E5534B", totalColor: "#4A90D9", targetColor: "#E1DFDD", legendTextColor: "#C8C6C4" },
        labelSettings: { autoValueLabelColor: false, valueLabelColor: "#F3F2F1", categoryLabelColor: "#C8C6C4" },
        valueAxis: { color: "#A19F9D" },
        cardSettings: { textColorAuto: false, textColor: "#F3F2F1", backgroundAuto: false, backgroundColor: "#2B2B2B" },
        tableSettings: { backgroundAuto: false, backgroundColor: "#2B2B2B" }
    }
};

// ─── Estilos de la colección TCViz (1.3) ──────────────────────────────────────

/**
 * Los seis estilos de la colección, con los mismos tokens que Bullet, Dynamic Matrix, Org Chart o Box & Whisker, para
 * que una página en Boardroom se lea como un solo informe. up/down = subidas y bajadas; total = el color de los
 * anclajes (apertura, subtotales y cierre), elegido entre los de la paleta del estilo para que no se confunda con
 * up/down (en Editorial, Signal y Aurora el primer color de la serie ES el de subida o bajada).
 */
export const COLLECTION_STYLES = ["boardroom", "ledger", "editorial", "signal", "aurora", "terrace"];
export interface StyleTokens { bg: string; text: string; axis: string; grid: string; up: string; down: string; total: string; dark: boolean; font?: string; grad?: string; }
export const STYLE_TOKENS: Record<string, StyleTokens> = {
    boardroom: { bg: "#16263D", text: "#F2F0E8", axis: "#9FB0C6", grid: "#2A3E5C", up: "#6FCF97", down: "#EB8A7B", total: "#C9A45C", dark: true },
    ledger:    { bg: "#FBF8EF", text: "#231F16", axis: "#6E6652", grid: "#D9D2BE", up: "#2F6B3B", down: "#A32A2A", total: "#3A3528", dark: false, font: "Georgia, serif" },
    editorial: { bg: "#FFFFFF", text: "#111111", axis: "#5F5F5F", grid: "#E2E2E2", up: "#111111", down: "#D7263D", total: "#5F5F5F", dark: false, font: "Georgia, serif" },
    signal:    { bg: "#FFFFFF", text: "#14202B", axis: "#566472", grid: "#D9DEE4", up: "#1F7A4D", down: "#C0392B", total: "#14202B", dark: false },
    aurora:    { bg: "#10395E", text: "#FFFFFF", axis: "#C5D3E3", grid: "#3A5C7E", up: "#7CE7D0", down: "#FF9DB0", total: "#9DB7FF", dark: true,
                 grad: "linear-gradient(135deg, #1B1147, #10395E 50%, #0B5A5E)" },
    terrace:   { bg: "#FBF5EC", text: "#3A2A1E", axis: "#7A6450", grid: "#E5D6C2", up: "#5E7128", down: "#B5372A", total: "#7A6450", dark: false },
};

/** Mezcla dos colores #RRGGBB (t = 0 → a, 1 → b). */
export function mixHex(a: string, b: string, t: number): string {
    const p = (h: string) => { const n = parseInt(h.replace("#", "").slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const x = p(a), y = p(b);
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** Lo que pone un estilo de la colección donde el autor no ha fijado nada: barras, textos, ejes, tarjetas y tabla. */
function styleTemplate(t: StyleTokens): Record<string, Record<string, string | number | boolean>> {
    return {
        colorSettings: { positiveColor: t.up, negativeColor: t.down, totalColor: t.total, targetColor: t.text, legendTextColor: t.axis,
            ...(t.font ? { legendFontFamily: t.font } : {}) },
        labelSettings: { valueLabelColor: t.text, categoryLabelColor: t.axis },
        valueAxis: { color: t.axis },
        cardSettings: { textColorAuto: false, textColor: t.text, backgroundAuto: false, backgroundColor: mixHex(t.bg, t.text, 0.08) },
        tableSettings: { backgroundAuto: false, backgroundColor: mixHex(t.bg, t.text, 0.05) }
    };
}
for (const k of COLLECTION_STYLES) TEMPLATES[k] = styleTemplate(STYLE_TOKENS[k]);

/** Colores del tema del informe que lee "Report theme" (la paleta extendida del host). */
export interface ThemeInk { positive?: string; negative?: string; total?: string; foreground?: string; secondary?: string; }

/**
 * "Report theme" (valor interno "classic", 1.3): subidas y bajadas con el sentimiento bueno/malo del tema
 * (colorPalette.positive / negative) y los totales con el primer color de datos del tema; textos y ejes con su tinta.
 * Lo que el host no da se queda en los colores de siempre (los de Classic hasta la 1.2).
 */
export function reportThemeTemplate(ink: ThemeInk): Record<string, Record<string, string | number | boolean>> {
    const ok = (c?: string) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);
    const col: Record<string, string> = {};
    if (ok(ink.positive)) col.positiveColor = ink.positive;
    if (ok(ink.negative)) col.negativeColor = ink.negative;
    if (ok(ink.total)) col.totalColor = ink.total;
    if (ok(ink.secondary)) col.legendTextColor = ink.secondary;
    const out: Record<string, Record<string, string | number | boolean>> = {};
    if (Object.keys(col).length) out.colorSettings = col;
    const lbl: Record<string, string> = {};
    if (ok(ink.foreground)) lbl.valueLabelColor = ink.foreground;
    if (ok(ink.secondary)) lbl.categoryLabelColor = ink.secondary;
    if (Object.keys(lbl).length) out.labelSettings = lbl;
    if (ok(ink.secondary)) out.valueAxis = { color: ink.secondary };
    return out;
}

/** Propiedades que puede definir "Report theme": las que se borran al elegirlo (aunque el tema no las dé todas). */
export const REPORT_THEME_PROPS: Record<string, string[]> = {
    colorSettings: ["positiveColor", "negativeColor", "totalColor", "legendTextColor"],
    labelSettings: ["valueLabelColor", "categoryLabelColor"],
    valueAxis: ["color"]
};
