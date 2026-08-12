# Midea Desktop

Midea Desktop is an independent Electron + React client for the Midea vertical-domain Agent. It uses Hermes' public headless gateway and the framework-neutral `@hermes/shared` transport, but it does not import code, styles, stores, or components from `apps/desktop`.

## Architecture

```text
apps/midea-desktop
  Electron main process
      -> hermes --profile <selected-profile> serve --isolated
  React renderer
      -> @hermes/shared JsonRpcGatewayClient
  Midea domain capability
      -> plugins/midea-domain and external Midea MCP services
```

The first launch defaults to `midea-dev`. Midea Desktop can create, clone,
switch, rename, and delete isolated Hermes profiles; Electron persists the
selection and restarts the Runtime with `--profile <selected-profile>`. The
renderer rejects the session if the gateway reports any other profile.

The desktop also provides rich chat rendering (Markdown, highlighted code,
attachments, media, structured tool output, and diffs), onboarding, settings,
provider/model/tool management, Skills Hub and custom Skill management, and MCP
server/catalog/OAuth management.

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
