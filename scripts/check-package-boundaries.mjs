import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const packageRoots = [join(root, "packages"), join(root, "apps")];
const allowed = {
  "design-tokens": [],
  "ui-primitives": ["design-tokens"],
  "ui-components": ["design-tokens", "ui-primitives"],
  "domain-components": ["design-tokens", "ui-primitives", "ui-components"],
  "api-client": [],
  "app-shell": ["design-tokens", "ui-primitives", "ui-components", "domain-components", "api-client"],
  "web": ["design-tokens", "ui-primitives", "ui-components", "domain-components", "api-client", "app-shell"],
  "config": []
};
const errors = [];
const dirs = [];
for (const packageRoot of packageRoots) {
  const entries = await readdir(packageRoot, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.isDirectory()) dirs.push({ packageRoot, name: entry.name });
  }
}
async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const result = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await sourceFiles(path));
    else if ([".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(extname(entry.name))) result.push(path);
  }
  return result;
}
const packages = new Map();
for (const dir of dirs) {
  const directory = join(dir.packageRoot, dir.name);
  const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8").catch(() => "{}"));
  if (!manifest.name) continue;
  const key = manifest.name.replace("@synanton/", "");
  packages.set(key, { directory, manifest });
  if (!(key in allowed)) errors.push("No dependency-boundary policy for package: " + manifest.name);
}
for (const [key, item] of packages) {
  const permitted = new Set(allowed[key] ?? []);
  const deps = { ...item.manifest.dependencies, ...item.manifest.devDependencies, ...item.manifest.peerDependencies };
  for (const dependency of Object.keys(deps)) {
    if (!dependency.startsWith("@synanton/")) continue;
    const target = dependency.replace("@synanton/", "");
    if (!packages.has(target)) errors.push(item.manifest.name + " depends on missing workspace package " + dependency);
    else if (!permitted.has(target)) errors.push(item.manifest.name + " may not depend on " + dependency);
  }
  for (const file of await sourceFiles(join(item.directory, "src"))) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/(?:from\s*|import\s*)["'](@synanton\/[a-z0-9-]+)/g)) {
      const target = match[1].replace("@synanton/", "");
      if (!packages.has(target)) errors.push(relative(root, file) + " imports missing workspace package " + match[1]);
      else if (!permitted.has(target)) errors.push(relative(root, file) + " violates package boundary: " + key + " -> " + target);
    }
  }
}
if (errors.length) {
  console.error("Package boundary check failed:");
  for (const error of errors) console.error(" - " + error);
  process.exitCode = 1;
} else console.log("Package dependency boundaries are valid.");
