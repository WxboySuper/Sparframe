import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function packageDirectories(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (!entry.isDirectory() || entry.name === 'node_modules') return [];
    if (existsSync(join(path, 'package.json'))) return [path];
    return packageDirectories(path);
  });
}

function validateExportNames(names, description, root, directory) {
  if (!Array.isArray(names) || names.some((name) => typeof name !== 'string')) {
    throw new Error(`Invalid ${description} in ${relative(root, directory)}`);
  }
  for (const name of names) {
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
      throw new Error(`Invalid ${description} in ${relative(root, directory)}`);
    }
  }
}

export function discoverExtensionPackages(root, extensionsDirectory = 'extensions') {
  return packageDirectories(resolve(root, extensionsDirectory))
    .map((directory) => ({ directory, manifest: readJson(join(directory, 'package.json')) }))
    .filter(({ manifest }) => manifest.sparframe)
    .sort((left, right) => left.manifest.name.localeCompare(right.manifest.name));
}

export function validate(packages, root) {
  const ids = new Set();

  for (const { directory, manifest } of packages) {
    const metadata = manifest.sparframe;
    const id = metadata.id ?? manifest.name;
    if (ids.has(id)) throw new Error(`Duplicate extension catalog id: ${id}`);
    ids.add(id);
    if (!/^[A-Za-z_$][\w$]*$/.test(metadata.extensionExport ?? '')) {
      throw new Error(`Invalid extension export in ${relative(root, directory)}`);
    }
    if (!existsSync(join(directory, 'src', 'index.ts'))) {
      throw new Error(`Missing canonical extension entrypoint in ${relative(root, directory)}`);
    }
    for (const [shell, entrypoint] of Object.entries(metadata.contributionEntrypoints ?? {})) {
      if (!['web', 'mobile'].includes(shell) || typeof entrypoint !== 'string') {
        throw new Error(`Invalid contribution entrypoint in ${relative(root, directory)}`);
      }
      if (!existsSync(join(directory, 'src', entrypoint.replace(/^\.\//, '')))) {
        throw new Error(`Missing ${shell} contribution entrypoint in ${relative(root, directory)}`);
      }
    }
    if (metadata.serverEntrypoint !== undefined) {
      if (typeof metadata.serverEntrypoint !== 'string') {
        throw new Error(`Invalid server entrypoint in ${relative(root, directory)}`);
      }
      if (!/^[A-Za-z_$][\w$]*$/.test(metadata.serverContributionExport ?? '')) {
        throw new Error(`Invalid server contribution export in ${relative(root, directory)}`);
      }
      if (!existsSync(join(directory, 'src', metadata.serverEntrypoint.replace(/^\.\//, '')))) {
        throw new Error(`Missing server contribution entrypoint in ${relative(root, directory)}`);
      }
    }
    const shellValues = metadata.catalogExports?.shellValues;
    if (shellValues !== undefined) {
      if (typeof shellValues !== 'object' || shellValues === null || Array.isArray(shellValues)) {
        throw new Error(`Invalid shell catalog exports in ${relative(root, directory)}`);
      }
      for (const [shell, names] of Object.entries(shellValues)) {
        if (!['web', 'mobile'].includes(shell)) {
          throw new Error(`Invalid shell catalog export in ${relative(root, directory)}`);
        }
        validateExportNames(names, `${shell} shell catalog exports`, root, directory);
        if (names.length > 0 && !metadata.contributionEntrypoints?.[shell]) {
          throw new Error(
            `Shell catalog exports require a ${shell} contribution entrypoint in ${relative(root, directory)}`,
          );
        }
      }
    }
  }
}

export function renderCatalog(packages, root) {
  validate(packages, root);
  const imports = packages.map(({ manifest }, index) => {
    const alias = `extension${index}`;
    return `import { ${manifest.sparframe.extensionExport} as ${alias} } from '${manifest.name}';`;
  });
  const extensions = packages.map((_, index) => `extension${index}`).join(', ');
  const packageMetadata = packages
    .map(
      ({ manifest }) =>
        `  { id: '${manifest.sparframe.id ?? manifest.name}', packageName: '${manifest.name}' },`,
    )
    .join('\n');
  const reexports = packages.flatMap(({ manifest }) => {
    const catalogExports = manifest.sparframe.catalogExports ?? {};
    return [
      ...(catalogExports.values ?? []).map((name) => `export { ${name} } from '${manifest.name}';`),
      ...(catalogExports.types ?? []).map(
        (name) => `export type { ${name} } from '${manifest.name}';`,
      ),
    ];
  });
  const authProviders = packages.flatMap(({ manifest }) => {
    const exportName = manifest.sparframe.serviceExports?.auth;
    return exportName
      ? [`export { ${exportName} as discoveredAuthProviderFactory } from '${manifest.name}';`]
      : [];
  });
  const exportLines = [...reexports, ...authProviders];
  const extensionList = extensions ? `[${extensions}]` : '[]';
  const packageList = packageMetadata ? `[\n${packageMetadata}\n]` : '[]';
  return `// Generated by sparframe. Do not edit manually.\n${imports.length ? `${imports.join('\n')}\n\n` : ''}export const discoveredExtensions = ${extensionList} as const;\n\nexport const discoveredExtensionPackages = ${packageList} as const;${exportLines.length ? `\n\n${exportLines.join('\n')}` : ''}\n`;
}

export function renderShellCatalog(packages, shell, root) {
  validate(packages, root);
  const imports = packages.map(({ manifest }, index) => {
    const alias = `extension${index}`;
    return `import { ${manifest.sparframe.extensionExport} as ${alias} } from '${manifest.name}';`;
  });
  const contributionImports = packages.flatMap(({ manifest }, index) => {
    const entrypoint = manifest.sparframe.contributionEntrypoints?.[shell];
    const contributionExport = manifest.sparframe[`${shell}ContributionExport`];
    if (!entrypoint || !contributionExport) return [];
    return [
      `import { ${contributionExport} as ${shell}Contributions${index} } from '${manifest.name}/${entrypoint.replace(/^\.\//, '').replace(/\.tsx?$/, '')}';`,
    ];
  });
  const entries = packages.map(({ manifest }, index) => {
    const hasContributions = Boolean(
      manifest.sparframe.contributionEntrypoints?.[shell] &&
      manifest.sparframe[`${shell}ContributionExport`],
    );
    return hasContributions
      ? `{ ...extension${index}, contributions: ${shell}Contributions${index} }`
      : `extension${index}`;
  });
  const shellExports = packages.flatMap(({ manifest }) => {
    const metadata = manifest.sparframe;
    const values = metadata.catalogExports?.shellValues?.[shell] ?? [];
    if (values.length === 0) return [];
    const entrypoint = metadata.contributionEntrypoints[shell];
    const moduleName = `${manifest.name}/${entrypoint.replace(/^\.\//, '').replace(/\.tsx?$/, '')}`;
    return [`export { ${values.join(', ')} } from '${moduleName}';`];
  });
  const name = shell[0].toUpperCase() + shell.slice(1);
  const allImports = [...imports, ...contributionImports];
  const extensionList = entries.length
    ? `[\n${entries.map((entry) => `  ${entry},`).join('\n')}\n]`
    : '[]';
  return `// Generated by sparframe. Do not edit manually.\n${allImports.length ? `${allImports.join('\n')}\n\n` : ''}export const discovered${name}Extensions = ${extensionList} as const;${shellExports.length ? `\n\n${shellExports.join('\n')}` : ''}\n`;
}

export function renderServerCatalog(packages, root) {
  validate(packages, root);
  const serverPackages = packages.filter(
    ({ manifest }) =>
      manifest.sparframe.serverEntrypoint && manifest.sparframe.serverContributionExport,
  );
  const imports = serverPackages.map(({ manifest }, index) => {
    const entrypoint = manifest.sparframe.serverEntrypoint
      .replace(/^\.\//, '')
      .replace(/\.tsx?$/, '');
    return `import { ${manifest.sparframe.serverContributionExport} as server${index} } from '${manifest.name}/${entrypoint}';`;
  });
  const entries = serverPackages.map(
    ({ manifest }, index) =>
      `  { extensionId: '${manifest.sparframe.id ?? manifest.name}', contribution: server${index} },`,
  );
  const extensionList = entries.length ? `[\n${entries.join('\n')}\n]` : '[]';
  return `// Generated by sparframe. Do not edit manually.\n${imports.length ? `${imports.join('\n')}\n\n` : ''}export const discoveredServerExtensions = ${extensionList} as const;\n`;
}

export function renderCatalogManifest(packages, root) {
  validate(packages, root);
  const dependencies = Object.fromEntries(
    packages.map(({ manifest }) => [manifest.name, 'workspace:*']),
  );
  return `${JSON.stringify(
    {
      name: '@sparframe/extension-catalog',
      private: true,
      version: '0.1.0',
      type: 'module',
      exports: {
        '.': './src/index.ts',
        './web': './src/web.ts',
        './mobile': './src/mobile.ts',
        './server': './src/server.ts',
      },
      scripts: { lint: 'oxlint', typecheck: 'tsc --noEmit' },
      dependencies,
      devDependencies: {
        '@types/node': '^26.1.2',
        oxlint: '^1.75.0',
        typescript: '~6.0.2',
      },
    },
    null,
    2,
  )}\n`;
}

export function writeCatalog(root, packages) {
  validate(packages, root);
  const catalogDirectory = join(root, 'packages', 'extension-catalog');
  mkdirSync(join(catalogDirectory, 'src'), { recursive: true });
  writeFileSync(join(catalogDirectory, 'package.json'), renderCatalogManifest(packages, root));
  writeFileSync(join(catalogDirectory, 'src', 'index.ts'), renderCatalog(packages, root));
  writeFileSync(join(catalogDirectory, 'src', 'web.ts'), renderShellCatalog(packages, 'web', root));
  writeFileSync(
    join(catalogDirectory, 'src', 'mobile.ts'),
    renderShellCatalog(packages, 'mobile', root),
  );
  writeFileSync(join(catalogDirectory, 'src', 'server.ts'), renderServerCatalog(packages, root));
}
