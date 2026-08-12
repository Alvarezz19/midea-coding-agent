# Midea Desktop Engineering Guide

The repository `AGENTS.md` and `docs/midea/PROJECT_CONTEXT.md` remain authoritative.

## Product Boundary

Midea Desktop is a separate product surface. It may depend on the public Hermes gateway contract and `@hermes/shared`, but it must not import from `apps/desktop` or depend on that app's build output, internal stores, components, styles, preload bridge, or Electron lifecycle.

Keep responsibilities explicit:

- Electron owns the machine, process lifecycle, and the narrow preload bridge.
- React owns presentation and window-local interaction state.
- Hermes owns sessions, model calls, tools, memory, and streaming.
- Midea plugins and MCP services own business data, authorization, audit, and mutation policy.

The UI must never be treated as an authorization boundary. All enterprise access checks remain server-side and fail closed.

## Runtime Profile

Development builds use `midea-dev` as the first-run default and support explicit
profile selection after that. The selected profile is persisted by Electron,
passed to the Runtime command, and must agree with the gateway-reported
`profile_name` before the composer becomes available. Connecting to another
profile must restart the Runtime; never return a connection for a different
profile or replace this invariant with an unchecked environment variable.

Staging and production profiles must be explicitly created, selected, and
tested. They must not silently inherit from or fall back to another profile.

## Verification

Run from the repository root:

```powershell
npm run check --workspace apps/midea-desktop
```

Tests must exercise behavior, not source text. Any change to runtime resolution, profile selection, IPC, authentication, or gateway event handling requires an end-to-end or integration test in addition to focused unit coverage.
