export {
  createExtensionRegistry,
  ExtensionRegistry,
  type DiscoveredContribution,
  type DiscoveredSurface,
  type ExtensionRegistrationConfig,
  type SurfaceDiscoveryOptions,
} from './registry.ts';
export {
  createExtensionServices,
  createNoAuthProvider,
  createMemoryPersistenceAdapter,
  createMemoryNotificationAdapter,
  createMemorySyncAdapter,
  type ExtensionServiceOptions,
  type MemoryPersistenceAdapter,
  type MemoryNotificationAdapter,
} from './services.ts';
export { startExtensionRuntime, type ExtensionRuntimeHandle } from './lifecycle.ts';
export {
  startShellRuntime,
  type ShellRuntimeHandle,
  type ShellRuntimeState,
  type ShellRuntimeStatus,
} from './shell.ts';
export type { ExtensionInspectionEntry, ExtensionInspectionSnapshot } from '@sparframe/contracts';
export {
  composeShell,
  createShellNavigation,
  type ShellCompositionOptions,
  type ShellCompositionResult,
  type ShellNavigationItem,
} from './composition.ts';
