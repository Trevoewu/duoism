import { execFileSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [entry, ...rest] = process.argv.slice(2);
if (!entry) {
  console.error('Usage: node scripts/run-ts.mjs <entry.ts> [...args]');
  process.exit(1);
}

await mkdir('.astro', { recursive: true });
const out = resolve('.astro/.script-runner.mjs');

try {
  execFileSync(resolve('node_modules/.bin/esbuild'), [
    entry,
    '--bundle',
    '--platform=node',
    '--format=esm',
    '--packages=external',
    `--outfile=${out}`,
  ], { stdio: 'inherit' });
  process.argv = [process.argv[0], resolve(entry), ...rest];
  await import(`${pathToFileURL(out).href}?t=${Date.now()}`);
} finally {
  await rm(out, { force: true });
}
