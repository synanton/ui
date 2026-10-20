import * as React from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Button, Surface } from "./index";

describe("ui-primitives", () => {
  it("button composes base, variant, and size classes", () => {
    const { container } = render(<Button variant="secondary" size="sm">Go</Button>);
    const button = container.querySelector("button");

    expect(button).not.toBeNull();
    expect(button!.className).toContain("syn-button");
    expect(button!.className).toContain("syn-button--secondary");
    expect(button!.className).toContain("syn-button--sm");
    expect(button!.textContent).toBe("Go");
  });

  it("button asChild renders the provided element with the button classes", () => {
    const { container } = render(
      <Button asChild variant="ghost">
        <a href="/search">Search</a>
      </Button>
    );
    const link = container.querySelector("a");

    expect(link).not.toBeNull();
    expect(link!.className).toContain("syn-button--ghost");
    expect(link!.getAttribute("href")).toBe("/search");
  });

  it("surface adds the inset modifier", () => {
    const { container } = render(<Surface inset>body</Surface>);
    expect(container.firstElementChild!.className).toContain("syn-surface--inset");
  });
});
