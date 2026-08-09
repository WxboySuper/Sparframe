# Persistence and synchronization boundary

**Status:** Base contract established; provider implementations intentionally
deferred

Sparframe extensions own their domain models. The shared foundation only
provides a portable way to address, persist, and synchronize those models. An
extension can add fields or a new record shape without changing a universal
foundation schema.

## Two separate responsibilities

`PersistenceAdapter` is durable record storage. It reads, writes, and removes
records addressed by an extension namespace and key. `SyncAdapter` is a change
transport between a shell's local state and another copy of the same logical
state. Neither interface assumes a database, API, network protocol, or vendor.

The separation matters because a shell may be offline, a provider may be
replaced, and local persistence may have different performance or availability
characteristics from synchronization. A provider extension can compose the two
without making every extension depend on its implementation details.

## Contract rules

- `DataAddress.namespace` belongs to the extension; keys are not global domain
  assumptions owned by the foundation.
- Record values are `PersistableValue`, a JSON-like portable value tree. Rich
  domain types such as `Date`, class instances, and provider objects must be
  serialized by the extension at its boundary.
- `revision` and `expectedRevision` support optimistic concurrency without
  prescribing a revision format or conflict-resolution policy.
- Sync cursors are opaque to the foundation and must be returned only to the
  adapter that issued them.
- Sync changes carry complete stored records. The contract does not prescribe
  event sourcing, partial patches, merge algorithms, or conflict winners.
- Authentication and user identity are outside these interfaces. An adapter is
  configured or scoped by its host environment; it does not receive an auth
  session or import an auth SDK through the base contract.

## Extension usage

An extension should define its own typed record values and namespace, then use
the shared interfaces through an injected service. The web and mobile shells
consume the same logical records, while each shell may choose its own caching,
retry, lifecycle, and presentation behavior.

The foundation provides deterministic in-memory adapters for development and
tests. They are not durable storage. A future local-storage, database, hosted
API, or development adapter belongs in a platform-service or provider
extension and must satisfy these contracts with its own tests.

## Deliberate non-goals

This contract does not define a database schema, network API, auth-to-user
mapping, migration engine, conflict UI, background sync scheduler, or any
application domain model.
