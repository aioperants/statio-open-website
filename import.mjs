// Imports the website you exported from Statio (Settings › Website › Export my website):
//   npm run import -- website-yourname.zip
// Unpacks site.json and photos/ into site/. No other software needed.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { FORMAT } from "./build.mjs";

/** The files in a ZIP (stored or deflated), read from its central directory. */
export function unzip(buf) {
  let end = buf.length - 22;
  while (end >= 0 && buf.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error("This is not a ZIP file.");
  const count = buf.readUInt16LE(end + 10);
  let at = buf.readUInt32LE(end + 16);
  const files = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(at) !== 0x02014b50) throw new Error("This ZIP file is damaged.");
    const method = buf.readUInt16LE(at + 10);
    const size = buf.readUInt32LE(at + 20);
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    const local = buf.readUInt32LE(at + 42);
    const name = buf.toString("utf8", at + 46, at + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const packed = buf.subarray(start, start + size);
    if (method !== 0 && method !== 8) throw new Error(`Can't read ${name} in this ZIP file.`);
    files.push({ name, data: method === 8 ? inflateRawSync(packed) : packed });
    at += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

/** Only site.json and photos/<file>: nothing can be written outside site/. */
const safe = (name) => name === "site.json" || /^photos\/[\w.-]+$/.test(name);

export function importZip(zipPath, into = "site") {
  const files = unzip(readFileSync(zipPath)).filter((f) => safe(f.name));
  const json = files.find((f) => f.name === "site.json");
  if (!json) throw new Error("No site.json in this ZIP. Export it from Statio: Settings › Website › Export my website.");
  const site = JSON.parse(json.data.toString("utf8"));
  if (site.format !== FORMAT) throw new Error(`This export is "${site.format}"; this version reads "${FORMAT}". Get the latest Statio Open Website.`);
  rmSync(path.join(into, "photos"), { recursive: true, force: true });
  rmSync(path.join(into, "site.json"), { force: true });
  for (const f of files) {
    mkdirSync(path.dirname(path.join(into, f.name)), { recursive: true });
    writeFileSync(path.join(into, f.name), f.data);
  }
  return site;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    console.error("Which file? npm run import -- website-yourname.zip");
    process.exit(1);
  }
  try {
    const site = importZip(file);
    console.log(`Imported "${site.name}". Next: npm run build`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
