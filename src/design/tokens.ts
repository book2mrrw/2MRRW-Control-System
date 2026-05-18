import type { CSSProperties } from "react";

export const controlTokens = {
  color: {
    foundation: {
      black: "#03050a",
      obsidian: "#070a12",
      deck: "#0b1020",
      panel: "#0f1729",
      panelRaised: "#141d33",
    },
    text: {
      primary: "#f4f8ff",
      secondary: "#aebbd4",
      muted: "#68758f",
      inverse: "#03050a",
    },
    accent: {
      signal: "#3ee7ff",
      vault: "#9a6cff",
      commerce: "#ff9f3e",
      danger: "#ff4f64",
      success: "#6affb7",
    },
    border: {
      subtle: "rgba(174, 187, 212, 0.14)",
      strong: "rgba(62, 231, 255, 0.34)",
      warm: "rgba(255, 159, 62, 0.34)",
      danger: "rgba(255, 79, 100, 0.36)",
    },
  },
  rgb: {
    signal: "62 231 255",
    vault: "154 108 255",
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
