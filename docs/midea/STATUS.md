# Midea Agent Development Status

Last updated: 2026-08-12

This file records the current implementation state. Stable goals and
architectural boundaries belong in `PROJECT_CONTEXT.md`; durable design
decisions belong under `decisions/`.

## Current Phase

The independent Midea Desktop now provides the complete generic Agent
workbench required for profile-isolated development. Midea domain knowledge,
authorization policy, audit, and enterprise-system integrations are the next
phase.

## Completed

- Added the independent `apps/midea-desktop/` Electron + React workspace with
  no imports, build dependencies, or runtime dependencies on `apps/desktop/`.
  It reuses only the public Hermes contracts and `@hermes/shared` transport.
- Added profile creation, cloning, switching, renaming, and deletion. Electron
  persists the selected profile, restarts the Runtime on profile changes, and
  rejects a connection or Gateway session whose profile does not match.
- Added streaming chat, stop generation, Markdown/GFM, highlighted code,
  attachments, image/audio/video/iframe media, structured tool cards, inline
  diffs, and approval, clarification, sudo, and secret prompt flows.
- Added Runtime-backed onboarding plus profile-scoped settings, credentials,
  provider/model selection, expensive-model confirmation, model catalog
  refresh, toolset enablement, tool Provider selection, Provider credentials,
  and post-setup execution.
- Added custom Skill creation/editing, Skill enablement, Skills Hub search,
  preview, server-side safety scan, install, and uninstall.
- Added HTTP and stdio MCP creation, header and OAuth authentication,
  enablement, connection testing, deletion, catalog installation with
  background-action status polling, required credentials, and OAuth completion
  polling.
- Added Skills Hub and tool post-setup background-action polling with failure
  log tails, plus toolset-specific model catalog selection where Hermes exposes
  one.
- Kept secrets out of renderer persistence and restricted management requests
  to an explicit local REST path allowlist. The renderer remains sandboxed and
  external navigation is limited to `http` and `https` through a narrow IPC
  bridge.

## Next Steps

1. Define Midea users, priority workflows, data sources, permission rules, and
   acceptance cases.
2. Implement read-only schemas and test doubles in `plugins/midea-domain/`.
3. Implement `midea-knowledge-mcp` with document ACL filtering, citations,
   versions, and effective dates.
4. Integrate the first read-only domain workflow without moving authorization,
   credentials, business data, or audit policy into the desktop renderer.
5. Validate explicit `midea-staging` and `midea-prod` deployment policies before
   connecting either profile to enterprise systems.

## Known Limitations

- No Midea domain plugin, knowledge MCP service, enterprise-system connector,
  or production business workflow is implemented yet.
- Packaged builds require an independently installed `hermes` executable on
  `PATH`; Hermes is not bundled into the installer.
- Windows development launch and packaging have been verified. Other operating
  systems have not.
- The production renderer bundle includes the full syntax-highlighting catalog
  and currently exceeds Vite's 500 kB chunk advisory; this affects download and
  startup size, not correctness.

## Verification

From the repository root:

```powershell
npm run check --workspace apps/midea-desktop
node apps/midea-desktop/scripts/verify-electron.mjs
npm run dist:win --workspace apps/midea-desktop
```

The latest verification covers TypeScript, ESLint, 23 Vitest behavior tests,
production renderer/Electron builds, real Electron-to-Hermes startup, all seven
management tabs, renderer console errors, horizontal overflow, and visual
checks at 1280x820 and 920x640. Windows packaging was verified before the most
recent renderer-only management additions and should be rerun for a release
candidate.

## Maintenance Rule

Keep only the current state here. Remove completed next steps when they stop
being useful, and link commits or ADRs when historical reasoning matters.
