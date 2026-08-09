import type { ExtensionContext, PersistableValue, ShellId } from '@sparframe/contracts';
import {
  composeShell,
  type ShellCompositionOptions,
  type ShellCompositionResult,
} from './composition.ts';
import { ExtensionRegistry } from './registry.ts';

export type ShellRuntimeStatus = 'starting' | 'ready' | 'failed' | 'stopped';

export interface ShellRuntimeState {
  readonly shell: ShellId;
  readonly status: ShellRuntimeStatus;
  readonly error?: string;
}

export interface ShellRuntimeHandle {
  readonly composition: ShellCompositionResult;
  readonly ready: Promise<ShellRuntimeState>;
  readonly getState: () => ShellRuntimeState;
  invokeAction(contributionId: string, input?: PersistableValue): Promise<unknown>;
  stop(): Promise<ShellRuntimeState>;
}

/**
 * Shared shell bootstrap: compose visible surfaces, activate extensions, and
 * expose a single observable lifecycle for web and mobile hosts.
 */
export function startShellRuntime(
  registry: ExtensionRegistry,
  shell: ShellId,
  context: ExtensionContext,
  options: ShellCompositionOptions = {},
): ShellRuntimeHandle {
  const composition = composeShell(registry, shell, options);
  let state: ShellRuntimeState = { shell, status: 'starting' };
  let stopped = false;

  const ready = registry
    .activateAll(context, shell)
    .then(() => {
      if (!stopped) state = { shell, status: 'ready' };
      return state;
    })
    .catch((error: unknown) => {
      state = {
        shell,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
      throw error;
    });

  return {
    composition,
    ready,
    getState: () => state,
    async invokeAction(contributionId, input) {
      await ready;
      return registry.invokeAction(contributionId, context, input);
    },
    async stop() {
      stopped = true;
      await ready.catch(() => undefined);
      await registry.deactivateAll(context);
      state = { shell, status: 'stopped' };
      return state;
    },
  };
}
