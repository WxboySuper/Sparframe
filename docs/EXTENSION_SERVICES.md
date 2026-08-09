# Extension services

Issue #44 establishes the provider-neutral services available to every
extension lifecycle callback. The registry passes one shared bundle through
`ExtensionContext`:

```ts
export interface ExtensionServices {
  auth: AuthProvider;
  persistence: PersistenceAdapter;
  synchronization: SyncAdapter;
  notifications: NotificationAdapter;
}
```

An extension can use these boundaries without importing a vendor auth SDK, a database SDK,
or a synchronization provider:

```ts
export const extension: SparframeExtension = {
  manifest,
  async activate({ services }) {
    const current = await services.persistence.read({
      namespace: 'example-capability',
      key: 'state',
    });
    // Extension-owned behavior uses the shared provider boundary here.
    void current;
  },
};
```

The web and mobile shells create the bundle at their composition boundary,
activate the discovered registry when the app mounts, and deactivate it when
the app unmounts. They currently use the deterministic local auth provider and
in-memory persistence, synchronization, and notification adapters. Those
adapters are development defaults only: they do not persist across reloads,
make network calls, schedule OS notifications, or represent production
provider behavior.

The host owns provider selection. Extensions own their domain behavior and
must not assume a specific authentication, storage, or synchronization
provider. Replacing a provider changes the service bundle, not extension
lifecycle contracts.

Surface implementations and shell rendering remain the responsibility of the
host shell. The foundation only supplies the provider-neutral service boundary
and lifecycle; vendor auth, durable storage, sync, and native notification providers
can be added without changing extension contracts.
