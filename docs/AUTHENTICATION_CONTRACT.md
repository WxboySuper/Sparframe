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
