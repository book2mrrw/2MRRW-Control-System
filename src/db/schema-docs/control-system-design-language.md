# Control System Design Language

The 2MRRW Control System is an infrastructure command room for operators, not a fan-facing storefront. The interface should feel cinematic, precise, and systems-aware: near-black foundation, restrained glass panels, thin borders, ambient glow, and small uppercase metadata labels.

## Token Semantics

- Foundation tokens use near-black surfaces: background, elevated deck, panel, and raised panel.
- Text tokens separate primary readouts, secondary context, and muted instrumentation.
- Cyan `signal` represents system health, live routes, playback, dispatch, and active operational state.
- Purple `vault` represents memberships, protected media, identity, permissions, and gated access.
- Orange `commerce` represents collector inventory, checkout readiness, scarcity, fulfillment, and ledger pressure.
- Red `danger` is reserved for errors, incidents, denied access, policy violations, and destructive actions.
- Radii stay precise and structural; shadows should read as ambient hardware glow, not soft SaaS cards.
- Motion is subtle and deliberate. Prefer quiet ambient movement and fast focus feedback over decorative animation.

## Component Language

- Shells use a status strip, left navigation rail, central workspace, and optional right inspector.
- Cards are operational modules with an eyebrow, clear noun title, state badge, short system description, and current readout.
- Active states use thin borders, low-opacity fills, and accent glow. Avoid oversized gradients, playful icons, and marketing badges.
- Copy should name backend responsibilities directly: signal state, vault grants, signed URLs, webhook fulfillment, RLS, audit events, dispatch queues.

## Responsive Rules

- The rail may collapse into a compact horizontal or stacked navigation on smaller screens.
- Inspector panels should move below the workspace before content becomes cramped.
- Operational cards should collapse to one column on mobile while preserving labels, state, and readout hierarchy.
- Hit targets must remain large enough for touch even when the aesthetic is dense.

## Tone Rules

- Use admin/control-room language: "armed", "verified", "webhook first", "policy guard", "dispatch queue".
- Do not use fan-facing commerce language such as "shop now", "cart", "limited offer", or lifestyle campaign copy.
- Membership and collector features should be framed as permissions, ledgers, scarcity controls, and fulfillment operations.
- Errors should be calm and actionable. Red should indicate operational attention, not alarmist decoration.
