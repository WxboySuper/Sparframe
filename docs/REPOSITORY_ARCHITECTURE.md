# Repository Architecture

**Status:** Canonical convention for the public core repository

Sparframe Core is a workspace containing the reusable runtime and generic
reference shells. An application created from the CLI owns its domain code and
extensions separately.

## Core layout

```text
Sparframe/
├─ apps/
│  ├─ web/                         # Generic web reference shell
│  └─ mobile/                      # Generic Expo/React Native reference shell
├─ packages/
│  ├─ cli/                         # Public CLI and app template
│  ├─ contracts/                   # Provider-neutral TypeScript contracts
│  ├─ foundation/                  # Registry, runtime, services, composition
│  ├─ design/                      # Shared tokens and presentation contracts
│  └─ extension-catalog/           # Generated private application catalog
├─ extensions/                     # Empty boundary; applications add packages
├─ docs/
├─ scripts/
├─ templates/
├─ .github/
├─ package.json
└─ pnpm-workspace.yaml
```

## Package responsibilities

### Contracts

Contains portable types and interfaces used across shells and extensions. It
must not import vendor SDKs, React, React Native, or application domains.

### Foundation

Contains shared behavior that multiple shells or extensions genuinely need:
registry lifecycle, composition, actions, service defaults, persistence
boundaries, synchronization boundaries, and diagnostics. It must remain
platform-independent wherever practical.

### Design

Contains shared tokens and presentation-level contracts. It helps shells feel
related without requiring identical components or layouts.

### CLI and generated catalog

The CLI owns application initialization, extension synchronization, shell
commands, and base package updates. The generated catalog contains static
imports for one application workspace and is never hand-edited.

### Reference shells

The web and mobile applications are generic hosts. They compose discovered
extensions and provide a useful empty-state screen. They must not contain
domain rules, provider SDKs, or personal configuration.

## Dependency direction

```text
contracts  ←  foundation  ←  application extensions  ←  shell composition
    ↑             ↑                    ↑                    ↑
    └─────────────┴────────────── design contracts ─────────┘
```

Provider SDKs belong in application-owned provider extensions. The foundation
must not import a shell, vendor, or application extension.

## Extraction boundary

The public core contains no personal data, domain implementation, deployment
configuration, provider credentials, or private application history. Those
belong in the application repository that consumes the core packages.
