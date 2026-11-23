const enDateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });
const zhDateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' });

function formatDate(date: Date, locale: 'en' | 'zh' = 'en'): string {
  return (locale === 'zh' ? zhDateFormat : enDateFormat).format(date);
}

export { formatDate };
