# Sparframe Core

## Project meaning

Sparframe Core is the open-source framework for building personal, team, or
project workspaces from shared contracts, runtime services, and web/mobile
shells.

The core is intentionally small. It owns provider-neutral contracts, extension
composition, lifecycle behavior, portable service boundaries, design tokens,
the CLI, and a runnable shell scaffold. Applications own their domain models,
provider integrations, authentication choices, persistence implementations,
and user experience.

## Boundary rules

- `packages/contracts` contains portable types and interfaces only.
- `packages/foundation` contains shared runtime behavior and deterministic
  development services; it must not import React, a vendor SDK, or an app.
- `packages/design` contains cross-shell design tokens and presentation
  contracts.
- `packages/cli` creates and updates application workspaces without imposing a
  runtime marketplace or remote code loader.
- `apps/web` and `apps/mobile` are generic reference shells, not product
  domains.
- Extensions belong to the application that uses them. This repository ships
  no domain, integration, or authentication extensions.

When a feature is useful only to one application, keep it out of core. When a
provider is required, define or consume a provider-neutral contract and let an
application supply the implementation.

## Working style

Keep changes reviewable and source-level. Preserve the generated extension
catalog contract, run the relevant package and shell checks, and update the
documentation when a public boundary changes. Do not add personal data,
deployment configuration, provider credentials, or application-specific
fixtures to this repository.
