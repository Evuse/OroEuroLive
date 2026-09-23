import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, 'assets'), resolve(output, 'assets'), { recursive: true });
await writeFile(resolve(output, 'index.html'), await readFile(resolve(root, 'index.html')));
await writeFile(resolve(output, 'server.mjs'), await readFile(resolve(root, 'server.mjs')));
await writeFile(resolve(output, 'package.json'), await readFile(resolve(root, 'package.json')));

console.log('Build completata: index.html e assets copiati in dist/.');
