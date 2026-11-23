# Duoism

A bilingual, dual-tone Astro theme for personal notes, technical writing, and research essays.

Demo: [duoism.vercel.app](https://duoism.vercel.app)

Derived from Vlad Esafev's [Twoism](https://github.com/esafev/twoism), **Duoism** keeps its restrained typographic craft while adding a Sky Light / Klein Blue Dark palette, first-class `中 / EN` bilingual switching, automatic build-time Atkinson image dithering, wide-screen TOC, MathJax equations, a `/links` page, and zero-dependency interactive SVG charts.

## Features

- **Dual-tone palette & manual theme switch**: Sky-tinted light mode (`#e6effb`) and Klein blue dark mode (`#0a2675`), following system preference by default with instant manual override and `localStorage` persistence.
- **First-class bilingual (`中 / EN`) support**:
  - Instant language toggle in the header without page reloads.
  - Pair bilingual notes automatically via filename suffixes (`post.mdx` + `post.en.mdx`) or `translationOf` in frontmatter.
  - Synchronized page titles, dates, navigation, and wide-screen TOC.
- **Automatic build-time Atkinson dithering**:
  - Standard relative Markdown/MDX images (`![alt](./assets/photo.png)`) are automatically converted into lossless light & dark Atkinson-dithered WebP `<picture>` elements via a custom Remark plugin.
  - Friend avatars on `/links` (both remote URLs and local `/public` images) are dithered automatically at build time.
- **Research & long-form ergonomics**:
  - Build-time math typesetting with `remark-math` + `rehype-mathjax`.
  - Floating top-level Table of Contents on wide viewports (`>= 1200px`) with active section tracking.
  - Zero-dependency accessible SVG line chart component (`src/components/charts/ResearchPlot.astro`).
  - Automatic Open Graph image generation (`satori` + `sharp`), RSS feed, and sitemap.
- **Chinese + Monospace typography**: Bundles `IBM Plex Mono` locally and loads `IBM Plex Sans SC` for crisp CJK rendering.

## Quick Start

```sh
pnpm create astro@latest --template Trevoewu/duoism
cd <your-project>
pnpm install
pnpm dev
```

Or clone directly:

```sh
git clone https://github.com/Trevoewu/duoism.git
cd duoism
pnpm install
pnpm dev
```

## Customize

| File / Directory | Purpose |
| --- | --- |
| `src/consts.ts` | Site title, description, canonical URL, portrait, and footer links |
| `src/content/intro.mdx` & `intro.en.mdx` | Bilingual homepage introduction |
| `src/content/notes/` | Markdown & MDX notes (drafts with `published: false` show only in dev) |
| `src/data/links.json` | Entries rendered on `/links` |
| `src/styles/global.css` | Color palette variables and base typography |

## Scripts

```sh
pnpm dev                                    # start local dev server
pnpm build                                  # type-check & build static site
pnpm preview                                # preview production build locally
pnpm run note:create "Title" "Description"  # scaffold a draft note
pnpm run portrait:create photo.jpg          # create dithered portrait (transparent PNG or macOS Vision cutout)
pnpm run image:dither photo.jpg             # manually generate light/dark dithered WebP pair
```

## Credits & License

Duoism is based on [Twoism](https://github.com/esafev/twoism) by [Vlad Esafev](https://github.com/esafev) (MIT License).
Bundled `IBM Plex Mono` font is licensed under the SIL Open Font License 1.1 (`public/fonts/OFL.txt`).

Released under the [MIT License](./LICENSE).
