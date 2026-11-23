import { getCollection, type CollectionEntry } from 'astro:content';

export type NoteLang = 'zh' | 'en';
export type NoteEntry = CollectionEntry<'notes'>;
export type NoteTranslationPair = Partial<Record<NoteLang, NoteEntry>>;
export type NoteTranslationsMap = Map<string, NoteTranslationPair>;

function inferNoteLang(note: NoteEntry): NoteLang {
  if (note.data.lang) return note.data.lang;
  if (/[.-]zh$/.test(note.id)) return 'zh';
  if (/[.-]en$/.test(note.id)) return 'en';
  return /[\u4e00-\u9fff]/.test(note.data.title) ? 'zh' : 'en';
}

function resolveCompanionTarget(
  note: NoteEntry,
  entryMap: Map<string, NoteEntry>,
): { targetId: string; lang: NoteLang } | null {
  const { translationOf } = note.data;
  if (translationOf && translationOf !== note.id && entryMap.has(translationOf)) {
    return { targetId: translationOf, lang: inferNoteLang(note) };
  }

  const suffixMatch = note.id.match(/^(.*)[.-](zh|en)$/) ?? note.id.match(/^(.+?)(zh|en)$/);
  if (suffixMatch) {
    const [, baseId, suffixLang] = suffixMatch;
    if (baseId && entryMap.has(baseId)) {
      return { targetId: baseId, lang: suffixLang as NoteLang };
    }
  }

  return null;
}

async function getVisibleNotes(): Promise<NoteEntry[]> {
  // Drafts are only visible in dev
  return getCollection('notes', ({ data }) => data.published || import.meta.env.DEV);
}

async function getNoteTranslations(): Promise<NoteTranslationsMap> {
  const allNotes = await getVisibleNotes();
  const entryMap = new Map(allNotes.map((note) => [note.id, note]));
  const translations: NoteTranslationsMap = new Map();

  for (const note of allNotes) {
    const companion = resolveCompanionTarget(note, entryMap);
    if (!companion) continue;

    const mainNote = entryMap.get(companion.targetId);
    if (!mainNote) continue;

    const pair = translations.get(mainNote.id) ?? {};
    const mainLang: NoteLang =
      mainNote.data.lang ?? (companion.lang === 'zh' ? 'en' : 'zh');
    pair[mainLang] ??= mainNote;
    pair[companion.lang] = note;
    translations.set(mainNote.id, pair);
  }

  return translations;
}

function getNoteBilingualTitle(
  note: NoteEntry,
  translations?: NoteTranslationsMap,
): { zh: string; en: string } | null {
  const pair = translations?.get(note.id);
  const zh = note.data.title_zh ?? pair?.zh?.data.title ?? (note.data.title_en ? note.data.title : undefined);
  const en = note.data.title_en ?? pair?.en?.data.title ?? (note.data.title_zh ? note.data.title : undefined);

  if (zh && en && zh !== en) {
    return { zh, en };
  }
  return null;
}

async function getNotes(): Promise<NoteEntry[]> {
  const allNotes = await getVisibleNotes();
  const entryMap = new Map(allNotes.map((note) => [note.id, note]));
  const mainNotes = allNotes.filter((note) => !resolveCompanionTarget(note, entryMap));

  // Newest first
  return mainNotes.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export { getNotes, getNoteTranslations, getNoteBilingualTitle };
