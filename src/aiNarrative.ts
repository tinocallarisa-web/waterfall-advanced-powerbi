import { WaterfallSummary } from "./waterfallEngine";
import { ComputedBar }      from "./waterfallEngine";
import { NumberFormatter }  from "./formatter";
import { VisualFormattingSettingsModel } from "./settings";

export type AIProvider = "anthropic" | "openai";

export interface NarrativeResult {
    text:  string;
    error: string | null;
}

const LANG_PROMPTS: Record<string, string> = {
    en: "Respond in English.",
    es: "Responde en español.",
    fr: "Réponds en français.",
    de: "Antworte auf Deutsch."
};

/**
 * Genera una narrativa ejecutiva del waterfall usando la API del proveedor elegido.
 * El usuario aporta su propia API key — nunca pasa por servidores de Globalpraxis.
 */
export async function generateNarrative(
    bars:     ComputedBar[],
    summary:  WaterfallSummary,
    settings: VisualFormattingSettingsModel,
    fmt:      NumberFormatter
): Promise<NarrativeResult> {

    const ai       = settings.aiSettings;
    const provider = ai.aiProvider.value.value as AIProvider;
    const apiKey   = (ai.apiKey.value ?? "").trim();
    const lang     = ai.aiLanguage.value.value as string;

    if (!apiKey) {
        return { text: "", error: "No API key configured. Add your key in Format > AI Narratives." };
    }

    const prompt = buildPrompt(bars, summary, fmt, lang);

    try {
        if (provider === "anthropic") {
            return await callAnthropic(apiKey, prompt);
        } else {
            return await callOpenAI(apiKey, prompt);
        }
    } catch (e) {
        return { text: "", error: `API error: ${String(e)}` };
    }
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(
    bars:    ComputedBar[],
    summary: WaterfallSummary,
    fmt:     NumberFormatter,
    lang:    string
): string {
    const deltas = bars
        .filter(b => b.barType === "delta")
        .map(b => `  - ${b.label}: ${fmt.formatDelta(b.value)} (${b.deltaRel >= 0 ? "+" : ""}${b.deltaRel.toFixed(1)}%)`)
        .join("\n");

    const langInstruction = LANG_PROMPTS[lang] ?? LANG_PROMPTS["en"];

    return `You are a financial analyst writing an executive summary of a waterfall chart.

Data:
- Starting value: ${fmt.format(summary.initialValue)}
- Ending value:   ${fmt.format(summary.finalValue)}
- Total change:   ${fmt.formatDelta(summary.totalDelta)} (${summary.totalDeltaRel >= 0 ? "+" : ""}${summary.totalDeltaRel.toFixed(1)}%)
- Biggest gain:   ${summary.biggestGain ? `${summary.biggestGain.label} (${fmt.formatDelta(summary.biggestGain.value)})` : "None"}
- Biggest loss:   ${summary.biggestLoss ? `${summary.biggestLoss.label} (${fmt.formatDelta(summary.biggestLoss.value)})` : "None"}

Drivers:
${deltas}

Write a concise executive narrative (3-4 sentences max) explaining the key drivers of the change. 
Focus on the most impactful items. Be specific with numbers. Do not use bullet points.
${langInstruction}`;
}

// ── Anthropic API ─────────────────────────────────────────────────────────────

async function callAnthropic(apiKey: string, prompt: string): Promise<NarrativeResult> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method:  "POST",
        headers: {
            "Content-Type":      "application/json",
            "x-api-key":         apiKey,
            "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
            model:      "claude-haiku-4-5-20251001",
            max_tokens: 300,
            messages:   [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { text: "", error: `Anthropic error ${response.status}: ${(err as {error?: {message?: string}}).error?.message ?? response.statusText}` };
    }

    const data = await response.json() as {
        content: { type: string; text: string }[]
    };
    const text = data.content
        .filter(c => c.type === "text")
        .map(c => c.text)
        .join("").trim();

    return { text, error: null };
}

// ── OpenAI API ────────────────────────────────────────────────────────────────

async function callOpenAI(apiKey: string, prompt: string): Promise<NarrativeResult> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method:  "POST",
        headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model:      "gpt-4o-mini",
            max_tokens: 300,
            messages:   [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { text: "", error: `OpenAI error ${response.status}: ${(err as {error?: {message?: string}}).error?.message ?? response.statusText}` };
    }

    const data = await response.json() as {
        choices: { message: { content: string } }[]
    };
    const text = data.choices[0]?.message?.content?.trim() ?? "";
    return { text, error: null };
}
