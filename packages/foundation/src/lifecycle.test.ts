import assert from 'node:assert/strict';
import test from 'node:test';
import { createExtensionRegistry } from './registry.ts';
import { startExtensionRuntime } from './lifecycle.ts';
import { createExtensionServices } from './services.ts';

const services = createExtensionServices({
  auth: {
    id: 'test-auth',
    getState: () => ({ status: 'signed-out' as const }),
    signIn: async () => undefined,
    signOut: async () => undefined,
    subscribe: () => () => undefined,
  },
});

test('runtime cleanup waits for activation before deactivating', async () => {
  const lifecycle: string[] = [];
  let resolveActivation!: () => void;
  const activation = new Promise<void>((resolve) => {
    resolveActivation = resolve;
  });
  const registry = createExtensionRegistry({
    extensions: [
      {
        manifest: {
          id: 'runtime-test',
          name: 'Runtime test',
          version: '0.1.0',
          supportedShells: ['web'],
        },
        async activate() {
          await activation;
          lifecycle.push('activate');
        },
        deactivate() {
          lifecycle.push('deactivate');
        },
      },
    ],
  });
  const runtime = startExtensionRuntime(registry, { userId: 'test-user', services });
  const stopped = runtime.stop();
  await Promise.resolve();
  assert.deepEqual(lifecycle, []);

  resolveActivation();
  await stopped;
  assert.deepEqual(lifecycle, ['activate', 'deactivate']);
});
