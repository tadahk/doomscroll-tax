// builds the chrome and firefox zips: node build.js
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = __dirname;
const name = path.basename(root);
const src = path.join(root, "extension");
const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), name + "-"));

const pack = (label, manifest) => {
  const dir = path.join(tmp, label, name);
  fs.cpSync(src, dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  const out = path.join(root, `${name}-${label}.zip`);
  fs.rmSync(out, { force: true });
  execFileSync("zip", ["-qrX", out, "."], { cwd: dir });
  console.log("built", path.basename(out));
};

const chrome = JSON.parse(fs.readFileSync(path.join(src, "manifest.json")));
pack("chrome", chrome);

const firefox = JSON.parse(JSON.stringify(chrome));
if (firefox.background && firefox.background.service_worker) {
  firefox.background = { scripts: [firefox.background.service_worker] };
}
firefox.browser_specific_settings = {
  gecko: {
    id: `${name}@tadahk.github.io`,
    strict_min_version: "142.0",
    data_collection_permissions: { required: ["none"] }
  }
};
pack("firefox", firefox);

fs.rmSync(tmp, { recursive: true, force: true });
