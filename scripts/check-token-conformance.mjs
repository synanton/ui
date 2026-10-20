import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const tokens = JSON.parse(await readFile(new URL("packages/design-tokens/src/tokens.json", root), "utf8"));
const css = await readFile(new URL("packages/design-tokens/src/tokens.css", root), "utf8");
const missing = [];
function visit(value, prefix = []) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) visit(child, [...prefix, key]);
    return;
  }
  const variable = "--" + prefix.join("-").replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
  if (!new RegExp(variable.replaceAll("-", "\\-") + "\\s*:").test(css)) missing.push(variable);
}
visit(tokens);
if (missing.length) {
  console.error("Token conformance failed; missing CSS variables: " + missing.join(", "));
  process.exitCode = 1;
} else console.log("All design token JSON entries have matching CSS variables.");
