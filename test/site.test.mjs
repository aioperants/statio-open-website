// Tests for building and importing. The business below is test data only.
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { FORMAT, build, readSite, renderPage } from "../build.mjs";
import { importZip, unzip } from "../import.mjs";

const TEST_SITE = {
  format: FORMAT,
  locale: "es",
  name: "Estudio de prueba",
  tagline: "Uñas y pestañas",
  about: "Primer párrafo.\n\nSegundo párrafo.",
  solo: false,
  logo: "photos/logo.png",
  photo: "photos/hero.jpg",
  gallery: [{ src: "photos/g-1.webp", caption: "Manicura" }],
  team: [{ name: "Ana", title: "Estilista", photo: null }],
  hours: [{ days: "lun–vie", hours: "10:00–19:00" }],
  address: "Calle Prueba 1",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Calle%20Prueba",
  serviceArea: "",
  phone: "+34600000000",
  phoneDisplay: "600 00 00 00",
  whatsapp: true,
  email: "hola@example.com",
  links: [{ label: "Instagram", url: "https://instagram.com/example" }, { label: "Bad", url: "javascript:alert(1)" }],
  faq: [{ q: "¿Aparcamiento?", a: "Sí." }],
  legalName: "",
  taxId: "",
  words: { about: "Sobre nosotros", call: "Llamar" },
};

test("draws every section with the website's own words", () => {
  const html = renderPage(readSite(TEST_SITE));
  for (const part of ['lang="es"', "Estudio de prueba", "Sobre nosotros", "Llamar", "<p>Segundo párrafo.</p>", "Ana", "lun–vie", "¿Aparcamiento?", "https://wa.me/34600000000", "Instagram"]) assert.ok(html.includes(part), part);
});

test("has no booking, prices or scripts, and drops unsafe links", () => {
  const html = renderPage(readSite(TEST_SITE));
  assert.ok(!html.includes("javascript:"));
  assert.ok(!/<script(?! type="application\/ld\+json")/.test(html));
  assert.ok(!/book/i.test(html));
});

test("escapes what the owner wrote", () => {
  const html = renderPage(readSite({ ...TEST_SITE, name: '<img src=x onerror="1">' }));
  assert.ok(!html.includes("<img src=x"));
});

test("refuses a site.json it doesn't know", () => {
  assert.throws(() => readSite({ ...TEST_SITE, format: "other/9" }));
  assert.throws(() => readSite({ ...TEST_SITE, name: "" }));
});

test("imports a Statio export and builds it", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "sow-"));
  const zipFile = path.join(dir, "website.zip");
  writeFileSync(zipFile, makeZip([{ name: "site.json", data: JSON.stringify(TEST_SITE) }, { name: "photos/logo.png", data: "png" }, { name: "../evil.txt", data: "x" }]));
  assert.equal(unzip(readFileSync(zipFile)).length, 3);
  importZip(zipFile, path.join(dir, "site"));
  assert.ok(existsSync(path.join(dir, "site/photos/logo.png")));
  assert.ok(!existsSync(path.join(dir, "evil.txt")));
  build({ from: path.join(dir, "site"), to: path.join(dir, "out"), siteUrl: "https://example.com" });
  assert.ok(readFileSync(path.join(dir, "out/index.html"), "utf8").includes("Estudio de prueba"));
  assert.ok(existsSync(path.join(dir, "out/photos/logo.png")));
  assert.ok(readFileSync(path.join(dir, "out/sitemap.xml"), "utf8").includes("https://example.com/"));
});

/** A ZIP like Statio's export (deflated entries). */
function makeZip(files) {
  const locals = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name), raw = Buffer.from(f.data), packed = deflateRawSync(raw);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(name.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10); c.writeUInt32LE(packed.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    locals.push(local, name, packed); central.push(c, name); offset += 30 + name.length + packed.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}
