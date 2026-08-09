export type ShellId = 'web' | 'mobile';

export type ShellCompositionStatus = 'loading' | 'ready' | 'empty' | 'unsupported';

export type SurfaceKind = 'page' | 'panel' | 'action';

export interface SurfaceNavigation {
  readonly label: string;
  readonly order?: number;
  readonly group?: string;
  readonly pinned?: boolean;
}

export interface SurfaceTarget {
  readonly shell: ShellId;
  readonly route?: string;
  readonly navigation?: SurfaceNavigation;
}

export interface SurfaceDeclaration {
  readonly id: string;
  readonly kind: SurfaceKind;
  readonly label: string;
  readonly targets: readonly SurfaceTarget[];
}

/** A contribution that supplies the implementation behind one declared surface. */
export interface ExtensionContribution<TImplementation = unknown> {
  readonly id: string;
  readonly surfaceId: string;
  readonly kind: SurfaceKind;
  readonly shell: ShellId;
  /** Opaque to the provider-neutral foundation; interpreted by the shell adapter. */
  readonly implementation: TImplementation;
}

/** Context supplied by a shell adapter when it invokes a contribution. */
export interface ContributionContext {
  readonly extensionId: string;
  readonly contributionId: string;
  readonly surfaceId: string;
  readonly shell: ShellId;
  readonly invoke?: (input?: PersistableValue) => Promise<unknown>;
}

/** Provider-neutral request received by an extension-owned server route. */
export interface ExtensionServerRequest {
  readonly method: string;
  readonly path: string;
  readonly query: Readonly<Record<string, string | undefined>>;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly body?: string;
}

/** Provider-neutral response returned by an extension-owned server route. */
export interface ExtensionServerResponse {
  readonly status?: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
}

export interface ExtensionServerContext {
  readonly userId: string;
  readonly services: ExtensionServices;
}

export interface ExtensionServerRoute {
  readonly method: string;
  readonly path: string;
  readonly handle: (
    request: ExtensionServerRequest,
    context: ExtensionServerContext,
  ) => ExtensionServerResponse | Promise<ExtensionServerResponse>;
}

/** Server capabilities are mounted by a host application without vendor imports. */
export interface ExtensionServerContribution {
  readonly routes: readonly ExtensionServerRoute[];
}

export interface ExtensionActionImplementation {
  readonly execute: (
    context: ExtensionContext,
    input?: PersistableValue,
  ) => unknown | Promise<unknown>;
}

export interface CapabilityManifest {
  readonly id: string;
  readonly name: string;
  readonly surfaces?: readonly SurfaceDeclaration[];
}

export interface ExtensionDependency {
  /** Identifier of another registered extension. */
  readonly id: string;
  /** Optional dependencies do not prevent activation when absent. */
  readonly optional?: boolean;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  supportedShells: readonly ShellId[];
  readonly capabilities?: readonly CapabilityManifest[];
  readonly dependencies?: readonly ExtensionDependency[];
}

export interface ExtensionContext {
  readonly userId: string;
  /** Identifier of the extension currently receiving the lifecycle callback. */
  readonly extensionId?: string;
  /** Provider-neutral services available to the active extension. */
  readonly services: ExtensionServices;
}

export type ExtensionLifecycleStatus =
  'registered' | 'activating' | 'active' | 'deactivating' | 'inactive' | 'failed';

export interface ExtensionRuntimeState {
  readonly extensionId: string;
  readonly status: ExtensionLifecycleStatus;
  readonly error?: string;
}

/** Read-only, provider-neutral view of one registered extension. */
export interface ExtensionInspectionEntry {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly supportedShells: readonly ShellId[];
  readonly dependencies: readonly ExtensionDependency[];
  readonly capabilities: readonly CapabilityManifest[];
  readonly runtime: ExtensionRuntimeState;
}

/** Stable registry view for diagnostics and developer tooling. */
export interface ExtensionInspectionSnapshot {
  readonly extensions: readonly ExtensionInspectionEntry[];
}

export interface AuthIdentity {
  readonly id: string;
  readonly displayName?: string;
  readonly email?: string;
}

export interface AuthSession {
  readonly identity: AuthIdentity;
  readonly expiresAt?: string;
}

export type AuthState =
  | { readonly status: 'loading'; readonly session?: undefined }
  | { readonly status: 'signed-out'; readonly session?: undefined }
  | { readonly status: 'signed-in'; readonly session: AuthSession };

export interface AuthProvider {
  readonly id: string;
  getState(): AuthState | Promise<AuthState>;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  subscribe(listener: (state: AuthState) => void): () => void;
}

/** Shared provider boundaries exposed to extensions during their lifecycle. */
export interface ExtensionServices {
  readonly auth: AuthProvider;
  readonly persistence: PersistenceAdapter;
  readonly synchronization: SyncAdapter;
  readonly notifications: NotificationAdapter;
}

export interface NotificationRequest {
  readonly id?: string;
  readonly title: string;
  readonly body?: string;
  readonly scheduledFor?: string;
  readonly data?: PersistableValue;
}

export interface NotificationAdapter {
  notify(request: NotificationRequest): Promise<{ readonly id: string }>;
  cancel(id: string): Promise<void>;
}

/** Values that may cross a persistence or synchronization boundary. */
export type PersistableValue =
  | null
  | boolean
  | number
  | string
  | readonly PersistableValue[]
  | { readonly [key: string]: PersistableValue };

/** Provider-neutral address for an extension-owned record. */
export interface DataAddress {
  readonly namespace: string;
  readonly key: string;
}

export interface StoredRecord<T = PersistableValue> {
  readonly address: DataAddress;
  readonly value: T;
  /** Opaque provider-issued revision used for optimistic concurrency. */
  readonly revision: string;
  readonly updatedAt: string;
}

export interface WriteRecordRequest<T = PersistableValue> {
  readonly address: DataAddress;
  readonly value: T;
  /** Omit when creating or unconditionally replacing a record. */
  readonly expectedRevision?: string;
}

export interface RemoveRecordRequest {
  readonly address: DataAddress;
  readonly expectedRevision?: string;
}

/** Durable storage for extension-owned records; it does not define domain models. */
export interface PersistenceAdapter {
  read<T extends PersistableValue = PersistableValue>(
    address: DataAddress,
  ): Promise<StoredRecord<T> | undefined>;
  write<T extends PersistableValue>(request: WriteRecordRequest<T>): Promise<StoredRecord<T>>;
  remove(request: RemoveRecordRequest): Promise<void>;
}

export type SyncOperation = 'upsert' | 'remove';

export interface SyncChange<T = PersistableValue> {
  readonly operation: SyncOperation;
  readonly record: StoredRecord<T>;
}

export interface SyncCursor {
  /** Opaque position supplied back to the same synchronization adapter. */
  readonly token?: string;
}

export interface PullChangesRequest {
  readonly cursor?: SyncCursor;
}

export interface PullChangesResult<T = PersistableValue> {
  readonly changes: readonly SyncChange<T>[];
  readonly cursor?: SyncCursor;
  readonly hasMore: boolean;
}

export interface SyncConflict<T = PersistableValue> {
  readonly change: SyncChange<T>;
  readonly reason: 'conflict' | 'rejected';
  readonly current?: StoredRecord<T>;
}

export interface PushChangesRequest<T = PersistableValue> {
  readonly changes: readonly SyncChange<T>[];
}

export interface PushChangesResult<T = PersistableValue> {
  readonly accepted: readonly SyncChange<T>[];
  readonly conflicts: readonly SyncConflict<T>[];
}

/** Synchronization transport kept separate from local persistence and auth. */
export interface SyncAdapter<T = PersistableValue> {
  pull(request: PullChangesRequest): Promise<PullChangesResult<T>>;
  push(request: PushChangesRequest<T>): Promise<PushChangesResult<T>>;
}

export interface SparframeExtension {
  readonly manifest: ExtensionManifest;
  /** Optional shell-owned implementations for the manifest's declared surfaces. */
  readonly contributions?: readonly ExtensionContribution[];
  activate?(context: ExtensionContext): void | Promise<void>;
  deactivate?(context: ExtensionContext): void | Promise<void>;
}
