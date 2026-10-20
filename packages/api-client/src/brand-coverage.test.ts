import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRoot = process.cwd();
const factoryFile = join(workspaceRoot, "packages/api-client/src/index.ts");
const scanRoots = ["packages", "apps"];
const skip = new Set(["node_modules", "dist", "build", ".turbo", ".git"]);

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (skip.has(entry.name)) {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

describe("TenantId brand", () => {
  // The brand is only as strong as its cast boundary. Every cast must live in
  // the api-client factory (`tenantId(...)`); a cast anywhere else (including a
  // test that could become precedent) fails this check.
  it("casts to TenantId only inside the boundary factory", () => {
    const violations: string[] = [];
    for (const root of scanRoots) {
      const directory = join(workspaceRoot, root);
      try {
        statSync(directory);
      } catch {
        continue;
      }
      for (const file of sourceFiles(directory)) {
        if (file === factoryFile) {
          continue;
        }
        const source = readFileSync(file, "utf8");
        if (/\bas\s+(?:unknown\s+as\s+)?TenantId\b/.test(source)) {
          violations.push(relative(workspaceRoot, file));
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
