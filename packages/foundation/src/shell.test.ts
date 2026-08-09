import assert from 'node:assert/strict';
import test from 'node:test';
import { createExtensionServices } from './services.ts';
import { startShellRuntime } from './shell.ts';
import { createExtensionRegistry } from './registry.ts';
import { composeShell, createShellNavigation } from './composition.ts';

const auth = {
  id: 'test-auth',
  getState: () => ({ status: 'signed-out' as const }),
  signIn: async () => undefined,
  signOut: async () => undefined,
  subscribe: () => () => undefined,
};

test('shell runtime composes, activates, and stops a complete extension pipeline', async () => {
  const events: string[] = [];
  const registry = createExtensionRegistry({
    extensions: [
      {
        manifest: {
          id: 'pipeline.test',
          name: 'Pipeline',
          version: '1.0.0',
          supportedShells: ['web'] as const,
          capabilities: [
            {
              id: 'workspace',
              name: 'Workspace',
              surfaces: [
                {
                  id: 'home',
                  kind: 'page' as const,
                  label: 'Workspace',
                  targets: [{ shell: 'web' as const, route: '/workspace' }],
                },
              ],
            },
          ],
        },
        activate: async ({ services }) => {
          events.push('activate');
          await services.notifications.notify({ title: 'Activated' });
        },
        deactivate: () => {
          events.push('deactivate');
        },
      },
    ],
  });
  const runtime = startShellRuntime(registry, 'web', {
    userId: 'pipeline-user',
    services: createExtensionServices({ auth }),
  });

  assert.equal(runtime.composition.status, 'ready');
  assert.equal((await runtime.ready).status, 'ready');
  assert.deepEqual(events, ['activate']);
  assert.equal(registry.getState('pipeline.test')?.status, 'active');
  await assert.rejects(runtime.invokeAction('pipeline.test:missing', 'payload'), /Unknown action/);
  assert.equal((await runtime.stop()).status, 'stopped');
  assert.deepEqual(events, ['activate', 'deactivate']);
  assert.equal(registry.getState('pipeline.test')?.status, 'inactive');
});

test('shell runtime activates only supported extensions and binds actions to its context', async () => {
  const calls: unknown[] = [];
  const registry = createExtensionRegistry({
    extensions: [
      {
        manifest: {
          id: 'web.test',
          name: 'Web',
          version: '1.0.0',
          supportedShells: ['web'] as const,
          capabilities: [
            {
              id: 'workspace',
              name: 'Workspace',
              surfaces: [
                {
                  id: 'home',
                  kind: 'page' as const,
                  label: 'Home',
                  targets: [{ shell: 'web' as const, route: '/home' }],
                },
              ],
            },
          ],
        },
        activate: ({ extensionId }) => {
          calls.push(extensionId);
        },
        contributions: [
          {
            id: 'record',
            surfaceId: 'web.test:workspace:home',
            kind: 'action' as const,
            shell: 'web' as const,
            implementation: {
              execute: ({ userId }: { userId: string }, input: unknown) =>
                `${userId}:${String(input)}`,
            },
          },
        ],
      },
      {
        manifest: {
          id: 'mobile.test',
          name: 'Mobile',
          version: '1.0.0',
          supportedShells: ['mobile'] as const,
        },
        activate: ({ extensionId }) => {
          calls.push(extensionId);
        },
      },
    ],
  });
  const runtime = startShellRuntime(registry, 'web', {
    userId: 'shell-user',
    services: createExtensionServices({ auth }),
  });

  await runtime.ready;
  assert.deepEqual(calls, ['web.test']);
  assert.equal(await runtime.invokeAction('web.test:record', 'input'), 'shell-user:input');
  await runtime.stop();
});

test('shell runtime exposes activation failures without hiding the error', async () => {
  const registry = createExtensionRegistry({
    extensions: [
      {
        manifest: {
          id: 'failing.test',
          name: 'Failing',
          version: '1.0.0',
          supportedShells: ['mobile'] as const,
        },
        activate: () => {
          throw new Error('activation failed');
        },
      },
    ],
  });
  const runtime = startShellRuntime(registry, 'mobile', {
    userId: 'pipeline-user',
    services: createExtensionServices({ auth }),
  });

  await assert.rejects(runtime.ready, /activation failed/);
  assert.equal(runtime.getState().status, 'failed');
  assert.equal(runtime.getState().error, 'activation failed');
});

test('shell navigation preserves configured labels, groups, routes, and pinned state', () => {
  const registry = createExtensionRegistry({
    extensions: [
      {
        manifest: {
          id: 'navigation.test',
          name: 'Navigation',
          version: '1.0.0',
          supportedShells: ['web'] as const,
          capabilities: [
            {
              id: 'workspace',
              name: 'Workspace',
              surfaces: [
                {
                  id: 'home',
                  kind: 'page' as const,
                  label: 'Home',
                  targets: [
                    {
                      shell: 'web' as const,
                      route: '#workspace',
                      navigation: {
                        label: 'Workspace',
                        group: 'Pinned',
                        pinned: true,
                        order: 10,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  });

  assert.deepEqual(createShellNavigation(composeShell(registry, 'web')), [
    {
      id: 'navigation.test:workspace:home',
      label: 'Workspace',
      route: '#workspace',
      group: 'Pinned',
      pinned: true,
      order: 10,
    },
  ]);
});
