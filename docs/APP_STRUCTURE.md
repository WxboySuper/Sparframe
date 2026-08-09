# Sparframe app structure

**Status:** Canonical developer convention

This document defines the smallest predictable structure for a Sparframe
application. It is a source-code convention for developers and agents, not a
runtime loader or a package generator.

## Canonical workspace

```text
sparframe-app/
├─ apps/
│  ├─ web/
│  │  ├─ src/
│  │  │  ├─ composition.ts       # Web composition entrypoint
│  │  │  └─ ...                  # Web routes, layouts, and platform UI
│  │  └─ package.json
│  └─ mobile/
│     ├─ composition.ts          # Mobile composition entrypoint
│     └─ package.json
├─ packages/
│  ├─ contracts/                 # Provider-neutral shared types
│  ├─ foundation/                # Shared runtime and orchestration
│  ├─ extension-catalog/          # Generated static workspace extension catalog
│  ├─ design/                    # Cross-shell tokens and presentation contracts
│  └─ test-utils/                # Shared fixtures and test helpers, when needed
├─ extensions/
│  ├─ <extension-name>/
│  │  ├─ src/                     # Domain behavior, adapters, and declarations
│  │  ├─ README.md               # What the extension contributes and consumes
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  ├─ platform/                  # Auth, persistence, sync, device services
│  ├─ integrations/              # External sources and interpreters
│  └─ experience/                # Optional pages, dashboards, and modes
├─ docs/                         # Architecture and project decisions
├─ scripts/                      # Repository checks and developer utilities
├─ package.json
└─ pnpm-workspace.yaml
```

The category folders under `extensions/` are organizational suggestions. A
small application may place extensions directly under `extensions/`; an
extension should move into a category only when that makes the repository
easier to navigate.

## Where code belongs

| Area                         | Owns                                                              | Must not own                                      |
| ---------------------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| `packages/contracts`         | Shared TypeScript contracts and portable values                   | Vendor SDKs, React, domain implementations        |
| `packages/foundation`        | Registry, composition, lifecycle, and cross-cutting rules         | Shell UI, provider SDKs, application domains      |
| `packages/design`            | Shared tokens and presentation contracts                          | Web-only or mobile-only components                |
| `extensions/*`               | Domain behavior, adapters, surfaces, actions, settings, and tests | Changes to shell internals just to become visible |
| `apps/web`                   | Web routes, layouts, browser behavior, and shell composition      | Domain rules and direct extension imports         |
| `apps/mobile`                | Expo routes, layouts, device behavior, and shell composition      | Domain rules and direct extension imports         |
| `packages/extension-catalog` | Generated static imports for discovered workspace extensions      | Hand-edited extension selection                   |
| `scripts`                    | Checks that protect repository conventions                        | Application runtime behavior                      |

## The extension path

Adding a capability should normally touch only:

1. A new or existing extension package.
2. Tests and documentation owned by that extension.
3. The generated catalog, refreshed automatically by the CLI during `start` or
   `build`.

The generator scans canonical packages under `extensions/`, creates
`packages/extension-catalog`, and emits ordinary static imports. Vite and Expo
therefore receive analyzable source without a runtime filesystem loader. Shell
entrypoints consume the generated catalog and never import individual
extensions or maintain extension arrays.

## Shared versus shell-specific code

An extension may provide separate web and mobile presentations. Shared domain
contracts and behavior stay in the extension package; platform-specific views
stay beside the corresponding shell or in an extension-owned platform view
module. The two shells should remain linked by contracts, not forced into one
identical component tree.

## App creation convention

Create a new app with `npx sparframe init my-app`. The CLI creates the
workspace, installs its dependencies, and discovers the starter extension. Add
future extensions under `extensions/`; `start` and `build` refresh the catalog
automatically. Use `npx sparframe sync` when you need to inspect or repair the
generated catalog. The historical layout in
[`templates/sparframe-app`](../templates/sparframe-app/README.md) remains a
reference for the workspace shape.

## Boundary checks

`pnpm check:architecture` verifies the rules that are cheap and stable enough
to automate today:

- contracts and foundation do not import apps or extensions;
- shell entrypoints do not import extension packages directly; and
- workspace package locations match the declared layout.

The check is intentionally narrow. It does not attempt to judge whether a
feature belongs in an extension, which remains a design and review decision.
