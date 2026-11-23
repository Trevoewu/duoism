import { access, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '') || `note-${Date.now()}`;
}

const [title = 'A new title', description = ''] = process.argv.slice(2);
const slug = createSlug(title);
const currentDate = new Date().toISOString().replace(/\.\d+/, '');
const scriptDir = dirname(fileURLToPath(import.meta.url));

const frontmatter = `---
title: ${JSON.stringify(title)}
pubDate: ${currentDate}${description ? `\ndescription: ${JSON.stringify(description)}` : ''}
slug: ${slug}
published: false
---

## Subtitle
Content goes here...
`;

const filename = `${slug}.md`;
const filepath = join(scriptDir, '..', 'src', 'content', 'notes', filename);

let exists = true;
try {
  await access(filepath);
} catch {
  exists = false;
}

if (exists) {
  console.log('The draft note already exists, please use it');
} else {
  await writeFile(filepath, frontmatter, 'utf-8');
  console.log([
    `Created new post: ${filename}`,
    `Path: ${filepath}`,
    `Slug: ${slug}`,
    `Published: false (change to true when ready)`
  ].join('\n'));
}
