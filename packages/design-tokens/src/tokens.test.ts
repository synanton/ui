import { describe, expect, it } from "vitest";
import tokens from "./tokens.json";

const REM_PX = 16;

function toPx(value: string): number {
  const match = /^([0-9.]+)rem$/.exec(value);
  if (!match) {
    throw new Error(`Unsupported spacing value: ${value}`);
  }
  return Number(match[1]) * REM_PX;
}

function luminance(hex: string): number {
  const clean = hex.replace("#", "");
  const channels = [0, 2, 4].map(
    (offset) => parseInt(clean.slice(offset, offset + 2), 16) / 255
  );
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

const textPairs = [
  ["foreground", "background"],
  ["foreground", "surface"],
  ["muted", "surface"],
  ["accentForeground", "accent"],
  ["danger", "background"]
] as const;

describe("design tokens", () => {
  it("space steps are monotonically increasing and follow the named scale", () => {
    const steps = Object.entries(tokens.space)
      .map(([step, value]) => ({ step: Number(step), px: toPx(value) }))
      .sort((a, b) => a.step - b.step);

    expect(steps.length).toBeGreaterThan(0);
    for (let index = 1; index < steps.length; index += 1) {
      expect(steps[index].px).toBeGreaterThan(steps[index - 1].px);
    }
    for (const { step, px } of steps) {
      expect(px).toBeCloseTo(step * 4);
    }
  });

  it("text-on-surface pairs meet WCAG AA contrast (>= 4.5:1)", () => {
    for (const [text, surface] of textPairs) {
      const ratio = contrast(tokens.color[text], tokens.color[surface]);
      expect(ratio, `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // The substrate is light-only today. This becomes a real test once a dark
  // palette exists; trigger: before Stage 2 criterion A begins (UI issue #1).
  it.todo("resolves light and dark palettes with the same semantic keys");
});
