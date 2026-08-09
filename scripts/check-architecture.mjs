import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const workspaceAreas = ['apps', 'packages', 'extensions'];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

function filesUnder(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return sourceExtensions.has(path.slice(path.lastIndexOf('.'))) ? [path] : [];
  });
}

function importsForbiddenArea(file, area) {
  const source = readFileSync(file, 'utf8');
  return new RegExp(`(?:from|import\\s*\\()\\s*['\"](?:@sparframe/)?${area}(?:/|['\"])`).test(
    source,
  );
}

function importsDirectExtension(file) {
  const source = readFileSync(file, 'utf8');
  return /(?:from|import\s*\()\s*['"](?:@sparframe\/)?extension-(?!catalog(?:['"]|\/))[^'"]+['"]/.test(
    source,
  );
}

const violations = [];
for (const file of filesUnder(join(root, 'packages', 'contracts')).concat(
  filesUnder(join(root, 'packages', 'foundation')),
)) {
  for (const forbidden of ['apps', 'extensions']) {
    if (importsForbiddenArea(file, forbidden)) {
      violations.push(`${relative(root, file)} imports ${forbidden}`);
    }
  }
}

for (const file of filesUnder(join(root, 'apps'))) {
  const normalized = relative(root, file).replaceAll('\\', '/');
  if (importsDirectExtension(file)) {
    violations.push(`${normalized} imports an extension directly; use generated extension catalog`);
  }
}

if (
  !existsSync(join(root, 'packages', 'extension-catalog', 'package.json')) ||
  !existsSync(join(root, 'packages', 'extension-catalog', 'src', 'index.ts'))
) {
  violations.push('missing generated extension catalog');
}

for (const area of workspaceAreas) {
  if (!statSync(join(root, area), { throwIfNoEntry: false })?.isDirectory()) {
    violations.push(`missing workspace area: ${area}/`);
  }
}

if (violations.length > 0) {
  console.error('Architecture check failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log('Architecture boundaries passed.');
}
