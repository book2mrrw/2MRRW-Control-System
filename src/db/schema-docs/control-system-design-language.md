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
- Reusable components should cover uploads, forms, contributor editors, media cards, dropdowns, scheduling, previews, and modals. Each must account for empty, loading, error, ready, and disabled states.
- Advanced controls should use progressive disclosure. Start with the fastest creator path, then reveal power controls only when the release shape needs them.
- Active states use thin borders, low-opacity fills, and accent glow. Avoid oversized gradients, playful icons, and marketing badges.
- Copy should be calm and creator-facing in day-to-day flows: saved, synced, restored, ready, preview, protected. Technical responsibilities stay in docs and service contracts.

## Governance Standards

- Use the centralized token contract for spacing, typography, blur, cards, borders, shadows, and motion timing. Do not create one-off spacing scales or bespoke card styles for new modules.
- Motion should use immediate, standard, or deliberate timing only. Prefer cinematic reveal pacing, hover lift, drag feedback, and shimmer loading over spinners.
- Empty states should teach the next step without sounding like a generic SaaS dashboard.
- Errors should preserve creative momentum: keep editing available, offer retry or restore, and avoid alarming language.
- Accessibility is a product requirement: keyboard navigation, screen-reader labels, readable contrast, reduced motion support, and comfortable touch targets.
- Content governance requires stable slugs, normalized filenames, explicit language/timezone metadata, structured media locations, and clear priority ownership for hero/vault/featured surfaces.
- Future apps and integrations consume stable API contracts. Frontend clients should not own Control System edit state, raw storage paths, or release governance logic.

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
