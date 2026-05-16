/**
 * Word Validator Module
 * Validates words against the local Hebrew dictionary.
 * PRD §4: All formed words must exist in the dictionary.
 * PRD §6: Dictionary is a local JSON file - no API calls.
 * Convention §1: Validation uses ONLY the local JSON dictionary.
 */

// The dictionary will be loaded as a Set for O(1) lookups
let dictionarySet: Set<string> | null = null;

/**
 * Normalizes Hebrew text by converting final letters to their regular forms.
 * (ך -> כ, ם -> מ, ן -> נ, ף -> פ, ץ -> צ)
 */
function normalizeHebrew(word: string): string {
  return word
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ');
}

/**
 * Loads the Hebrew dictionary from the local JSON asset.
 * The dictionary should be an array of valid Hebrew words.
 * Called once at app startup.
 */
export async function loadDictionary(): Promise<void> {
  try {
    // Dynamic import of the dictionary JSON file
    const dictModule: any = await import('../assets/dictionary.json');
    const words: string[] = dictModule.default || dictModule;
    
    // Normalize all words in the dictionary to regular forms for Scrabble matching
    dictionarySet = new Set(words.map((w: string) => normalizeHebrew(w.trim())));
    
    console.log(`מילון נטען: ${dictionarySet.size} מילים (מנורמל)`);
  } catch (error) {
    console.warn('לא ניתן לטעון את המילון. משתמש במצב פתוח (כל מילה תקינה).');
    dictionarySet = null;
  }
}

/**
 * Checks if a word exists in the Hebrew dictionary.
 * If the dictionary hasn't been loaded, all words are considered valid (dev mode).
 */
export function isValidWord(word: string): boolean {
  // Words must be at least 2 letters
  if (word.length < 2) return false;
  
  // If dictionary not loaded, don't allow any words yet to prevent AI "hallucinations"
  if (!dictionarySet) {
    console.warn('החיפוש נכשל: המילון עדיין לא נטען.');
    return false;
  }
  
  // Normalize the input word (though Scrabble tiles are usually already regular forms)
  return dictionarySet.has(normalizeHebrew(word));
}

/**
 * Returns whether the dictionary has been successfully loaded.
 */
export function isDictionaryLoaded(): boolean {
  return dictionarySet !== null;
}

/**
 * Returns the number of words in the dictionary.
 */
export function getDictionarySize(): number {
  return dictionarySet?.size ?? 0;
}
