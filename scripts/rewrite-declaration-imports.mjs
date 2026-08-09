import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const directory = resolve(process.cwd(), process.argv[2] ?? 'dist');

async function rewrite(current) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      await rewrite(path);
    } else if (entry.name.endsWith('.d.ts')) {
      const source = await readFile(path, 'utf8');
      const rewritten = source.replace(/(from ['"][^'"\n]+)\.ts(['"])/g, '$1.js$2');
      if (rewritten !== source) await writeFile(path, rewritten);
    }
  }
}

await rewrite(directory);
