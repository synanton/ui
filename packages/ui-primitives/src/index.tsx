import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import "@synanton/design-tokens/tokens.css";
import "./primitives.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, variant = "primary", size = "md", className = "", ...props }, ref) => {
    const Component = asChild ? Slot : "button";
    const classes = ["syn-button", "syn-button--" + variant, "syn-button--" + size, className]
      .filter(Boolean)
      .join(" ");
    return <Component ref={ref} className={classes} {...props} />;
  }
);
Button.displayName = "Button";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export function Surface({ inset = false, className = "", ...props }: SurfaceProps) {
  const classes = ["syn-surface", inset ? "syn-surface--inset" : "", className]
    .filter(Boolean)
    .join(" ");
  return <div className={classes} {...props} />;
}
