# Extension inspection

`ExtensionRegistry.inspect()` provides a read-only, provider-neutral snapshot
of the extensions registered by the host. It is intended for developer tools,
diagnostics, tests, and future agent workflows.

The snapshot includes each extension's identity, supported shells, declared
dependencies, capabilities and surfaces, and current lifecycle state. It does
not expose extension instances, lifecycle callbacks, provider clients, user
data, or network/database state.

```ts
const snapshot = registry.inspect();

for (const extension of snapshot.extensions) {
  console.log(extension.id, extension.runtime.status);
}
```

The result is detached from the registry. Consumers must treat it as a point-in-
time view and call `inspect()` again after registration or lifecycle changes.
The foundation does not prescribe how a shell displays the snapshot.
