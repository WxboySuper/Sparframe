import type { ExtensionContext, ExtensionRuntimeState } from '@sparframe/contracts';
import type { ExtensionRegistry } from './registry.ts';

export interface ExtensionRuntimeHandle {
  readonly ready: Promise<readonly ExtensionRuntimeState[]>;
  stop(): Promise<readonly ExtensionRuntimeState[]>;
}

/** Starts a registry and makes unmount cleanup wait for async activation. */
export function startExtensionRuntime(
  registry: ExtensionRegistry,
  context: ExtensionContext,
): ExtensionRuntimeHandle {
  const ready = registry.activateAll(context);
  let stopPromise: Promise<readonly ExtensionRuntimeState[]> | undefined;

  return {
    ready,
    stop() {
      stopPromise ??= ready.then(() => registry.deactivateAll(context));
      return stopPromise;
    },
  };
}
