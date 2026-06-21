import ru from './ru.json';
import en from './en.json';

export type Locale = 'ru' | 'en';
export const DEFAULT_LOCALE: Locale = 'ru';
export const LOCALE_STORAGE_KEY = 'factory.locale';

const dictionaries: Record<Locale, any> = { ru, en };

function getNested(obj: any, key: string): string | undefined {
  return key.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
}

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const dict = dictionaries[locale];
  let text = getNested(dict, key) ?? getNested(dictionaries[DEFAULT_LOCALE], key) ?? key;
  if (vars && typeof text === 'string') {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}

export function getStoredLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
  return stored === 'ru' || stored === 'en' ? stored : DEFAULT_LOCALE;
}
