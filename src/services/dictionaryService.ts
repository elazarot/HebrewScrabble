import { CapacitorHttp } from '@capacitor/core';

export interface WordDefinition {
  word: string;
  sourceUrl: string;
  sourceName: string;
}

/**
 * Restores final letters (ך, ם, ן, ף, ץ) at the end of a word if it ends with their standard equivalents.
 * This is used for external dictionaries since the Scrabble board uses only non-final letters.
 */
export function restoreFinalLetters(word: string): string {
  if (!word) return word;
  const lastChar = word.slice(-1);
  const replacements: { [key: string]: string } = {
    'כ': 'ך',
    'מ': 'ם',
    'נ': 'ן',
    'פ': 'ף',
    'צ': 'ץ'
  };
  if (replacements[lastChar]) {
    return word.slice(0, -1) + replacements[lastChar];
  }
  return word;
}

interface DictionarySource {
  name: string;
  getUrl: (word: string) => string;
  notFoundIndicator?: string;
  is404Check?: boolean;
}

const DICTIONARIES: DictionarySource[] = [
  {
    name: 'מילוג',
    getUrl: (word: string) => `https://milog.co.il/${encodeURIComponent(word)}`,
    notFoundIndicator: 'לא נמצאו תוצאות'
  },
  {
    name: 'אבניאון',
    getUrl: (word: string) => `https://www.milononline.net/do_search.php?Q=${encodeURIComponent(word)}`,
    notFoundIndicator: 'לא נמצאו ערכים'
  },
  {
    name: 'ויקימילון',
    getUrl: (word: string) => `https://he.wiktionary.org/wiki/${encodeURIComponent(word)}`,
    is404Check: true
  }
];

/**
 * Checks which dictionary has the word based on priority.
 * Uses CapacitorHttp to bypass CORS on mobile.
 */
export async function fetchDefinitions(words: string[]): Promise<WordDefinition[]> {
  const results: WordDefinition[] = [];

  for (const rawWord of words) {
    const word = restoreFinalLetters(rawWord);
    let bestSource = DICTIONARIES[0]; // Default to Milog
    
    // Try each dictionary in order
    for (const dict of DICTIONARIES) {
      try {
        const response = await CapacitorHttp.get({ url: dict.getUrl(word) });
        
        if (dict.is404Check) {
          if (response.status === 200) {
            bestSource = dict;
            break;
          }
        } else {
          // Check if the "not found" text exists in the HTML
          const html = response.data as string;
          if (html && !html.includes(dict.notFoundIndicator!)) {
            bestSource = dict;
            break;
          }
        }
      } catch (e) {
        console.warn(`Failed to check dictionary ${dict.name}`, e);
      }
    }

    results.push({
      word,
      sourceUrl: bestSource.getUrl(word),
      sourceName: bestSource.name
    });
  }

  return results;
}
