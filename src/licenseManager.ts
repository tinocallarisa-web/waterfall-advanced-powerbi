import powerbi from "powerbi-visuals-api";

export type Tier = "free" | "pro" | "finance";

export interface LicenseState {
    tier:               Tier;
    isLicensed:         boolean;
    maxBars:            number;
    hasAI:              boolean;
    serviceUnavailable: boolean;
}

const PLAN_PRO     = "pro";
const PLAN_FINANCE = "finance";

const LIMITS: Record<Tier, { maxBars: number; hasAI: boolean }> = {
    free:    { maxBars: 8,        hasAI: false },
    pro:     { maxBars: Infinity, hasAI: false },
    finance: { maxBars: Infinity, hasAI: true  }
};

export async function getLicenseState(
    host: powerbi.extensibility.visual.IVisualHost
): Promise<LicenseState> {

    try {
        const lm = (host as any).licenseManager;

        const financeResult = await lm.getAvailabilityStatusForServicePlan(PLAN_FINANCE);
        if (financeResult.isLicensed) {
            return {
                tier: "finance", isLicensed: true,
                maxBars: LIMITS.finance.maxBars, hasAI: LIMITS.finance.hasAI,
                serviceUnavailable: false
            };
        }

        const proResult = await lm.getAvailabilityStatusForServicePlan(PLAN_PRO);
        if (proResult.isLicensed) {
            return {
                tier: "pro", isLicensed: true,
                maxBars: LIMITS.pro.maxBars, hasAI: LIMITS.pro.hasAI,
                serviceUnavailable: false
            };
        }

        return {
            tier: "free", isLicensed: false,
            maxBars: LIMITS.free.maxBars, hasAI: LIMITS.free.hasAI,
            serviceUnavailable: false
        };

    } catch {
        // Degraded mode — AppSource no disponible (desarrollo local)
        const isDev = window.location.hostname === "localhost" ||
                      window.location.hostname === "127.0.0.1";
        return {
            tier:               isDev ? "pro" : "free",
            isLicensed:         isDev,
            maxBars:            isDev ? Infinity : LIMITS.free.maxBars,
            hasAI:              false,
            serviceUnavailable: !isDev
        };
    }
}
