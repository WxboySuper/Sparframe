import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  discoverExtensionPackages,
  renderCatalog,
  renderServerCatalog,
  renderShellCatalog,
  validate,
} from './discover-extensions.mjs';

test('the core repository starts with an empty extension catalog', () => {
  assert.deepEqual(discoverExtensionPackages(), []);
});

test('extension catalogs sort package metadata deterministically', () => {
  const packages = [
    {
      directory: resolve('extensions/zeta'),
      manifest: {
        name: '@app/extension-zeta',
        sparframe: { id: 'zeta', extensionExport: 'zetaExtension' },
      },
    },
    {
      directory: resolve('extensions/alpha'),
      manifest: {
        name: '@app/extension-alpha',
        sparframe: { id: 'alpha', extensionExport: 'alphaExtension' },
      },
    },
  ];
  assert.deepEqual(
    packages
      .sort((left, right) => left.manifest.name.localeCompare(right.manifest.name))
      .map(({ manifest }) => manifest.name),
    ['@app/extension-alpha', '@app/extension-zeta'],
  );
});

test('generated catalog supports an empty application', () => {
  const source = renderCatalog([]);
  assert.match(source, /discoveredExtensions = \[\] as const/);
  assert.doesNotMatch(source, /from '@app\//);
});

test('shell catalogs include only their platform contribution entrypoints', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sparframe-discovery-'));
  try {
    const directory = join(root, 'example');
    await mkdir(join(directory, 'src'), { recursive: true });
    await writeFile(join(directory, 'src', 'index.ts'), 'export const exampleExtension = {};');
    await writeFile(join(directory, 'src', 'web.tsx'), 'export const webContributions = [];');
    await writeFile(join(directory, 'src', 'mobile.tsx'), 'export const mobileContributions = [];');
    const packages = [
      {
        directory,
        manifest: {
          name: '@app/extension-example',
          sparframe: {
            id: 'example',
            extensionExport: 'exampleExtension',
            contributionEntrypoints: { web: './web.tsx', mobile: './mobile.tsx' },
            webContributionExport: 'webContributions',
            mobileContributionExport: 'mobileContributions',
          },
        },
      },
    ];
    const web = renderShellCatalog(packages, 'web');
    const mobile = renderShellCatalog(packages, 'mobile');

    assert.match(web, /extension-example\/web/);
    assert.match(web, /discoveredWebExtensions/);
    assert.doesNotMatch(web, /extension-example\/mobile/);
    assert.match(mobile, /extension-example\/mobile/);
    assert.match(mobile, /discoveredMobileExtensions/);
    assert.doesNotMatch(mobile, /extension-example\/web/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('server catalog supports an application without server extensions', () => {
  const source = renderServerCatalog([]);
  assert.match(source, /discoveredServerExtensions/);
  assert.doesNotMatch(source, /from '/);
});

test('extension metadata still requires a valid export and entrypoint', () => {
  const packages = [
    {
      directory: resolve('extensions/broken'),
      manifest: {
        name: '@app/extension-broken',
        sparframe: { id: 'broken', extensionExport: 'not-valid-name!' },
      },
    },
  ];
  assert.throws(() => validate(packages), /Invalid extension export/);
});
