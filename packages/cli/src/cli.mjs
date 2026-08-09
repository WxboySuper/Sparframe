#!/usr/bin/env node

import { cp, mkdir, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { discoverExtensionPackages, validate, writeCatalog } from './discovery.mjs';

const cliDirectory = dirname(fileURLToPath(import.meta.url));
const templateDirectory = resolve(cliDirectory, '../template');
const defaultBasePackages = [
  'sparframe',
  '@sparframe/contracts',
  '@sparframe/foundation',
  '@sparframe/design',
];

export const commands = ['init', 'start', 'build', 'sync', 'update'];

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function syncApp(root, output = console, announce = true) {
  const config = await readJson(join(root, 'sparframe.json'));
  const packages = discoverExtensionPackages(root, config.extensionsDirectory ?? 'extensions');
  validate(packages, root);
  writeCatalog(root, packages);

  if (announce) {
    output.log(
      `Sparframe sync: ${packages.length} extension${packages.length === 1 ? '' : 's'} discovered.`,
    );
    for (const { manifest } of packages) output.log(`- ${manifest.sparframe.id ?? manifest.name}`);
  }
  return packages;
}

function runPackageCommand(root, args, options = {}) {
  const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const result = spawnSync(packageManager, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  return result.status ?? 1;
}

async function initApp(target, options) {
  const destination = resolve(options.cwd, target ?? '.');
  if (existsSync(destination) && (await readdir(destination)).length > 0) {
    throw new Error(`Refusing to initialize a non-empty directory: ${destination}`);
  }
  await mkdir(destination, { recursive: true });
  await cp(templateDirectory, destination, { recursive: true, force: false });
  await syncApp(destination, options.output);
  options.output.log(`Initialized Sparframe app at ${destination}`);
  if (!options.skipInstall && runPackageCommand(destination, ['install']) !== 0) {
    throw new Error('Dependency installation failed.');
  }
}

async function appCommand(command, options) {
  const root = options.cwd;
  const configPath = join(root, 'sparframe.json');
  if (!existsSync(configPath))
    throw new Error('No sparframe.json found. Run `npx sparframe init` first.');
  await syncApp(root, options.output, command === 'sync');
  if (command === 'sync') return;
  if (command === 'start') return runPackageCommand(root, ['--filter', '@sparframe/web', 'dev']);
  if (command === 'build') {
    const webStatus = runPackageCommand(root, ['--filter', '@sparframe/web', 'build']);
    if (webStatus !== 0) return;
    return runPackageCommand(root, ['--filter', '@sparframe/mobile', 'typecheck']);
  }
  if (command === 'update') {
    const config = await readJson(configPath);
    return runPackageCommand(root, [
      'update',
      '--latest',
      ...(config.basePackages ?? defaultBasePackages),
    ]);
  }
}

export async function run(argv, options = {}) {
  const context = {
    cwd: options.cwd ?? process.cwd(),
    output: options.output ?? console,
    skipInstall: options.skipInstall ?? false,
  };
  const [command, target] = argv;
  if (!commands.includes(command)) {
    context.output.log('Usage: npx sparframe <init|start|build|sync|update> [directory]');
    return command ? 1 : 0;
  }
  try {
    if (command === 'init') {
      await initApp(target, context);
      return 0;
    }
    const status = await appCommand(command, context);
    return typeof status === 'number' ? status : 0;
  } catch (error) {
    context.output.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = await run(process.argv.slice(2));
}
