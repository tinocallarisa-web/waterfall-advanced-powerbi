// Build de TEST. Dos modos, y hacen falta los dos:
//
//   node scripts/build-test.js          tier Pro forzado  -> guid ..._test
//   node scripts/build-test.js --free   tier Free real    -> guid ..._testfree
//
// El modo --free no parchea nada: el licenseManager no encuentra plan para ese
// guid y resuelve a Free por si mismo. Es la unica forma de ver el camino
// gratuito, porque con el guid real Power BI sirve la version instalada desde
// AppSource. Cada modo lleva su sufijo: si lo compartieran, Power BI trataria
// las dos builds como el mismo visual.
// para convivir con la oferta publicada en AppSource sin tocarla.
//
// Patrón: parchear -> empaquetar -> restaurar. Nunca al revés.
// Ver /mnt/skills/user/pbiviz-appsource/SKILL.md (regla 0 y 1).

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT           = path.join(__dirname, "..");
const PBIVIZ_JSON     = path.join(ROOT, "pbiviz.json");
const LICENSE_MANAGER = path.join(ROOT, "src", "licenseManager.ts");

const MARKER = "// TEST_FORCE_TIER_MARKER";
// El tier Finance se retiro en 1.1.0.0 junto con las narrativas de IA: llamaban a
// api.anthropic.com y api.openai.com, que la CSP del sandbox bloquea salvo
// declarando WebAccess, y declararlo es incompatible con la certificacion.
const FORCED_RETURN =
`${MARKER}
    return {
        tier: "pro", isLicensed: true,
        maxBars: Infinity,
        serviceUnavailable: false, resolved: true
    };`;

function readFile(p) { return fs.readFileSync(p, "utf8"); }
function writeFile(p, content) { fs.writeFileSync(p, content, "utf8"); }

function main() {
    const pbivizOriginal  = readFile(PBIVIZ_JSON);
    const licenseOriginal = readFile(LICENSE_MANAGER);

    let restored = false;
    const restore = () => {
        if (restored) return;
        writeFile(PBIVIZ_JSON, pbivizOriginal);
        writeFile(LICENSE_MANAGER, licenseOriginal);
        restored = true;
        console.log("Restored pbiviz.json and licenseManager.ts");
    };

    let restoreVisual = () => {};
    process.on("exit", () => { restoreVisual(); restore(); });
    process.on("SIGINT", () => process.exit(1));

    try {
        const freeMode = process.argv.includes("--free");

        // 1. Guid -> guid_test / guid_testfree
        const pbiviz = JSON.parse(pbivizOriginal);
        const suffix = freeMode ? "_testfree" : "_test";
        if (!pbiviz.visual.guid.endsWith(suffix)) {
            pbiviz.visual.guid = pbiviz.visual.guid + suffix;
        }
        writeFile(PBIVIZ_JSON, JSON.stringify(pbiviz, null, 2) + "\n");
        console.log(`Test guid: ${pbiviz.visual.guid}`);

        // 2. Forzar el tier Pro, salvo en modo --free
        if (freeMode) {
            console.log("--free: licenseManager sin parchear, tier Free real");
        } else {
            if (!licenseOriginal.includes(MARKER)) {
                throw new Error(
                    "No se encontró TEST_FORCE_TIER_MARKER en licenseManager.ts. " +
                    "El código cambió de forma — actualiza este script, no el fuente."
                );
            }
            const patchedLicense = licenseOriginal.replace(MARKER, FORCED_RETURN);
            writeFile(LICENSE_MANAGER, patchedLicense);
            console.log("Patched licenseManager.ts: tier forced to pro");
        }

        // 3. Sello de compilacion, para saber que build esta cargada
        const stamp = new Date().toTimeString().slice(0, 8) +
            (freeMode ? " free" : " pro");
        const visualTs = path.join(ROOT, "src", "visual.ts");
        const visualOriginal = readFile(visualTs);
        writeFile(visualTs, visualOriginal.replace(
            'const BUILD_MARKER = "";', `const BUILD_MARKER = "${stamp}";`));
        restoreVisual = () => writeFile(visualTs, visualOriginal);
        console.log(`Build marker: ${stamp}`);

        // 4. Empaquetar
        execSync("npx pbiviz package", { cwd: ROOT, stdio: "inherit" });

        console.log("\nTest build created in dist/ (guid suffixed with _test).");
    } finally {
        restore();
    }
}

main();
