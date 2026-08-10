import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const pnpmStore = path.resolve('node_modules/.pnpm');
const metroPackages = readdirSync(pnpmStore)
  .filter((entry) => /^metro@\d/.test(entry))
  .map((entry) => path.join(pnpmStore, entry, 'node_modules/metro/package.json'))
  .filter(existsSync);

assert.ok(metroPackages.length > 0, 'expected at least one installed Metro package');

const imageSizeModules = metroPackages.map((metroPackage) => {
  const metroRequire = createRequire(metroPackage);
  const imageSizePath = metroRequire.resolve('image-size');

  return {
    imageSize: metroRequire('image-size'),
    imageSizePath,
    imageSizeUtils: metroRequire(path.resolve(path.dirname(imageSizePath), 'types/utils.js')),
    metroPackage,
  };
});

const malformedIcns = Buffer.from([
  0x69, 0x63, 0x6e, 0x73, 0, 0, 0, 16, 0x69, 0x63, 0x70, 0x34, 0, 0, 0, 0,
]);

const malformedJxl = Buffer.from([0, 0, 0, 0, 0x4a, 0x58, 0x4c, 0x20]);

const malformedHeif = Buffer.from([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]);

function metroLabel(metroPackage) {
  return path.relative(process.cwd(), metroPackage);
}

function assertDoesNotHang(imageSizePath, input, label) {
  const child = `
    const imageSize = require(${JSON.stringify(imageSizePath)});
    try {
      imageSize(Buffer.from(${JSON.stringify([...input])}));
    } catch {}
  `;
  const result = spawnSync(process.execPath, ['-e', child], {
    encoding: 'utf8',
    timeout: 1000,
  });

  assert.notEqual(result.error?.code, 'ETIMEDOUT', `${label} timed out`);
  assert.equal(result.status, 0, `${label} child process failed`);
}

for (const { imageSize, imageSizePath, imageSizeUtils, metroPackage } of imageSizeModules) {
  const label = metroLabel(metroPackage);

  test(`patched image-size rejects zero-length ICNS entries (${label})`, () => {
    assert.throws(() => imageSize(malformedIcns), /image entry length must be at least 8 bytes/);
  });

  test(`patched image-size does not hang on zero-length JXL boxes (${label})`, () => {
    assertDoesNotHang(imageSizePath, malformedJxl, 'JXL parser');
  });

  test(`patched image-size does not hang on zero-length HEIF boxes (${label})`, () => {
    assertDoesNotHang(imageSizePath, malformedHeif, 'HEIF parser');
  });

  test(`patched image-size advances past zero-length container boxes (${label})`, () => {
    assert.equal(imageSizeUtils.findBox(malformedJxl, 'meta', 0), undefined);
  });
}
