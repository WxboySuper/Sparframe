import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const packages = [
  { filter: '@sparframe/contracts', required: ['dist/index.js', 'dist/index.d.ts'] },
  { filter: '@sparframe/design', required: ['dist/index.js', 'dist/index.d.ts'] },
  {
    filter: '@sparframe/foundation',
    required: ['dist/index.js', 'dist/index.d.ts', 'dist/registry.js'],
  },
  { filter: 'sparframe', required: ['src/cli.mjs', 'src/discovery.mjs', 'template/package.json'] },
];
const packageManager = 'pnpm';

const destination = await mkdtemp(join(tmpdir(), 'sparframe-packages-'));
try {
  for (const packageInfo of packages) {
    const result = spawnSync(
      packageManager,
      ['--filter', packageInfo.filter, 'pack', '--pack-destination', destination, '--json'],
      { encoding: 'utf8', shell: process.platform === 'win32' },
    );
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `${packageInfo.filter} pack failed:\n${result.stderr}`);
    const metadata = JSON.parse(result.stdout.trim());
    const files = new Set(metadata.files.map(({ path }) => path));
    for (const required of packageInfo.required) {
      assert(files.has(required), `${packageInfo.filter} package is missing ${required}`);
    }
  }
  const foundationDeclarations = await readFile(
    join(process.cwd(), 'packages', 'foundation', 'dist', 'index.d.ts'),
    'utf8',
  );
  assert.doesNotMatch(
    foundationDeclarations,
    /from ['"].*\.ts['"]/,
    'Foundation declarations must reference emitted JavaScript modules',
  );
  console.log(`Package smoke check passed (${packages.length} public packages).`);
} finally {
  await rm(destination, { recursive: true, force: true });
}
