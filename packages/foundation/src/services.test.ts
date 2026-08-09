import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createExtensionServices,
  createMemoryNotificationAdapter,
  createMemoryPersistenceAdapter,
  createMemorySyncAdapter,
  createNoAuthProvider,
} from './services.ts';

test('core services provide an explicit no-auth default', async () => {
  const auth = createNoAuthProvider();
  assert.equal(auth.id, 'none');
  assert.deepEqual(await auth.getState(), { status: 'signed-out' });
  await assert.rejects(() => auth.signIn(), /No authentication provider/);
  assert.equal(createExtensionServices().auth.id, 'none');
});

test('memory persistence is deterministic and enforces revisions', async () => {
  const persistence = createMemoryPersistenceAdapter();
  const address = { namespace: 'example', key: 'note' };
  const first = await persistence.write({ address, value: { text: 'first' } });

  assert.equal(first.revision, '1');
  assert.equal(first.updatedAt, 'local-1');
  assert.deepEqual(await persistence.read(address), first);
  await assert.rejects(
    () => persistence.write({ address, value: 'stale', expectedRevision: 'wrong' }),
    /Persistence revision conflict/,
  );
  const second = await persistence.write({
    address,
    value: { text: 'second' },
    expectedRevision: first.revision,
  });
  assert.equal(second.revision, '2');
});

test('memory synchronization returns pushed changes in cursor order', async () => {
  const synchronization = createMemorySyncAdapter<{ text: string }>();
  const change = {
    operation: 'upsert' as const,
    record: {
      address: { namespace: 'example', key: 'note' },
      value: { text: 'hello' },
      revision: '1',
      updatedAt: 'local-1',
    },
  };

  await synchronization.push({ changes: [change] });
  const firstPull = await synchronization.pull({});
  assert.deepEqual(firstPull.changes, [change]);
  assert.equal(firstPull.cursor?.token, '1');
  const secondPull = await synchronization.pull({ cursor: firstPull.cursor });
  assert.deepEqual(secondPull.changes, []);
});

test('memory notifications support deterministic scheduling and cancellation', async () => {
  const notifications = createMemoryNotificationAdapter();
  const first = await notifications.notify({
    title: 'Class starts',
    scheduledFor: '2026-08-08T09:00:00Z',
  });
  await notifications.notify({ id: 'fixed', title: 'Assignment due' });

  assert.deepEqual(
    notifications.requests.map(({ id }) => id),
    [first.id, 'fixed'],
  );
  await notifications.cancel(first.id);
  assert.deepEqual(
    notifications.requests.map(({ id }) => id),
    ['fixed'],
  );
});
