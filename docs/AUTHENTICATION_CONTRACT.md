# Authentication contract

Sparframe Core defines a provider-neutral authentication boundary without
shipping an authentication provider. An application may supply an implementation
through host wiring or an application-owned extension.

## Contract

`AuthProvider` exposes:

- a provider identifier for diagnostics and configuration;
- loading, signed-out, or signed-in state;
- sign-in and sign-out operations; and
- a subscription for state changes.

`AuthIdentity` contains only portable identity fields. Provider implementations
may retain richer data without making it part of the shared contract.

## Core default

`createExtensionServices()` supplies `createNoAuthProvider()` when no provider
is configured. This default is deliberately signed out and cannot sign in; it
exists so the generic shells and an empty application catalog can run without
credentials. It is not production authentication.

## Provider boundary

An application-specific provider may implement `AuthProvider` for the web,
mobile, or another shell. Provider-specific sign-in UI, token storage, refresh
behavior, route configuration, and authorization policy remain outside the
core contract.

## Automatic discovery

When an application uses generated extension discovery, an extension may
declare one `serviceExports.auth` factory. With one discovered provider, the
catalog re-exports that factory as `discoveredAuthProviderFactory`. With no
provider, the catalog remains valid and the foundation's no-auth default is
available.

If several authentication extensions are present, the application must set
`SPARFRAME_AUTH_PROVIDER` to the selected extension id before running
`sparframe sync`, `start`, or `build`. Discovery fails clearly when the value
is missing or does not identify exactly one provider. The selection mechanism
is provider-neutral; Clerk, local development auth, and other implementations
remain extensions.
