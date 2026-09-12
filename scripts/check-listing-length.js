// Mide los bloques de copy de APPSOURCE-LISTING-TRANSLATIONS.md contra los limites
// reales de Partner Center.
//
//   node scripts/check-listing-length.js
//
// Por que existe: los dos campos que importan cortan en silencio. Medido el
// 2026-09-12 en esta oferta: Description guarda 5.000 caracteres exactos y tira el
// resto a media palabra, sin aviso; el campo de notas de certificacion corta en
// 2.500. Un texto que cabia en ingles no cabe traducido —el aleman y el frances se
// alargan entre un 10 y un 20%— asi que la comprobacion hay que hacerla idioma por
// idioma, no una vez.
//
// Salida: una linea por bloque, y exit 1 si alguno se pasa, para que sirva en un
// hook o antes de un envio.

const fs   = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

/** Limites medidos, no documentados por Microsoft. */
const LIMITS = [
    { file: "APPSOURCE-LISTING-TRANSLATIONS.md", max: 5000,
      // Los resumenes de busqueda son bloques cortos en el mismo fichero; se miden
      // contra 100 y no contra 5.000.
      shortMax: 100,
      shortHeading: /summary|resumen|résumé|zusammenfassung/i },
];

const FENCE = /\n## ([^\n]+)\n\n```\n([\s\S]*?)\n```\n/g;

let failed = false;

for (const spec of LIMITS) {
    const full = path.join(ROOT, spec.file);
    if (!fs.existsSync(full)) { console.log(`(no existe: ${spec.file})`); continue; }
    const src = fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n");

    console.log(spec.file);
    let m;
    FENCE.lastIndex = 0;
    while ((m = FENCE.exec(src)) !== null) {
        const heading = m[1];
        const body    = m[2];
        const isShort = spec.shortHeading.test(heading);
        const max     = isShort ? spec.shortMax : spec.max;
        const over    = body.length > max;
        if (over) failed = true;
        console.log(
            `  ${String(body.length).padStart(5)} / ${max}` +
            `  ${over ? "SE PASA" : "ok     "}  ${heading}`);
    }
}

// El fichero corto de notas de certificacion, que corta en 2.500.
const NOTES = path.join(ROOT, "CERTIFICATION-NOTES-SHORT.txt");
if (fs.existsSync(NOTES)) {
    const n = fs.readFileSync(NOTES, "utf8").replace(/\r\n/g, "\n").length;
    if (n > 2500) failed = true;
    console.log(`\nCERTIFICATION-NOTES-SHORT.txt\n  ${String(n).padStart(5)} / 2500` +
        `  ${n > 2500 ? "SE PASA" : "ok     "}`);
}

// Los tags de YouTube, que cortan en 500.
const TAGS = path.join(ROOT, "YOUTUBE-TAGS.txt");
if (fs.existsSync(TAGS)) {
    const line = fs.readFileSync(TAGS, "utf8").split(/\r?\n/)
        .find(l => l.split(",").length > 5);
    if (line) {
        if (line.length > 500) failed = true;
        console.log(`\nYOUTUBE-TAGS.txt\n  ${String(line.length).padStart(5)} / 500` +
            `  ${line.length > 500 ? "SE PASA" : "ok     "}`);
    }
}

process.exit(failed ? 1 : 0);
