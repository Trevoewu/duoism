import { access } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { ensureDitheredFile } from './dither';

interface MdastNode {
  type: string;
  url?: string;
  alt?: string | null;
  title?: string | null;
  value?: string;
  name?: string;
  attributes?: Array<{ type: string; name: string; value: string }>;
  children?: MdastNode[];
}

interface VFileLike {
  history?: string[];
  path?: string;
  extname?: string;
}

function escapeAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function isLocalSourceImage(url: string): boolean {
  if (!url) return false;
  if (/^(https?:)?\/\/|^data:|^\/|^#/i.test(url)) return false;
  if (/-(light|dark)\.webp$/i.test(url)) return false;
  return true;
}

function collectImages(node: MdastNode, out: Array<{ parent: MdastNode; index: number; node: MdastNode }>) {
  if (!Array.isArray(node.children)) return;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type === 'image' && child.url && isLocalSourceImage(child.url)) {
      out.push({ parent: node, index: i, node: child });
    } else {
      collectImages(child, out);
    }
  }
}

export function remarkDitherImages() {
  return async (tree: MdastNode, file: VFileLike) => {
    const sourcePath = file.history?.[0] ?? file.path;
    if (!sourcePath) return;

    const targets: Array<{ parent: MdastNode; index: number; node: MdastNode }> = [];
    collectImages(tree, targets);
    if (targets.length === 0) return;

    const sourceDir = dirname(sourcePath);
    const isMdx = (file.extname ?? extname(sourcePath)).toLowerCase() === '.mdx';

    for (const { parent, index, node } of targets) {
      let decodedUrl = node.url!;
      try {
        decodedUrl = decodeURIComponent(decodedUrl);
      } catch {
        // Keep raw URL if malformed percent encoding
      }

      const absPath = resolve(sourceDir, decodedUrl);
      try {
        await access(absPath);
      } catch {
        continue;
      }

      const { lightSrc, darkSrc, width, height } = await ensureDitheredFile(absPath, {
        maxWidth: 1200,
        scale: 1,
      });

      const alt = node.alt ?? '';
      const title = node.title ?? '';

      if (isMdx) {
        const imgAttrs: Array<{ type: string; name: string; value: string }> = [
          { type: 'mdxJsxAttribute', name: 'src', value: lightSrc },
          { type: 'mdxJsxAttribute', name: 'alt', value: alt },
          { type: 'mdxJsxAttribute', name: 'loading', value: 'lazy' },
          { type: 'mdxJsxAttribute', name: 'decoding', value: 'async' },
        ];
        if (title) imgAttrs.push({ type: 'mdxJsxAttribute', name: 'title', value: title });
        if (width) imgAttrs.push({ type: 'mdxJsxAttribute', name: 'width', value: String(width) });
        if (height) imgAttrs.push({ type: 'mdxJsxAttribute', name: 'height', value: String(height) });

        const children: MdastNode[] = [];
        if (darkSrc) {
          children.push({
            type: 'mdxJsxTextElement',
            name: 'source',
            attributes: [
              { type: 'mdxJsxAttribute', name: 'srcset', value: darkSrc },
              { type: 'mdxJsxAttribute', name: 'media', value: '(prefers-color-scheme: dark)' },
            ],
            children: [],
          });
        }
        children.push({
          type: 'mdxJsxTextElement',
          name: 'img',
          attributes: imgAttrs,
          children: [],
        });

        parent.children![index] = {
          type: 'mdxJsxTextElement',
          name: 'picture',
          attributes: [],
          children,
        };
      } else {
        const sizeAttrs = width && height ? ` width="${width}" height="${height}"` : '';
        const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
        const sourceTag = darkSrc
          ? `<source srcset="${darkSrc}" media="(prefers-color-scheme: dark)">`
          : '';
        parent.children![index] = {
          type: 'html',
          value: `<picture>${sourceTag}<img src="${lightSrc}" alt="${escapeAttr(alt)}"${titleAttr}${sizeAttrs} loading="lazy" decoding="async"></picture>`,
        };
      }
    }
  };
}
