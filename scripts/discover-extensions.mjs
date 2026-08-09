import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  discoverExtensionPackages as discover,
  renderCatalog as render,
  renderCatalogManifest as renderManifest,
  renderServerCatalog as renderServer,
  renderShellCatalog as renderShell,
  validate as validatePackages,
  writeCatalog,
} from '../packages/cli/src/discovery.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = resolve(scriptDirectory, '..');
export const catalogDirectory = join(repositoryRoot, 'packages', 'extension-catalog');
const catalogManifestPath = join(catalogDirectory, 'package.json');
const catalogSourcePath = join(catalogDirectory, 'src', 'index.ts');
const webCatalogSourcePath = join(catalogDirectory, 'src', 'web.ts');
const mobileCatalogSourcePath = join(catalogDirectory, 'src', 'mobile.ts');
const serverCatalogSourcePath = join(catalogDirectory, 'src', 'server.ts');
const configPath = join(repositoryRoot, 'sparframe.json');

export const discoverExtensionPackages = (
  root = repositoryRoot,
  extensionsDirectory = 'extensions',
) => discover(root, extensionsDirectory);
export const renderCatalog = (packages, root = repositoryRoot) => render(packages, root);
export const renderShellCatalog = (packages, shell, root = repositoryRoot) =>
  renderShell(packages, shell, root);
export const renderServerCatalog = (packages, root = repositoryRoot) =>
  renderServer(packages, root);
export const validate = (packages, root = repositoryRoot) => validatePackages(packages, root);
export const renderCatalogManifest = (packages, root = repositoryRoot) =>
  renderManifest(packages, root);

function checkCatalog(packages) {
  const expectedSource = renderCatalog(packages);
  const expectedWebSource = renderShellCatalog(packages, 'web');
  const expectedMobileSource = renderShellCatalog(packages, 'mobile');
  const expectedServerSource = renderServerCatalog(packages);
  const expectedManifest = renderCatalogManifest(packages);
  const actualSource = existsSync(catalogSourcePath) ? readFileSync(catalogSourcePath, 'utf8') : '';
  const actualWebSource = existsSync(webCatalogSourcePath)
    ? readFileSync(webCatalogSourcePath, 'utf8')
    : '';
  const actualMobileSource = existsSync(mobileCatalogSourcePath)
    ? readFileSync(mobileCatalogSourcePath, 'utf8')
    : '';
  const actualServerSource = existsSync(serverCatalogSourcePath)
    ? readFileSync(serverCatalogSourcePath, 'utf8')
    : '';
  const actualManifest = existsSync(catalogManifestPath)
    ? readFileSync(catalogManifestPath, 'utf8')
    : '';
  if (
    actualSource !== expectedSource ||
    actualWebSource !== expectedWebSource ||
    actualMobileSource !== expectedMobileSource ||
    actualServerSource !== expectedServerSource ||
    actualManifest !== expectedManifest
  ) {
    throw new Error('Generated extension catalog is stale. Run pnpm generate:extensions.');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = existsSync(configPath)
    ? JSON.parse(readFileSync(configPath, 'utf8'))
    : { extensionsDirectory: 'extensions' };
  const packages = discoverExtensionPackages(
    repositoryRoot,
    config.extensionsDirectory ?? 'extensions',
  );
  validate(packages);
  if (process.argv.includes('--check')) {
    checkCatalog(packages);
    console.log(`Extension catalog is current (${packages.length} extensions).`);
  } else {
    writeCatalog(repositoryRoot, packages);
    console.log(`Generated extension catalog (${packages.length} extensions).`);
  }
}
