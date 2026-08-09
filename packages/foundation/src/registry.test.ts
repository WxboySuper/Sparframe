import assert from 'node:assert/strict';
import test from 'node:test';
import { composeShell } from './composition.ts';
import { createExtensionRegistry, ExtensionRegistry } from './registry.ts';
import { createExtensionServices } from './services.ts';

const testServices = createExtensionServices({
  auth: {
    id: 'test-auth',
    getState: () => ({ status: 'signed-out' as const }),
    signIn: async () => undefined,
    signOut: async () => undefined,
    subscribe: () => () => undefined,
  },
});

test('creates an empty registry from empty host configuration', () => {
  const registry = createExtensionRegistry();

  assert.deepEqual(registry.list(), []);
});

test('registers configured extensions without shell-specific imports', () => {
  const extension = {
    manifest: {
      id: 'configured.example',
      name: 'Configured Example',
      version: '1.0.0',
      supportedShells: ['web'] as const,
    },
  };

  const registry = createExtensionRegistry({ extensions: [extension] });

  assert.deepEqual(registry.list(), [extension]);
});

test('registers and lists extensions', () => {
  const registry = new ExtensionRegistry();
  const extension = {
    manifest: {
      id: 'example.test',
      name: 'Example',
      version: '0.1.0',
      supportedShells: ['web'] as const,
    },
  };

  registry.register(extension);

  assert.equal(registry.get('example.test'), extension);
  assert.deepEqual(registry.list(), [extension]);
});

test('inspects registered extensions without exposing extension instances', async () => {
  const activate = () => undefined;
  const registry = new ExtensionRegistry();
  registry.register({
    manifest: {
      id: 'inspected.test',
      name: 'Inspected',
      version: '1.2.3',
      supportedShells: ['web', 'mobile'],
      dependencies: [{ id: 'optional.test', optional: true }],
      capabilities: [
        {
          id: 'workspace',
          name: 'Workspace',
          surfaces: [
            {
              id: 'overview',
              kind: 'page',
              label: 'Overview',
              targets: [{ shell: 'web', route: '/overview' }],
            },
          ],
        },
      ],
    },
    activate,
  });

  const snapshot = registry.inspect();

  assert.deepEqual(snapshot, {
    extensions: [
      {
        id: 'inspected.test',
        name: 'Inspected',
        version: '1.2.3',
        supportedShells: ['web', 'mobile'],
        dependencies: [{ id: 'optional.test', optional: true }],
        capabilities: [
          {
            id: 'workspace',
            name: 'Workspace',
            surfaces: [
              {
                id: 'overview',
                kind: 'page',
                label: 'Overview',
                targets: [{ shell: 'web', route: '/overview' }],
              },
            ],
          },
        ],
        runtime: { extensionId: 'inspected.test', status: 'registered' },
      },
    ],
  });
  assert.notEqual(snapshot.extensions[0], registry.get('inspected.test'));

  await registry.activateAll({ userId: 'test-user', services: testServices });
  assert.equal(registry.inspect().extensions[0]?.runtime.status, 'active');
  assert.equal(registry.inspect().extensions[0]?.runtime.extensionId, 'inspected.test');
});

test('rejects duplicate extension identifiers', () => {
  const registry = new ExtensionRegistry();
  const extension = {
    manifest: {
      id: 'example.test',
      name: 'Example',
      version: '0.1.0',
      supportedShells: ['web'] as const,
    },
  };

  registry.register(extension);

  assert.throws(() => registry.register(extension), /already registered/);
});

test('activates and deactivates extensions in lifecycle order', async () => {
  const registry = new ExtensionRegistry();
  const lifecycle: string[] = [];

  registry.register({
    manifest: {
      id: 'first.test',
      name: 'First',
      version: '0.1.0',
      supportedShells: ['web'],
    },
    activate: () => {
      lifecycle.push('first:activate');
    },
    deactivate: () => {
      lifecycle.push('first:deactivate');
    },
  });
  registry.register({
    manifest: {
      id: 'second.test',
      name: 'Second',
      version: '0.1.0',
      supportedShells: ['mobile'],
    },
    activate: () => {
      lifecycle.push('second:activate');
    },
    deactivate: () => {
      lifecycle.push('second:deactivate');
    },
  });

  await registry.activateAll({ userId: 'test-user', services: testServices });
  await registry.deactivateAll({ userId: 'test-user', services: testServices });

  assert.deepEqual(lifecycle, [
    'first:activate',
    'second:activate',
    'second:deactivate',
    'first:deactivate',
  ]);
});

test('activates dependencies before their dependents and exposes runtime state', async () => {
  const registry = new ExtensionRegistry();
  const lifecycle: string[] = [];

  registry.register({
    manifest: {
      id: 'dependent.test',
      name: 'Dependent',
      version: '0.1.0',
      supportedShells: ['web'],
      dependencies: [{ id: 'dependency.test' }],
    },
    activate: (context) => {
      lifecycle.push(`${context.extensionId}:activate`);
    },
  });
  registry.register({
    manifest: {
      id: 'dependency.test',
      name: 'Dependency',
      version: '0.1.0',
      supportedShells: ['web'],
    },
    activate: (context) => {
      lifecycle.push(`${context.extensionId}:activate`);
    },
  });

  const states = await registry.activateAll({ userId: 'test-user', services: testServices });

  assert.deepEqual(lifecycle, ['dependency.test:activate', 'dependent.test:activate']);
  assert.equal(registry.getState('dependent.test')?.status, 'active');
  assert.deepEqual(
    states.map(({ extensionId, status }) => ({ extensionId, status })),
    [
      { extensionId: 'dependent.test', status: 'active' },
      { extensionId: 'dependency.test', status: 'active' },
    ],
  );
});

test('rejects missing required and circular dependencies during activation', async () => {
  const missing = new ExtensionRegistry();
  missing.register({
    manifest: {
      id: 'missing-dependent.test',
      name: 'Missing dependent',
      version: '0.1.0',
      supportedShells: ['web'],
      dependencies: [{ id: 'not-registered.test' }],
    },
  });

  await assert.rejects(
    missing.activateAll({ userId: 'test-user', services: testServices }),
    /Missing required extension dependency: not-registered.test/,
  );

  const circular = new ExtensionRegistry();
  const extension = (id: string, dependency: string) => ({
    manifest: {
      id,
      name: id,
      version: '0.1.0',
      supportedShells: ['web'] as const,
      dependencies: [{ id: dependency }],
    },
  });
  circular.register(extension('first.test', 'second.test'));
  circular.register(extension('second.test', 'first.test'));

  await assert.rejects(
    circular.activateAll({ userId: 'test-user', services: testServices }),
    /Circular extension dependency/,
  );
});

test('allows absent optional dependencies', async () => {
  const registry = new ExtensionRegistry();
  registry.register({
    manifest: {
      id: 'optional-dependent.test',
      name: 'Optional dependent',
      version: '0.1.0',
      supportedShells: ['web'],
      dependencies: [{ id: 'optional.test', optional: true }],
    },
  });

  await registry.activateAll({ userId: 'test-user', services: testServices });

  assert.equal(registry.getState('optional-dependent.test')?.status, 'active');
});

test('continues deactivation after failure and reports extension identity', async () => {
  const registry = new ExtensionRegistry();
  const lifecycle: string[] = [];

  registry.register({
    manifest: {
      id: 'first.test',
      name: 'First',
      version: '0.1.0',
      supportedShells: ['web'],
    },
    activate: () => undefined,
    deactivate: (context) => {
      lifecycle.push(`${context.extensionId}:deactivate`);
      throw new Error('cleanup failed');
    },
  });
  registry.register({
    manifest: {
      id: 'second.test',
      name: 'Second',
      version: '0.1.0',
      supportedShells: ['web'],
    },
    activate: () => undefined,
    deactivate: (context) => {
      lifecycle.push(`${context.extensionId}:deactivate`);
    },
  });

  await registry.activateAll({ userId: 'test-user', services: testServices });
  await assert.rejects(
    () => registry.deactivateAll({ userId: 'test-user', services: testServices }),
    /cleanup failed/,
  );

  assert.deepEqual(lifecycle, ['second.test:deactivate', 'first.test:deactivate']);
  assert.equal(registry.getState('first.test')?.status, 'failed');
  assert.equal(registry.getState('second.test')?.status, 'inactive');
});

test('discovers shell-specific surfaces without importing shell UI', () => {
  const registry = new ExtensionRegistry();

  registry.register({
    manifest: {
      id: 'calendar.test',
      name: 'Calendar',
      version: '0.1.0',
      supportedShells: ['web', 'mobile'],
      capabilities: [
        {
          id: 'schedule',
          name: 'Schedule',
          surfaces: [
            {
              id: 'overview',
              kind: 'page',
              label: 'Schedule',
              targets: [
                { shell: 'web', route: '/schedule' },
                { shell: 'mobile', route: '/schedule', navigation: { label: 'Schedule' } },
              ],
            },
            {
              id: 'quick-add',
              kind: 'action',
              label: 'Quick add',
              targets: [{ shell: 'mobile' }],
            },
          ],
        },
      ],
    },
  });

  assert.deepEqual(
    registry.discoverSurfaces('web').map(({ id, target }) => ({ id, target })),
    [
      {
        id: 'calendar.test:schedule:overview',
        target: { shell: 'web', route: '/schedule' },
      },
    ],
  );
  assert.deepEqual(
    registry.discoverSurfaces('mobile').map(({ id }) => id),
    ['calendar.test:schedule:overview', 'calendar.test:schedule:quick-add'],
  );
});

test('discovers opaque shell contributions without interpreting their implementations', () => {
  const webImplementation = { component: 'web-component' };
  const mobileImplementation = { component: 'mobile-component' };
  const registry = new ExtensionRegistry();

  registry.register({
    manifest: {
      id: 'contributions.test',
      name: 'Contributions',
      version: '0.1.0',
      supportedShells: ['web', 'mobile'],
      capabilities: [
        {
          id: 'workspace',
          name: 'Workspace',
          surfaces: [
            {
              id: 'overview',
              kind: 'page',
              label: 'Overview',
              targets: [{ shell: 'web' }, { shell: 'mobile' }],
            },
          ],
        },
      ],
    },
    contributions: [
      {
        id: 'overview-web',
        surfaceId: 'contributions.test:workspace:overview',
        kind: 'page',
        shell: 'web',
        implementation: webImplementation,
      },
      {
        id: 'overview-mobile',
        surfaceId: 'contributions.test:workspace:overview',
        kind: 'page',
        shell: 'mobile',
        implementation: mobileImplementation,
      },
    ],
  });

  assert.deepEqual(registry.discoverContributions('web'), [
    {
      id: 'contributions.test:overview-web',
      extensionId: 'contributions.test',
      surfaceId: 'contributions.test:workspace:overview',
      kind: 'page',
      shell: 'web',
      implementation: webImplementation,
    },
  ]);
  assert.deepEqual(registry.discoverContributions('mobile'), [
    {
      id: 'contributions.test:overview-mobile',
      extensionId: 'contributions.test',
      surfaceId: 'contributions.test:workspace:overview',
      kind: 'page',
      shell: 'mobile',
      implementation: mobileImplementation,
    },
  ]);
});

test('applies visibility and configured ordering during discovery', () => {
  const registry = new ExtensionRegistry();

  registry.register({
    manifest: {
      id: 'example.test',
      name: 'Example',
      version: '0.1.0',
      supportedShells: ['web'],
      capabilities: [
        {
          id: 'workspace',
          name: 'Workspace',
          surfaces: [
            {
              id: 'second',
              kind: 'panel',
              label: 'Second',
              targets: [{ shell: 'web', navigation: { label: 'Second', order: 10 } }],
            },
            {
              id: 'first',
              kind: 'panel',
              label: 'First',
              targets: [{ shell: 'web', navigation: { label: 'First', order: 20 } }],
            },
            {
              id: 'hidden',
              kind: 'panel',
              label: 'Hidden',
              targets: [{ shell: 'web' }],
            },
          ],
        },
      ],
    },
  });

  assert.deepEqual(
    registry
      .discoverSurfaces('web', {
        hidden: ['example.test:workspace:hidden'],
        order: ['example.test:workspace:first', 'example.test:workspace:second'],
      })
      .map(({ id }) => id),
    ['example.test:workspace:first', 'example.test:workspace:second'],
  );
});

test('applies configurable pinned and grouped navigation metadata', () => {
  const registry = new ExtensionRegistry();
  registry.register({
    manifest: {
      id: 'navigation.test',
      name: 'Navigation',
      version: '1.0.0',
      supportedShells: ['web'],
      capabilities: [
        {
          id: 'workspace',
          name: 'Workspace',
          surfaces: [
            {
              id: 'normal',
              kind: 'page',
              label: 'Normal',
              targets: [{ shell: 'web', navigation: { label: 'Normal' } }],
            },
            {
              id: 'pinned',
              kind: 'page',
              label: 'Pinned',
              targets: [{ shell: 'web', navigation: { label: 'Pinned' } }],
            },
          ],
        },
      ],
    },
  });

  const surfaces = registry.discoverSurfaces('web', {
    pinned: ['navigation.test:workspace:pinned'],
    groups: [{ surfaceId: 'navigation.test:workspace:pinned', group: 'Core' }],
  });
  assert.deepEqual(
    surfaces.map(({ id }) => id),
    ['navigation.test:workspace:pinned', 'navigation.test:workspace:normal'],
  );
  assert.deepEqual(surfaces[0]?.target.navigation, {
    label: 'Pinned',
    group: 'Core',
    pinned: true,
  });
});

test('composes a ready shell from discovered surfaces', () => {
  const registry = new ExtensionRegistry();
  registry.register({
    manifest: {
      id: 'example.test',
      name: 'Example',
      version: '0.1.0',
      supportedShells: ['web'],
      capabilities: [
        {
          id: 'workspace',
          name: 'Workspace',
          surfaces: [
            {
              id: 'overview',
              kind: 'page',
              label: 'Overview',
              targets: [{ shell: 'web', route: '/overview' }],
            },
          ],
        },
      ],
    },
  });

  const composition = composeShell(registry, 'web');

  assert.equal(composition.status, 'ready');
  assert.deepEqual(
    composition.surfaces.map(({ id }) => id),
    ['example.test:workspace:overview'],
  );
  assert.deepEqual(composition.unsupportedSurfaceIds, []);
});

test('distinguishes empty and unsupported shell composition', () => {
  const registry = new ExtensionRegistry();

  assert.equal(composeShell(registry, 'mobile').status, 'empty');
  assert.equal(
    composeShell(registry, 'mobile', { requested: ['calendar:schedule:overview'] }).status,
    'unsupported',
  );
  assert.deepEqual(
    composeShell(registry, 'mobile', { requested: ['calendar:schedule:overview'] })
      .unsupportedSurfaceIds,
    ['calendar:schedule:overview'],
  );
});

test('invokes an extension-owned action through the registry', async () => {
  const received: unknown[] = [];
  const registry = new ExtensionRegistry();
  registry.register({
    manifest: {
      id: 'actions.test',
      name: 'Actions',
      version: '0.1.0',
      supportedShells: ['web'],
      capabilities: [
        {
          id: 'tools',
          name: 'Tools',
          surfaces: [
            {
              id: 'run',
              kind: 'action',
              label: 'Run',
              targets: [{ shell: 'web' }],
            },
          ],
        },
      ],
    },
    contributions: [
      {
        id: 'run-web',
        surfaceId: 'actions.test:tools:run',
        kind: 'action',
        shell: 'web',
        implementation: {
          execute: async (context: unknown, input: unknown) => {
            received.push(context, input);
            return 'done';
          },
        },
      },
    ],
  });

  const context = { userId: 'test-user', services: testServices };
  assert.equal(await registry.invokeAction('actions.test:run-web', context, 'payload'), 'done');
  assert.deepEqual(received, [context, 'payload']);
});

test('rejects non-executable and unknown actions', async () => {
  const registry = new ExtensionRegistry();
  registry.register({
    manifest: {
      id: 'invalid-action.test',
      name: 'Invalid Action',
      version: '0.1.0',
      supportedShells: ['web'],
    },
    contributions: [
      {
        id: 'invalid',
        surfaceId: 'missing',
        kind: 'action',
        shell: 'web',
        implementation: {},
      },
    ],
  });
  await assert.rejects(
    () =>
      registry.invokeAction('invalid-action.test:invalid', {
        userId: 'test-user',
        services: testServices,
      }),
    /Action has no executable implementation/,
  );
  await assert.rejects(
    () => registry.invokeAction('missing:action', { userId: 'test-user', services: testServices }),
    /Unknown action contribution/,
  );
});
