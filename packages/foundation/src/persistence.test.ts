import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  DataAddress,
  PullChangesResult,
  StoredRecord,
  SyncChange,
  SyncAdapter,
  WriteRecordRequest,
} from '@sparframe/contracts';

interface ExtensionNote {
  readonly title: string;
  readonly completed: boolean;
}

const address = {
  namespace: 'example.notes',
  key: 'note-1',
} satisfies DataAddress;

const note: ExtensionNote = { title: 'Portable note', completed: false };

test('extension-owned records use a portable address and opaque revision', () => {
  const request: WriteRecordRequest<ExtensionNote> = { address, value: note };
  const stored: StoredRecord<ExtensionNote> = {
    address,
    value: note,
    revision: 'revision-1',
    updatedAt: '2026-08-07T00:00:00.000Z',
  };

  assert.deepEqual(request.address, address);
  assert.deepEqual(stored.value, note);
  assert.equal(stored.revision, 'revision-1');
});

test('sync remains a separate transport that can be consumed by either shell', async () => {
  const change: SyncChange<ExtensionNote> = {
    operation: 'upsert',
    record: {
      address,
      value: note,
      revision: 'revision-1',
      updatedAt: '2026-08-07T00:00:00.000Z',
    },
  };
  const result: PullChangesResult<ExtensionNote> = {
    changes: [change],
    cursor: { token: 'cursor-1' },
    hasMore: false,
  };
  const adapter: SyncAdapter<ExtensionNote> = {
    async pull() {
      return result;
    },
    async push(request) {
      return { accepted: request.changes, conflicts: [] };
    },
  };

  assert.deepEqual(await adapter.pull({}), result);
  assert.deepEqual(await adapter.push({ changes: [change] }), {
    accepted: [change],
    conflicts: [],
  });
});
