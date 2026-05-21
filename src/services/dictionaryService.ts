import { CapacitorHttp } from '@capacitor/core';

export interface WordDefinition {
  word: string;
  sourceUrl: string;
  sourceName: string;
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
    name: 'האקדמיה ללשון',
    getUrl: (word: string) => `https://hebrew-academy.org.il/?s=${encodeURIComponent(word)}`,
    notFoundIndicator: 'לא נמצאו תוצאות'
  }
];

/**
 * Checks which dictionary has the word based on priority.
 * Uses CapacitorHttp to bypass CORS on mobile.
 */
export async function fetchDefinitions(words: string[]): Promise<WordDefinition[]> {
  const results: WordDefinition[] = [];

  for (const word of words) {
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
