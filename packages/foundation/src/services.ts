import type {
  AuthProvider,
  AuthState,
  DataAddress,
  ExtensionServices,
  NotificationAdapter,
  NotificationRequest,
  PersistableValue,
  PersistenceAdapter,
  PullChangesRequest,
  PullChangesResult,
  PushChangesRequest,
  PushChangesResult,
  RemoveRecordRequest,
  StoredRecord,
  SyncAdapter,
  SyncChange,
  WriteRecordRequest,
} from '@sparframe/contracts';

export interface ExtensionServiceOptions {
  readonly auth?: AuthProvider;
  readonly persistence?: PersistenceAdapter;
  readonly synchronization?: SyncAdapter;
  readonly notifications?: NotificationAdapter;
}

/** Creates the provider-neutral service bundle passed to extension lifecycles. */
export function createExtensionServices(options: ExtensionServiceOptions = {}): ExtensionServices {
  return {
    auth: options.auth ?? createNoAuthProvider(),
    persistence: options.persistence ?? createMemoryPersistenceAdapter(),
    synchronization: options.synchronization ?? createMemorySyncAdapter(),
    notifications: options.notifications ?? createMemoryNotificationAdapter(),
  };
}

/**
 * Default shell service for an application that has not selected an auth
 * provider yet. It keeps the core starter runnable without pretending to be a
 * production identity system.
 */
export function createNoAuthProvider(): AuthProvider {
  const state: AuthState = { status: 'signed-out' };
  return {
    id: 'none',
    getState: () => state,
    async signIn() {
      throw new Error('No authentication provider is configured for this application.');
    },
    async signOut() {},
    subscribe() {
      return () => undefined;
    },
  };
}

export interface MemoryNotificationAdapter extends NotificationAdapter {
  readonly requests: readonly (NotificationRequest & { readonly id: string })[];
}

/** Deterministic notification sink for development and integration tests. */
export function createMemoryNotificationAdapter(): MemoryNotificationAdapter {
  const requests = new Map<string, NotificationRequest & { readonly id: string }>();
  let sequence = 0;
  return {
    get requests() {
      return [...requests.values()];
    },
    async notify(request) {
      const id = request.id ?? `notification-${++sequence}`;
      requests.set(id, { ...request, id });
      return { id };
    },
    async cancel(id) {
      requests.delete(id);
    },
  };
}

export interface MemoryPersistenceAdapter extends PersistenceAdapter {
  clear(): void;
}

/**
 * Deterministic in-memory storage for local development and tests.
 *
 * This adapter is intentionally process-local. It is not a production
 * database, does not persist across reloads, and does not perform I/O.
 */
export function createMemoryPersistenceAdapter(): MemoryPersistenceAdapter {
  const records = new Map<string, StoredRecord>();
  let revision = 0;

  const addressKey = (address: DataAddress) => `${address.namespace}:${address.key}`;
  const nextRevision = () => String(++revision);

  return {
    async read<T extends PersistableValue = PersistableValue>(address: DataAddress) {
      return records.get(addressKey(address)) as StoredRecord<T> | undefined;
    },
    async write<T extends PersistableValue>(request: WriteRecordRequest<T>) {
      const key = addressKey(request.address);
      const current = records.get(key);
      if (
        request.expectedRevision !== undefined &&
        current?.revision !== request.expectedRevision
      ) {
        throw new Error(`Persistence revision conflict: ${key}`);
      }

      const record: StoredRecord<T> = {
        address: request.address,
        value: request.value,
        revision: nextRevision(),
        updatedAt: `local-${revision}`,
      };
      records.set(key, record);
      return record;
    },
    async remove(request: RemoveRecordRequest) {
      const key = addressKey(request.address);
      const current = records.get(key);
      if (
        request.expectedRevision !== undefined &&
        current?.revision !== request.expectedRevision
      ) {
        throw new Error(`Persistence revision conflict: ${key}`);
      }
      records.delete(key);
    },
    clear() {
      records.clear();
    },
  };
}

/**
 * Deterministic in-memory synchronization transport for local development.
 * Pushed changes become available to a later pull in insertion order.
 */
export function createMemorySyncAdapter<T = PersistableValue>(): SyncAdapter<T> {
  const changes: SyncChange<T>[] = [];

  return {
    async pull(request: PullChangesRequest): Promise<PullChangesResult<T>> {
      const start = Number(request.cursor?.token ?? '0');
      const next = changes.slice(start);
      return {
        changes: next,
        cursor: { token: String(changes.length) },
        hasMore: false,
      };
    },
    async push(request: PushChangesRequest<T>): Promise<PushChangesResult<T>> {
      changes.push(...request.changes);
      return { accepted: request.changes, conflicts: [] };
    },
  };
}
