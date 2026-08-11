# Midea Desktop

Midea Desktop is an independent Electron + React client for the Midea vertical-domain Agent. It uses Hermes' public headless gateway and the framework-neutral `@hermes/shared` transport, but it does not import code, styles, stores, or components from `apps/desktop`.

## Architecture

```text
apps/midea-desktop
  Electron main process
      -> hermes --profile midea-dev serve --isolated
  React renderer
      -> @hermes/shared JsonRpcGatewayClient
  Midea domain capability
      -> plugins/midea-domain and external Midea MCP services
```

The initial release intentionally fixes the runtime profile to `midea-dev`. The Electron process passes `--profile midea-dev`, and the renderer rejects the session if the gateway reports another profile.

## Development

Install workspace dependencies from the repository root, then start the app:

```powershell
npm install
npm run dev:midea-desktop
```

The app prefers the repository's `.venv` Hermes executable. A packaged build falls back to `hermes` on `PATH`, so the Hermes runtime must be installed separately.

Run verification:

```powershell
npm run check --workspace apps/midea-desktop
```

Build the Windows installer:

```powershell
npm run dist:win --workspace apps/midea-desktop
```

## Ownership Boundary

- Machine lifecycle and runtime discovery live under `electron/`.
- Agent transport and event translation live under `src/lib/`.
- Renderer state lives under `src/store/`.
- Midea UI lives under `src/components/` and `src/app/`.
- Midea business authorization and data access do not belong in this app. They must be enforced by `plugins/midea-domain` or external MCP/backend services.

Do not import from `apps/desktop`. When both clients need a stable protocol helper, place the generic helper in `apps/shared` and give it behavior-level tests there.
