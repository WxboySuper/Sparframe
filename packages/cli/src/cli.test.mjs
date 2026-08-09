import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { run } from './cli.mjs';

function output() {
  const lines = [];
  return {
    lines,
    log: (line) => lines.push(String(line)),
    error: (line) => lines.push(`error: ${String(line)}`),
  };
}

test('init creates a workspace with an empty extension catalog', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sparframe-cli-'));
  try {
    const logs = output();
    assert.equal(await run(['init', 'app'], { cwd: root, skipInstall: true, output: logs }), 0);
    const app = join(root, 'app');
    const catalog = await readFile(
      join(app, 'packages', 'extension-catalog', 'src', 'index.ts'),
      'utf8',
    );
    const webCatalog = await readFile(
      join(app, 'packages', 'extension-catalog', 'src', 'web.ts'),
      'utf8',
    );
    const mobileCatalog = await readFile(
      join(app, 'packages', 'extension-catalog', 'src', 'mobile.ts'),
      'utf8',
    );
    const catalogManifest = await readFile(
      join(app, 'packages', 'extension-catalog', 'package.json'),
      'utf8',
    );
    assert.match(catalog, /discoveredExtensions = \[\] as const/);
    assert.match(webCatalog, /discoveredWebExtensions/);
    assert.match(mobileCatalog, /discoveredMobileExtensions/);
    assert.doesNotMatch(catalogManifest, /extension-auth-local/);
    assert.match(logs.lines.join('\n'), /0 extensions discovered/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sync discovers a new extension without an add command', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sparframe-cli-'));
  try {
    const logs = output();
    assert.equal(await run(['init', '.'], { cwd: root, skipInstall: true, output: logs }), 0);
    const extension = join(root, 'extensions', 'notes');
    await mkdir(join(extension, 'src'), { recursive: true });
    await writeFile(
      join(extension, 'package.json'),
      JSON.stringify({
        name: '@app/extension-notes',
        version: '0.1.0',
        type: 'module',
        sparframe: { id: 'notes', extensionExport: 'notesExtension' },
      }),
    );
    await writeFile(
      join(extension, 'src', 'index.ts'),
      "export const notesExtension = { manifest: { id: 'notes', name: 'Notes', version: '0.1.0', supportedShells: ['web'] } };\n",
    );
    assert.equal(await run(['sync'], { cwd: root, output: logs }), 0);
    const catalog = await readFile(
      join(root, 'packages', 'extension-catalog', 'src', 'index.ts'),
      'utf8',
    );
    assert.match(catalog, /notesExtension/);
    assert.match(logs.lines.join('\n'), /1 extension discovered/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('app commands fail clearly outside a Sparframe workspace', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sparframe-cli-'));
  try {
    const logs = output();
    assert.equal(await run(['start'], { cwd: root, output: logs }), 1);
    assert.match(logs.lines.join('\n'), /sparframe init/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sync rejects extension metadata without a valid export', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sparframe-cli-'));
  try {
    const logs = output();
    assert.equal(await run(['init', '.'], { cwd: root, skipInstall: true, output: logs }), 0);
    const extension = join(root, 'extensions', 'broken');
    await mkdir(join(extension, 'src'), { recursive: true });
    await writeFile(
      join(extension, 'package.json'),
      JSON.stringify({ name: '@app/extension-broken', version: '0.1.0', sparframe: {} }),
    );
    await writeFile(join(extension, 'src', 'index.ts'), 'export {};\n');
    assert.equal(await run(['sync'], { cwd: root, output: logs }), 1);
    assert.match(logs.lines.join('\n'), /Invalid extension export/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
