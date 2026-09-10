import powerbi from "powerbi-visuals-api";

/**
 * Licence resolution for Waterfall Advanced.
 *
 * The previous implementation called `getAvailabilityStatusForServicePlan()`,
 * which is not part of the API. `IVisualLicenseManager` has exactly four
 * methods: getAvailableServicePlans, notifyLicenseRequired, notifyFeatureBlocked
 * and clearLicenseNotification.
 *
 * The call therefore threw, the catch swallowed it, and the fallback read
 * `window.location.hostname === "localhost"` to decide the tier — true while
 * developing, false everywhere else. **Every published user resolved to Free,
 * permanently, whatever they had paid.** It worked perfectly in local
 * development, which is exactly why it survived.
 *
 * Two lessons are baked into what follows: a catch that invents a tier hides the
 * failure that matters, and the environment must never decide entitlement.
 */

export type Tier = "free" | "pro";

export interface LicenseState {
    tier: Tier;
    isLicensed: boolean;
    maxBars: number;
    /** True when the environment cannot resolve licences at all. */
    serviceUnavailable: boolean;
    /** True once the answer is known. Nothing is notified before this. */
    resolved: boolean;
}

/**
 * The service plan identifier of the Pro plan, exactly as defined in Partner
 * Center → the offer → Plan overview → Plan ID.
 *
 * It is NOT the plan's display name. Comparing it is what makes the check
 * specific to this visual: `getAvailableServicePlans()` returns every plan the
 * user holds, so accepting any active plan would unlock this visual for someone
 * who bought a different one.
 */
const PLAN_PRO = "REPLACE-WITH-PARTNER-CENTER-PLAN-ID";

// Un bridge de P&L real lleva de diez a veinte pasos. Con ocho, casi cualquier
// caso principal acaba agrupado, y el tier gratuito parece corto justo donde mas
// se usa. Con doce el grafico gratuito es utilizable de verdad, y Pro se vende
// por profundidad de analisis y no por rescatar un grafico incompleto.
export const FREE_MAX_BARS = 12;

/** ServicePlanState is a const enum: the numbers are needed at runtime. */
const STATE_ACTIVE = 1;
const STATE_WARNING = 2;

/**
 * Estado antes de que la licencia resuelva, y tambien el resultado cuando no hay
 * licencia. Se exporta para que el visual lo use como valor inicial: tener el
 * limite escrito a mano en dos sitios acabo en que el aviso decia 8 barras y el
 * grafico agrupaba a 12.
 */
export const FREE_STATE: LicenseState = {
    tier: "free",
    isLicensed: false,
    maxBars: FREE_MAX_BARS,
    serviceUnavailable: false,
    resolved: true
};

export async function getLicenseState(
    host: powerbi.extensibility.visual.IVisualHost
): Promise<LicenseState> {
    // TEST_FORCE_TIER_MARKER
    const lm = (host as any).licenseManager;
    if (!lm) return { ...FREE_STATE };

    try {
        const result: any = await lm.getAvailableServicePlans();

        // Warning is a payment grace period. Per the licensing API, "only the
        // active and warning states represent a usable license", so a paying
        // customer keeps their features while a billing problem is resolved.
        const licensed = result?.plans?.some(
            (p: any) => p.spIdentifier === PLAN_PRO &&
                        (p.state === STATE_ACTIVE || p.state === STATE_WARNING)
        ) ?? false;

        // Publish to Web, embedded, national clouds, PDF/PPT export, offline or
        // signed out: the licence cannot be resolved and a Pro customer reads as
        // Free. The free experience is rendered there, but nobody is asked to buy
        // what they may already own.
        const unsupportedEnv = !!result?.isLicenseUnsupportedEnv;
        const infoUnavailable = result?.isLicenseInfoAvailable === false;

        return {
            tier: licensed ? "pro" : "free",
            isLicensed: licensed,
            maxBars: licensed ? Infinity : FREE_MAX_BARS,
            serviceUnavailable: unsupportedEnv || infoUnavailable,
            resolved: true
        };
    } catch (e) {
        // Free, and say so in the console. The old code returned Pro here when the
        // hostname looked local, which is how a broken API call turned into a
        // product that could not be bought.
        console.error("[WaterfallAdvanced] licence resolution failed:", e);
        return { ...FREE_STATE, serviceUnavailable: true };
    }
}

/**
 * Power BI's own notifications, which carry the purchase path.
 *
 * The visual draws no licensing UI of its own: Microsoft's guidance is explicit
 * that a visual "shouldn't display its own licensing UX, instead use one of Power
 * BI supported predefined notifications".
 */
export class LicenseNotifier {
    private lastBlocked = "";
    private noticeShown = false;

    constructor(private host: powerbi.extensibility.visual.IVisualHost) {}

    /** The user reached for something the free tier does not do. */
    public blocked(state: LicenseState, feature: string): void {
        if (!this.actionable(state)) return;
        if (feature === this.lastBlocked) return;
        this.lastBlocked = feature;
        try {
            (this.host as any).licenseManager?.notifyFeatureBlocked(feature);
        } catch { /* older host */ }
    }

    /** A persistent notice while the report needs a licence it does not have. */
    public required(state: LicenseState, needed: boolean): void {
        const lm = (this.host as any).licenseManager;
        if (!lm) return;

        if (!needed || !this.actionable(state)) {
            if (this.noticeShown) {
                try { lm.clearLicenseNotification(); } catch { /* older host */ }
                this.noticeShown = false;
                this.lastBlocked = "";
            }
            return;
        }
        if (!this.noticeShown) {
            try {
                // LicenseNotificationType.General = 0. It is a const enum, so the
                // literal is required at runtime.
                lm.notifyLicenseRequired(0);
                this.noticeShown = true;
            } catch { /* older host */ }
        }
    }

    /**
     * Whether it makes sense to ask this user to buy anything.
     *
     * Not before the licence resolves — the tier is Free at start for a licensed
     * customer too — not when they already hold one, and not where the licence
     * cannot be resolved at all.
     */
    private actionable(state: LicenseState): boolean {
        return state.resolved && !state.isLicensed && !state.serviceUnavailable;
    }
}
