# ADR-0001: Keep Midea Desktop Independent

- Status: Accepted
- Date: 2026-08-11

## Context

Midea needs a company-specific desktop Agent that can evolve independently of
Hermes' generic desktop product. Directly modifying or importing internals from
`apps/desktop/` would make routine upstream synchronization conflict-prone and
would tie Midea's release cadence and business UI to implementation details the
generic desktop application does not promise to preserve.

Both applications still need the same Hermes backend protocol. Duplicating that
transport would create protocol drift and unnecessary maintenance.

Enterprise authorization is also a separate concern from desktop presentation.
A renderer can be modified or bypassed, so it cannot enforce access to Midea
data or approve business mutations.

## Decision

Midea Desktop is an independent workspace at `apps/midea-desktop/`.

- It must not import from `apps/desktop/` or consume that application's build
  artifacts, internal components, stores, styles, preload bridge, or Electron
  lifecycle.
- It may depend on the public Hermes gateway contract and framework-neutral
  helpers in `apps/shared/` (`@hermes/shared`).
- A helper shared by both desktop products may move into `apps/shared/` only
  when it is protocol-level, has no product-specific UI assumptions, and has
  behavior-level tests.
- Midea-specific presentation and machine lifecycle stay within
  `apps/midea-desktop/`.
- Midea data access, tenant and role authorization, audit, and mutation policy
  stay in `plugins/midea-domain/` or separately deployed Midea MCP/backend
  services and must fail closed.
- The initial distribution uses `midea-dev` as its first-run default. Electron
  persists explicit profile selection, launches the selected profile, and
  verifies the gateway-reported profile before enabling chat. Profile changes
  restart the Runtime and must not silently inherit from or fall back to
  another profile.

## Consequences

- Upstream changes to the generic desktop can be synchronized without forcing
  Midea UI merges.
- Similar UI behavior may be implemented twice when it is product-specific;
  this duplication is accepted to preserve ownership boundaries.
- Protocol improvements can benefit both applications through `apps/shared/`
  without coupling their product code.
- Midea Desktop owns its own dependencies, tests, packaging, visual design, and
  release lifecycle.
- Backend services remain the security boundary even when the desktop provides
  confirmation or approval UI.

## Enforcement

- `apps/midea-desktop/AGENTS.md` documents the local boundary.
- ESLint rejects imports from the generic desktop application.
- Runtime tests assert the `midea-dev` first-run launch argument and that a
  request for another profile cannot reuse a mismatched Runtime connection.
- Renderer tests assert that a mismatched gateway profile blocks chat.
- `npm run check --workspace apps/midea-desktop` is required for desktop
  changes; runtime/profile, IPC, authentication, and gateway changes also need
  integration or end-to-end coverage.
