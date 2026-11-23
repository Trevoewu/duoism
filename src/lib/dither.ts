import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import sharp from 'sharp';

export type Bitmap = { gray: Uint8Array; inside: Uint8Array; width: number; height: number };

const NEIGHBORS = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];

const STYLES = [
  { name: 'light', ink: [82, 96, 119], amount: (brightness: number) => 0.08 + 0.92 * (1 - brightness) ** 0.8 },
  { name: 'dark', ink: [159, 176, 224], amount: (brightness: number) => 0.08 + 0.55 * brightness },
] as const;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function brightness({ gray, inside }: Bitmap): Float32Array {
  const tones = gray.filter((_, i) => inside[i]).sort();
  const low = tones[Math.floor(tones.length * 0.02)] ?? 0;
  const high = tones[Math.floor(tones.length * 0.98)] ?? 255;
  return Float32Array.from(gray, (value) => clamp((value - low) / Math.max(high - low, 1), 0, 1));
}

function atkinson(amounts: Float32Array, { inside, width, height }: Bitmap): Uint8Array {
  const values = amounts.slice();
  const ink = new Uint8Array(values.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!inside[i]) continue;
      ink[i] = values[i] >= 0.5 ? 1 : 0;
      const error = (values[i] - ink[i]) / 8;
      for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny < height) values[ny * width + nx] += error;
      }
    }
  }
  return ink;
}

export async function dither(bitmap: Bitmap, scale: number, path: (style: string) => string): Promise<string[]> {
  const { width, height } = bitmap;
  const levels = brightness(bitmap);

  return Promise.all(STYLES.map(async ({ name, ink: [r, g, b], amount }) => {
    const pixels = new Uint8Array(width * height * 4);
    atkinson(levels.map(amount), bitmap).forEach((on, i) => on && pixels.set([r, g, b, 255], i * 4));
    await sharp(pixels, { raw: { width, height, channels: 4 } })
      .resize(width * scale, height * scale, { kernel: 'nearest' })
      .webp({ lossless: true })
      .toFile(path(name));
    return path(name);
  }));
}

export interface DitherAssetResult {
  lightSrc: string;
  darkSrc?: string;
  width?: number;
  height?: number;
}

export interface DitherAssetOptions {
  keyPrefix?: string;
  maxWidth?: number;
  squareSize?: number;
  scale?: number;
  subDir?: string;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function slugifyPrefix(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'img';
}

export async function ensureDitheredFromBuffer(
  buffer: Buffer,
  options: DitherAssetOptions = {},
): Promise<DitherAssetResult> {
  const { keyPrefix = 'img', maxWidth = 1200, squareSize, scale = 1, subDir = '' } = options;
  const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 12);
  const key = `${slugifyPrefix(keyPrefix)}-${hash}`;

  const relDir = subDir ? `_dithered/${subDir}` : '_dithered';
  const outDir = join(process.cwd(), 'public', relDir);
  const lightFile = join(outDir, `${key}-light.webp`);
  const darkFile = join(outDir, `${key}-dark.webp`);
  const metaFile = join(outDir, `${key}.json`);

  if (await exists(lightFile) && await exists(darkFile) && await exists(metaFile)) {
    const meta = JSON.parse(await readFile(metaFile, 'utf-8')) as { width: number; height: number };
    return {
      lightSrc: `/${relDir}/${key}-light.webp`,
      darkSrc: `/${relDir}/${key}-dark.webp`,
      width: meta.width,
      height: meta.height,
    };
  }

  await mkdir(outDir, { recursive: true });

  const pipeline = sharp(buffer).rotate();
  if (squareSize) {
    pipeline.resize(squareSize, squareSize, { fit: 'cover' });
  } else {
    pipeline.resize(maxWidth, null, { withoutEnlargement: true });
  }

  const { data: gray, info: { width, height } } = await pipeline
    .flatten({ background: '#fff' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const inside = new Uint8Array(width * height).fill(1);
  await dither({ gray, inside, width, height }, scale, (style) => join(outDir, `${key}-${style}.webp`));

  const outWidth = width * scale;
  const outHeight = height * scale;
  await writeFile(metaFile, JSON.stringify({ width: outWidth, height: outHeight }), 'utf-8');

  return {
    lightSrc: `/${relDir}/${key}-light.webp`,
    darkSrc: `/${relDir}/${key}-dark.webp`,
    width: outWidth,
    height: outHeight,
  };
}

export async function ensureDitheredFile(
  filePath: string,
  options: DitherAssetOptions = {},
): Promise<DitherAssetResult> {
  const buffer = await readFile(filePath);
  const keyPrefix = options.keyPrefix ?? parse(filePath).name;
  return ensureDitheredFromBuffer(buffer, { ...options, keyPrefix });
}

export async function ensureRemoteDitheredImage(
  url: string,
  options: DitherAssetOptions = {},
): Promise<DitherAssetResult> {
  if (url.startsWith('/') && !/-(light|dark)\.webp$/i.test(url)) {
    const localPath = join(process.cwd(), 'public', url.slice(1));
    if (await exists(localPath)) {
      return ensureDitheredFile(localPath, {
        subDir: 'links',
        ...options,
      });
    }
    return { lightSrc: url };
  }

  if (!/^https?:\/\//i.test(url)) {
    return { lightSrc: url };
  }

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    return await ensureDitheredFromBuffer(buffer, {
      subDir: 'links',
      ...options,
      keyPrefix: options.keyPrefix ?? slugifyPrefix(new URL(url).pathname.split('/').pop() || 'avatar'),
    });
  } catch (err) {
    console.warn(`[dither] Failed to fetch remote image ${url}:`, (err as Error).message);
    return { lightSrc: url };
  }
}
