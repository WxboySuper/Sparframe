import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const metroPackage = path.resolve(
  'node_modules/.pnpm/metro@0.84.4/node_modules/metro/package.json',
);
const metroRequire = createRequire(metroPackage);
const imageSize = metroRequire('image-size');
const imageSizePath = metroRequire.resolve('image-size');
const imageSizeUtils = metroRequire(path.resolve(path.dirname(imageSizePath), 'types/utils.js'));

test('patched image-size rejects zero-length ICNS entries', () => {
  const malformedIcns = Buffer.from([
    0x69, 0x63, 0x6e, 0x73, 0, 0, 0, 16, 0x69, 0x63, 0x70, 0x34, 0, 0, 0, 0,
  ]);

  assert.throws(() => imageSize(malformedIcns), /image entry length must be at least 8 bytes/);
});

test('patched image-size advances past zero-length container boxes', () => {
  const malformedBox = Buffer.from([0, 0, 0, 0, 0x6a, 0x78, 0x6c, 0x70, 0, 0, 0, 0]);

  assert.equal(imageSizeUtils.findBox(malformedBox, 'meta', 0), undefined);
});
