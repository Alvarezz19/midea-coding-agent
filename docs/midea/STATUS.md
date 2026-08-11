# Midea Agent Development Status

Last updated: 2026-08-11

This file records the current implementation state. Update it when a feature,
limitation, verification result, or immediate priority changes. Stable goals
and architectural boundaries belong in `PROJECT_CONTEXT.md`; durable design
decisions belong under `decisions/`.

## Current Phase

The independent Midea Desktop foundation is working end to end against the
`midea-dev` Hermes runtime. Domain knowledge and enterprise-system integrations
are the next phase.

## Completed

- Added the independent `apps/midea-desktop/` Electron + React workspace.
- Kept Midea Desktop free of imports and runtime dependencies on
  `apps/desktop/`; ESLint enforces the import boundary.
- Reused only the public Hermes JSON-RPC/WebSocket transport from
  `@hermes/shared`.
- Added streaming chat, tool activity, stop generation, and approval,
  clarification, sudo, and secret prompt flows.
- Added a sandboxed Electron renderer, context isolation, a narrow preload
  bridge, and a random local WebSocket session token.
- Pinned backend startup to `hermes --profile midea-dev serve --isolated` and
  blocked chat unless the gateway reports `profile_name` as `midea-dev`.
- Added root install and development commands and an independent Windows
  packaging configuration.

## Next Steps

1. Define Midea users, priority workflows, data sources, permission rules, and
   acceptance cases.
2. Implement read-only schemas and test doubles in `plugins/midea-domain/`.
3. Implement `midea-knowledge-mcp` with document ACL filtering, citations,
   versions, and effective dates.
4. Integrate the first read-only domain workflow into Midea Desktop without
   moving authorization into the renderer.
5. Define explicit staging and production desktop distribution/profile rules
   before either environment is enabled.

## Known Limitations

- No Midea domain plugin, knowledge MCP service, or enterprise-system connector
  is implemented yet.
- The current UI provides the generic Agent workflow; company-specific
  workflows and branding are not complete.
- Only the `midea-dev` runtime profile is supported by the first desktop
  release.
- Packaged builds require an independently installed `hermes` executable on
  `PATH`; Hermes is not bundled into the installer.
- Windows packaging and desktop launch have been verified. Other operating
  systems have not.

## Verification

From the repository root:

```powershell
npm run check --workspace apps/midea-desktop
npm run dev:midea-desktop
npm run dist:win --workspace apps/midea-desktop
```

The latest completed verification covered TypeScript, ESLint, six Vitest tests,
the production renderer/Electron build, real Electron-to-Hermes startup, visual
checks at 1280x820 and 920x640, and a Windows unpacked package.

## Maintenance Rule

Do not use this file as a detailed diary. Keep only the current state, remove
completed next steps when they stop being useful, and link commits or ADRs when
historical reasoning matters.
