import { LicenseState } from "./licenseManager";

/**
 * Says how many categories are being drawn, and nothing else.
 *
 * What used to be here: a white rectangle with a padlock over the bars beyond
 * the free limit, and an "upgrade" banner linking to appsource.microsoft.com.
 * That is licensing UI of the visual's own, which Microsoft's guidance advises
 * against — "a visual shouldn't display its own licensing UX, instead use one of
 * Power BI supported predefined notifications" — and it behaved as a watermark
 * over the free tier. The generic marketplace link was also a dead end: it led
 * to the storefront, not to this offer.
 *
 * The purchase path is now Power BI's own notification, raised from
 * LicenseNotifier. What stays here is the part that is not about licensing at
 * all: the reader has to know the chart is not showing every category, or the
 * totals will not match the rest of the report and nothing will say why.
 */
export class LicenseOverlay {

    /** Removes any note left by a previous render. */
    static clear(container: HTMLElement): void {
        container.querySelectorAll(".wf-truncation-note").forEach(n => n.remove());
    }

    /**
     * Says that the smaller drivers are grouped, and into what.
     *
     * Neutral wording on purpose: it states a fact about the chart, it does not
     * sell anything. And it matters that the bridge still balances — the reader
     * is not looking at a broken chart, they are looking at a coarser one.
     */
    static renderGroupingNote(
        container: HTMLElement,
        driversInData: number,
        license: LicenseState,
        groupedByTier: boolean,
        otherLabel: string
    ): void {
        LicenseOverlay.clear(container);
        if (!groupedByTier) return;

        const grouped = driversInData - license.maxBars;
        const note = document.createElement("div");
        note.className = "wf-truncation-note";
        note.style.cssText =
            "position:absolute;top:4px;right:8px;z-index:15;" +
            "font-family:Segoe UI,sans-serif;font-size:10px;color:#8A6D1F;" +
            "background:rgba(253,243,231,0.92);border:1px solid #E8C88A;" +
            "border-radius:4px;padding:2px 8px;pointer-events:none";
        note.textContent =
            `${license.maxBars} largest drivers shown · ${grouped} grouped into "${otherLabel}"`;
        container.appendChild(note);
    }
}
