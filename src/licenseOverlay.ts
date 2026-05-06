import { LicenseState } from "./licenseManager";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Renderiza el overlay de "upgrade" cuando el usuario Free
 * supera el límite de barras o intenta acceder a features Pro/Finance.
 *
 * Muestra:
 *  - Las primeras 8 barras correctamente (datos reales)
 *  - Las barras restantes atenuadas con candado
 *  - Banner inferior con CTA de upgrade
 */
export class LicenseOverlay {

    /**
     * Aplica dimming + candado a las barras que superan maxBars.
     * Llama a esto DESPUÉS de que el renderer haya pintado las barras.
     */
    static applyBarLimit(
        container: HTMLElement,
        totalBars: number,
        license:   LicenseState
    ): void {
        if (license.tier !== "free") return;
        if (totalBars <= license.maxBars) return;

        // Overlay semitransparente sobre la parte derecha del SVG
        const svg = container.querySelector("svg");
        if (!svg) return;

        const svgW    = svg.viewBox.baseVal.width;
        const svgH    = svg.viewBox.baseVal.height;
        const barW    = svgW / totalBars;
        const cutoffX = barW * license.maxBars;
        const excess  = totalBars - license.maxBars;

        // Rect de bloqueo
        const block = document.createElementNS(SVG_NS, "rect");
        block.setAttribute("x",       String(cutoffX));
        block.setAttribute("y",       "0");
        block.setAttribute("width",   String(svgW - cutoffX));
        block.setAttribute("height",  String(svgH));
        block.setAttribute("fill",    "rgba(255,255,255,0.82)");
        block.setAttribute("rx",      "0");
        svg.appendChild(block);

        // Candado SVG centrado en la zona bloqueada
        const lockX = cutoffX + (svgW - cutoffX) / 2;
        const lockY = svgH / 2 - 20;
        this.drawLock(svg, lockX, lockY);

        // Texto "X barras bloqueadas"
        const txt = document.createElementNS(SVG_NS, "text");
        txt.setAttribute("x",           String(lockX));
        txt.setAttribute("y",           String(lockY + 52));
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("font-size",   "11");
        txt.setAttribute("font-family", "Segoe UI, sans-serif");
        txt.setAttribute("fill",        "#555");
        txt.textContent = `${excess} bar${excess > 1 ? "s" : ""} locked`;
        svg.appendChild(txt);

        // Banner de upgrade en la parte inferior del container
        LicenseOverlay.renderUpgradeBanner(container, license);
    }

    /**
     * Banner de upgrade — se añade fuera del SVG, en el container HTML.
     */
    static renderUpgradeBanner(container: HTMLElement, license: LicenseState): void {
        // Evitar duplicados
        const existing = container.querySelector(".wf-upgrade-banner");
        if (existing) existing.remove();

        const banner = document.createElement("div");
        banner.className   = "wf-upgrade-banner";
        banner.style.cssText =
            "position:absolute;bottom:0;left:0;right:0;" +
            "background:linear-gradient(135deg,#378ADD,#1D9E75);" +
            "color:#fff;padding:8px 12px;display:flex;align-items:center;" +
            "justify-content:space-between;gap:8px;font-family:Segoe UI,sans-serif;" +
            "font-size:11px;box-sizing:border-box;z-index:10;border-radius:0 0 4px 4px";

        const text = document.createElement("span");
        text.textContent = license.tier === "free"
            ? "🔒 Waterfall Advanced Free — limited to 8 bars"
            : "Upgrade to unlock all features";
        banner.appendChild(text);

        const btn = document.createElement("a");
        btn.href            = "https://appsource.microsoft.com";
        btn.target          = "_blank";
        btn.style.cssText   =
            "background:#fff;color:#378ADD;font-weight:600;font-size:10px;" +
            "padding:4px 10px;border-radius:4px;text-decoration:none;white-space:nowrap;" +
            "cursor:pointer";
        btn.textContent = "Upgrade to Pro →";
        banner.appendChild(btn);

        // Asegurar que el container tiene position relative para el absolute
        if (getComputedStyle(container).position === "static") {
            container.style.position = "relative";
        }

        container.appendChild(banner);
    }

    /**
     * Dibuja un candado SVG en las coordenadas dadas.
     */
    private static drawLock(svg: SVGSVGElement, cx: number, cy: number): void {
        const g = document.createElementNS(SVG_NS, "g");

        // Cuerpo del candado
        const body = document.createElementNS(SVG_NS, "rect");
        body.setAttribute("x",      String(cx - 12));
        body.setAttribute("y",      String(cy + 10));
        body.setAttribute("width",  "24");
        body.setAttribute("height", "18");
        body.setAttribute("rx",     "3");
        body.setAttribute("fill",   "#378ADD");
        body.setAttribute("opacity","0.9");
        g.appendChild(body);

        // Arco del candado
        const arc = document.createElementNS(SVG_NS, "path");
        arc.setAttribute("d",
            `M${cx - 8} ${cy + 11} ` +
            `L${cx - 8} ${cy + 4} ` +
            `A8 8 0 0 1 ${cx + 8} ${cy + 4} ` +
            `L${cx + 8} ${cy + 11}`
        );
        arc.setAttribute("fill",         "none");
        arc.setAttribute("stroke",       "#378ADD");
        arc.setAttribute("stroke-width", "4");
        arc.setAttribute("opacity",      "0.9");
        g.appendChild(arc);

        // Ojo del candado
        const eye = document.createElementNS(SVG_NS, "circle");
        eye.setAttribute("cx",   String(cx));
        eye.setAttribute("cy",   String(cy + 20));
        eye.setAttribute("r",    "3");
        eye.setAttribute("fill", "#fff");
        g.appendChild(eye);

        svg.appendChild(g);
    }
}
