# Extension Architecture Direction

**Status:** Capability-based source extension pipeline implemented; taxonomy remains open

The platform should be extended through source-level modules with predictable locations and contracts. This is a DIY developer/agent experience, not primarily a no-code runtime builder.

## Intended Workflow

When an application needs a new capability, its developer or agent should be able to:

1. Create or update a bounded extension area in the repository.
2. Define its TypeScript data types and source adapters.
3. Connect it to shared platform contracts.
4. Add pages, panels, actions, and settings for the extension.
5. Register the extension with the available shells.
6. Test its behavior and its interactions with the shared foundation.

The extension should work with the rest of the platform without requiring unrelated foundation code to be rewritten.

## Conceptual Boundaries

The eventual source tree should have clear boundaries for:

- shared foundation code
- web shell code
- mobile shell code
- shared UI and contracts
- application or domain extensions
- integrations and source interpreters
- extension tests and documentation

The repository now uses `packages/` for shared contracts/foundation, `apps/` for
shells, and `extensions/` for source-level modules. The important principle is
that an agent can determine where new extension code belongs and what contracts
it must satisfy.

## Contract Model

The extension system should use one small shared base contract with optional composable capabilities. The base contract should contain only information every extension needs, such as identity, version, dependencies, permissions, supported shells, contributed surfaces, and lifecycle behavior.

Specialized capabilities should be opt-in rather than required fields on every extension. Possible capabilities include data sources, interpreters, views, actions, automations, agent tools, recommendations, notifications, and presentation providers.

This keeps the foundation lean while allowing users, developers, and agents to build different kinds of extensions on top of it. It avoids both a giant universal plugin contract and a collection of unrelated extension systems.

## Extension Is an Umbrella Term

"Extension" is a blanket term for source-level additions to the platform. It does not imply one specific shape or responsibility. Possible extension kinds include:

- external integrations and source interpreters
- application-area or domain modules
- pages, dashboards, and visualization packages
- workflow and automation packages
- agent tools and recommendation providers
- notification or device adapters
- themes and presentation packages
- experimental learning modules

The taxonomy should remain open until real features demonstrate which distinctions are useful. The shared contract should describe what an extension contributes without requiring every extension to provide the same parts.

## Extension Responsibilities

An extension may own:

- domain-specific types
- data import or interpretation
- domain-specific pages and panels
- actions and workflows
- shell-specific presentations
- settings and preferences
- selected home-surface contributions
- tests, fixtures, and documentation

## Shell Surface Declarations

An extension should declare where its views and actions are exposed. It may:

- provide one view usable in both web and mobile
- provide a web-specific view and a different mobile-specific view
- provide a view for only one shell
- contribute non-visual data or behavior without adding a page

The extension defines its available surfaces; each shell makes those surfaces available according to the extension declaration and the user's configuration.

The shared foundation should own only cross-cutting behavior that genuinely belongs everywhere. If a feature can remain inside an extension, it should not be promoted into the foundation merely for convenience.

The current implementation defines the smallest useful base contract and the
specialized capability shapes demonstrated by the initial extensions. The
platform should continue learning its extension taxonomy from use rather than
predicting every future extension type.

## Source-Level, Not Runtime-Only

The primary extension mechanism is source code and repository configuration changed by developers or agents. Runtime preferences may control visibility, ordering, and configuration, but new domain behavior should remain inspectable, reviewable, testable, and versioned in Git.

## Platform-Service Extensions

Some extensions provide services that the shells and other extensions may depend on. They are still extensions, but they participate in platform startup and lifecycle more directly than ordinary domain or presentation extensions.

Initial platform-service categories may include:

- authentication and identity
- persistence and synchronization
- notifications and device services

The foundation should define provider-neutral contracts for these services. A provider implementation belongs in its own extension. For example, authentication should expose concepts such as identity, session state, sign-in, sign-out, and route protection without importing a specific provider into the foundation.

An auth-provider extension may implement the authentication contract for the web and Expo/React Native shells, but the foundation and other extensions must not depend directly on a vendor SDK. This preserves the option to replace a provider, provide a development mock, or support another provider later.

Authentication is therefore a required-in-practice platform capability for protected shells, but it is not a built-in provider-specific foundation feature.
