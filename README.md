# Sparframe Core

Sparframe is an open-source foundation for building adaptable personal,
project, and team workspaces. It provides provider-neutral contracts, a shared
runtime, web and mobile shells, extension discovery, and a CLI for creating
new app workspaces.

The core is deliberately not a productivity app and does not ship domain
features or integrations. An application chooses its own extensions,
authentication provider, persistence, synchronization, and presentation.

## Quick start after npm publication

```powershell
npx sparframe init my-app
cd my-app
pnpm start
```

The npm publication is prepared but intentionally deferred. Until the packages
are published, use the source-development path below.

## Develop from source

```powershell
git clone https://github.com/WxboySuper/Sparframe.git
cd Sparframe
pnpm install
pnpm sparframe sync
pnpm build
```

The generated workspace contains web and Expo/React Native shells, shared
packages, an empty extension catalog, and the source-level conventions needed
to add an application extension. Use `pnpm build` to build the web shell and
typecheck the mobile shell.

```powershell
pnpm build
pnpm sync
pnpm validate:mobile
```

## Core packages

- `@sparframe/contracts` — portable contracts for extensions, services, and
  shell composition.
- `@sparframe/foundation` — registry, composition, lifecycle, actions, and
  deterministic development adapters.
- `@sparframe/design` — cross-shell design tokens and presentation contracts.
- `sparframe` — the CLI and application template.

## Add application behavior

Create an extension inside the application workspace under `extensions/`.
Declare its manifest in `package.json`, export the extension from `src/index.ts`,
and let `sparframe sync` generate the static catalog. The core never imports or
loads application extensions dynamically at runtime.

See [the extension authoring guide](docs/EXTENSION_AUTHORING.md) and
[the application structure](docs/APP_STRUCTURE.md).

## Repository development

```powershell
pnpm install
pnpm check:architecture
pnpm check:packages
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build:web
pnpm validate:mobile
```

The public package release order and tarball checks are documented in
[docs/RELEASE.md](docs/RELEASE.md).

## License

Sparframe Core is released under the [MIT License](LICENSE).
