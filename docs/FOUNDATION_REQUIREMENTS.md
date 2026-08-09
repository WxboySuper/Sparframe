# Core Foundation Requirements

**Status:** Core runtime and shell bootstrap are implemented; domain behavior
belongs to application extensions.

Sparframe Core provides the machinery needed to build a workspace without
deciding what that workspace should contain. It must stay useful for different
domains, providers, and presentation choices.

## Adaptable capabilities

Applications can add capabilities through source-level extensions. A capability
may provide:

- portable data and relationships;
- actions and workflows;
- web, mobile, or shell-neutral surfaces;
- source adapters and interpreters;
- notifications, recommendations, or agent tools; and
- settings, tests, and documentation.

The foundation owns discovery, registration, composition, lifecycle, and
provider-neutral service boundaries. It does not own a universal task model,
calendar model, dashboard schema, or workflow vocabulary.

## Shell composition

The web and mobile shells consume the same discovered extension model while
rendering platform-appropriate interfaces. The core starter must work with an
empty catalog and clearly explain how an application adds its first extension.

Composition is inspectable and deterministic:

- extension packages are discovered from a configured source directory;
- the CLI generates ordinary static TypeScript imports;
- shells never maintain hand-written extension arrays; and
- unsupported or empty compositions produce explicit states.

The generated catalog is an application build artifact, not a runtime
marketplace or remote code loader.

## Provider-neutral services

Authentication, persistence, synchronization, notifications, and device
services are represented by contracts. A shell may use the core no-auth default
while an application supplies provider implementations through its own
extensions or host wiring.

The foundation includes deterministic in-memory persistence, synchronization,
and notification adapters for development and tests. These adapters are not
production storage or a hosted service.

## Portability and performance

Contracts must remain free of vendor SDKs and shell UI dependencies. Foundation
behavior should be usable from web, mobile, server, tests, and future shells
where the relevant runtime services exist. Generated source should remain
statically analyzable by TypeScript, Vite, Expo, and code-review tooling.

The core should not add background work, network calls, or persistence behind a
developer's back. Applications choose those behaviors explicitly through
provider extensions and host configuration.
