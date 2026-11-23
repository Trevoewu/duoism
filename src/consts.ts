export const SITE_TITLE = 'Duoism';
export const SITE_DESCRIPTION =
  'A bilingual, dual-tone Astro theme for notes, essays, and research.';
export const SITE_DESCRIPTION_ZH =
  '一款支持中英双语、自动抖动图像与数学排版的极简 Astro 笔记主题。';
export const SITE_URL = process.env.SITE_URL || 'https://duoism.example.com';
export const SITE_AVATAR = `${SITE_URL.replace(/\/$/, '')}/favicon.png`;

export const PORTRAIT: { light: string; dark?: string } | undefined = {
  light: '/portrait-light.webp',
  dark: '/portrait-dark.webp',
};

export const LINKS: { label: string; labelZh?: string; href: string }[] = [
  { label: 'GitHub', href: 'https://github.com/Trevoewu/duoism' },
  { label: 'Links', labelZh: '友链', href: '/links/' },
];
