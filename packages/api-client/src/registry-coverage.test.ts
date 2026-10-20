import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { registeredAuthAttachments } from "./index";

const workspaceRoot = process.cwd();
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
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

describe("AuthAttachment registry coverage", () => {
  it("registers every AuthAttachment implementation in packages and apps", () => {
    const implementations = new Set<string>();
    for (const root of scanRoots) {
      const directory = join(workspaceRoot, root);
      try {
        statSync(directory);
      } catch {
        continue;
      }
      for (const file of sourceFiles(directory)) {
        const source = readFileSync(file, "utf8");
        for (const match of source.matchAll(/class\s+(\w+)\s+implements\s+AuthAttachment\b/g)) {
          implementations.add(match[1]);
        }
      }
    }

    const registered = new Set(registeredAuthAttachments.map((entry) => entry.name));
    expect([...implementations].sort()).toEqual([...registered].sort());
  });
});
