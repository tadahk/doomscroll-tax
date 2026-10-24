// unit checks: node tests/test.js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const t = require("../extension/content.js");

let n = 0;
const check = (name, fn) => { fn(); n++; console.log("ok -", name); };

check("first minute is free", () => {
  assert.strictEqual(t.speed(0), 1);
  assert.strictEqual(t.speed(60), 1);
});
check("slows over time", () => {
  assert(Math.abs(t.speed(180) - 0.5) < 1e-9);
  assert(Math.abs(t.speed(300) - 1 / 3) < 1e-9);
  assert(t.speed(240) < t.speed(120));
});
check("never below floor", () => assert.strictEqual(t.speed(1e6), 0.1));

check("site matching", () => {
  assert.strictEqual(t.site("x.com"), "x.com");
  assert.strictEqual(t.site("www.reddit.com"), "reddit.com");
  assert.strictEqual(t.site("old.reddit.com"), "reddit.com");
  assert.strictEqual(t.site("m.youtube.com"), "youtube.com");
  assert.strictEqual(t.site("box.com"), null);
  assert.strictEqual(t.site("notreddit.com"), null);
});

check("wheel units", () => {
  assert.strictEqual(t.pixels(3, 1, 800), 48);
  assert.strictEqual(t.pixels(1, 2, 800), 800);
  assert.strictEqual(t.pixels(100, 0, 800), 100);
});

check("manifest and popup cover the same sites", () => {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, "../extension/manifest.json")));
  const matches = m.content_scripts[0].matches;
  for (const s of t.SITES) assert(matches.includes(`*://*.${s}/*`), s);
  assert.strictEqual(matches.length, t.SITES.length);
  const popup = fs.readFileSync(path.join(__dirname, "../extension/popup.js"), "utf8");
  for (const s of t.SITES) assert(popup.includes(`"${s}"`), s);
});

console.log(`${n} checks passed`);
