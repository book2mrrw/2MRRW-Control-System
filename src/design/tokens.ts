import type { CSSProperties } from "react";

export const controlTokens = {
  color: {
    foundation: {
      black: "#050505",
      obsidian: "#0A0A0F",
      deck: "#101014",
      panel: "#101014",
      panelRaised: "#15111d",
    },
    text: {
      primary: "#ffffff",
      secondary: "#a1a1aa",
      muted: "#71717a",
      inverse: "#050505",
    },
    accent: {
      signal: "#8B5CF6",
      vault: "#7C3AED",
      commerce: "#ff9f3e",
      danger: "#ff4f64",
      success: "#6affb7",
    },
    border: {
      subtle: "rgba(255, 255, 255, 0.08)",
      strong: "rgba(139, 92, 246, 0.34)",
      warm: "rgba(255, 159, 62, 0.34)",
      danger: "rgba(255, 79, 100, 0.36)",
    },
  },
  rgb: {
    signal: "139 92 246",
    vault: "124 58 237",
    commerce: "255 159 62",
    danger: "255 79 100",
    success: "106 255 183",
  },
  radius: {
    xs: "6px",
    sm: "10px",
    md: "16px",
    lg: "24px",
    pill: "999px",
  },
  space: {
    xs: "6px",
    sm: "10px",
    md: "14px",
    lg: "20px",
    xl: "28px",
  },
  typography: {
    ui: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    scale: {
      caption: "0.72rem",
      body: "0.92rem",
      title: "1.25rem",
      hero: "clamp(2.5rem, 7vw, 6rem)",
    },
  },
  shadow: {
    ambient: "0 30px 90px rgba(0, 0, 0, 0.48)",
    signal: "0 0 32px rgba(62, 231, 255, 0.26)",
    vault: "0 0 34px rgba(154, 108, 255, 0.24)",
    commerce: "0 0 30px rgba(255, 159, 62, 0.2)",
    danger: "0 0 30px rgba(255, 79, 100, 0.2)",
  },
  motion: {
    immediate: "120ms",
    standard: "220ms",
    deliberate: "420ms",
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    shimmer: "1400ms",
  },
  blur: {
    panel: "18px",
    modal: "28px",
  },
} as const;

export const controlTones = {
  signal: {
    label: "Signal",
    cssVar: "var(--control-accent-signal)",
    rgbVar: "var(--control-accent-signal-rgb)",
    usage: "System status, transmission control, live routing, and active operational state.",
  },
  vault: {
    label: "Vault",
    cssVar: "var(--control-accent-vault)",
    rgbVar: "var(--control-accent-vault-rgb)",
    usage: "Membership, gated media, permissions, and protected catalog workflows.",
  },
  commerce: {
    label: "Commerce",
    cssVar: "var(--control-accent-commerce)",
    rgbVar: "var(--control-accent-commerce-rgb)",
    usage: "Collector drops, checkout readiness, scarcity, fulfillment, and inventory pressure.",
  },
  danger: {
    label: "Alert",
    cssVar: "var(--control-accent-danger)",
    rgbVar: "var(--control-accent-danger-rgb)",
    usage: "Errors, policy violations, failed jobs, destructive actions, and incidents.",
  },
  success: {
    label: "Stable",
    cssVar: "var(--control-accent-success)",
    rgbVar: "var(--control-accent-success-rgb)",
    usage: "Healthy sync, completed jobs, granted access, and verified delivery.",
  },
} as const;

export type ControlTone = keyof typeof controlTones;

export function controlToneStyle(
  tone: ControlTone,
): CSSProperties & Record<"--tone-color" | "--tone-rgb", string> {
  return {
    "--tone-color": controlTones[tone].cssVar,
    "--tone-rgb": controlTones[tone].rgbVar,
  };
}
