# Midea Vertical Agent

## Project Goal

This fork is the development base for a Midea enterprise Agent built on Hermes
Agent. The first target is a Chinese-language internal assistant that can answer
grounded product/service questions and later orchestrate approved workflows in
Midea systems.

## Current Status

- Repository: `Alvarezz19/midea-coding-agent`
- First-run runtime profile: `midea-dev`; Midea Desktop persists explicit
  profile selections and keeps each Runtime isolated
- Current model provider: DeepSeek direct API
- Current terminal backend: local Windows development environment
- Midea desktop client: `apps/midea-desktop/`, an independent Electron + React
  application built on the public Hermes gateway contract and `@hermes/shared`
- Current setup posture: Blank Slate; only the minimum file and terminal
  capabilities are enabled until domain integrations are implemented
- Midea domain plugins and MCP integrations are not implemented yet
- No Midea business-system credentials or production data belong in this repo

## Target Architecture

```text
Midea Desktop / WeCom / CLI / future web entry
                       |
                  Hermes Gateway
                       |
                  Runtime profile
                       |
                     AIAgent
                  /      |       \\
             Skills   Plugin     MCP services
                                /      |       \\
                         Knowledge  CRM/ERP/PLM/MES
```

Use the least permanent surface that solves the problem:

1. Skills for repeatable procedures and domain instructions.
2. MCP services for external knowledge bases and enterprise APIs.
3. A general plugin for Midea tool schemas, deterministic orchestration,
   permission checks, and audit hooks.
4. Provider or memory plugins only when a dedicated backend is genuinely
   required.
5. Hermes core changes only after the previous options are insufficient.

## Midea Desktop Boundary

`apps/midea-desktop/` is a separate, long-lived product surface. It must not
import code, components, stores, styles, preload APIs, Electron lifecycle code,
or build output from the generic `apps/desktop/` application.

The allowed shared frontend boundary is the framework-neutral
`apps/shared/` package (`@hermes/shared`) and the public Hermes gateway
protocol. Generic protocol helpers needed by both desktop products belong in
`apps/shared/` and require behavior-level tests.

Midea Desktop defaults to the `midea-dev` profile on first launch and supports
explicit creation and selection of isolated profiles. The Electron process
supplies `--profile <selected-profile>`, and the renderer verifies the
gateway-reported `profile_name` before enabling chat. Profile selection must
remain explicit and tested; it must never silently fall back between
development, staging, and production.

Midea business data access, authorization, audit, and mutation policy do not
belong in the desktop UI. They remain backend responsibilities of
`plugins/midea-domain/` or external Midea MCP services.

See [`decisions/ADR-0001-midea-desktop-boundary.md`](decisions/ADR-0001-midea-desktop-boundary.md)
for the decision and consequences. Application-specific development guidance
lives in [`../../apps/midea-desktop/AGENTS.md`](../../apps/midea-desktop/AGENTS.md)
and [`../../apps/midea-desktop/README.md`](../../apps/midea-desktop/README.md).

## Initial Use Cases

Prioritize these in order:

1. Product, policy, repair-SOP, and fault-code knowledge retrieval with
   citations, document versions, effective dates, and explicit uncertainty.
2. Read-only after-sales lookups: product, customer, service ticket, parts, and
   repair history.
3. Approved write workflows such as creating or updating tickets, always behind
   server-side authorization and explicit user confirmation.
4. Operational reports and scheduled summaries after the read-only flows are
   reliable.

Suggested domain tool names:

```text
midea_kb_search
midea_kb_fetch
midea_product_lookup
midea_fault_diagnose
midea_service_ticket_search
midea_create_ticket       # later; approval required
```

## Engineering Boundaries

- Prefer `plugins/midea-domain/`, `SKILL.md`, and external `midea-*-mcp`
  services. Do not add Midea tools to Hermes' global core tool list unless an
  Architecture Decision Record proves it is necessary.
- Keep dynamic business context in tool results or user-message context
  injection. Do not rebuild the stable system prompt on every turn; prompt
  caching is a project requirement.
- Enforce tenant, department, role, and document access in the backend service,
  not only in Prompt instructions or tool arguments.
- Read-only first. All mutations require confirmation, audit records, and a
  business-system-generated identifier.
- Secrets belong in the active profile's `.env`; non-secret behavior belongs in
  its `config.yaml`. Never commit either secrets or real customer/business data.
- Treat external enterprise services as separate deployable components with
  timeouts, bounded results, retries, health checks, and fail-closed auth.

## Profiles and Environments

Use separate Hermes profiles and credentials for:

```text
midea-dev       local development and mocked integrations
midea-staging   controlled integration tests
midea-prod      production gateway and production credentials
```

Do not point two independent Agent processes at the same profile. A profile
isolates configuration, memory, sessions, skills, logs, and gateway state, but
it is not a filesystem sandbox. Use Docker/SSH or another isolated terminal
backend for production execution.

## Development Commands

Run commands through the repository virtual environment:

```powershell
.\\.venv\\Scripts\\hermes.exe -p midea-dev doctor
.\\.venv\\Scripts\\hermes.exe -p midea-dev chat
python -m pytest tests -q
```

When PowerShell resolves `python` outside `.venv`, use the explicit interpreter:

```powershell
.\\.venv\\Scripts\\python.exe -m pytest tests -q
```

## Current Work Queue

1. Define Midea users, top workflows, data sources, permissions, and acceptance
   cases.
2. Create `plugins/midea-domain/` with read-only schemas and test doubles.
3. Create `midea-knowledge-mcp` with document ACL filtering and citations.
4. Configure the smallest `midea-dev` toolsets and validate with `doctor`.
5. Connect a staging WeCom path after authorization and audit policies exist.

The Midea Desktop foundation is complete. Track changing implementation status,
verification results, known limitations, and immediate next steps in
[`STATUS.md`](STATUS.md), rather than expanding this stable context document
with a chronological work log.

## Codex Reading Order

For Midea work, read these files in order before editing:

1. Repository `AGENTS.md`.
2. This file.
3. [`STATUS.md`](STATUS.md).
4. Relevant records under [`decisions/`](decisions/).
5. The nearest component-level `AGENTS.md` and README.

For every task, first inspect the relevant Hermes implementation and tests,
then state the files to change and the verification path before editing.
