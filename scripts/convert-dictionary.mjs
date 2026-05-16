/**
 * Script to convert the Hspell word list to a JSON array for the game.
 * Filters: only Hebrew letters, no final letters, length >= 2, no punctuation.
 * Run with: node scripts/convert-dictionary.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = join(__dirname, '..', 'src', 'assets', 'hspell_words.txt');
const outputPath = join(__dirname, '..', 'src', 'assets', 'dictionary.json');

// Read the word list
const raw = readFileSync(inputPath, 'utf-8');
const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

// Hebrew letter ranges (regular only, no final letters per PRD §4)
const HEBREW_REGEX = /^[\u05D0-\u05EA]+$/;

// Final letters mapping: convert any final letter to its regular form
const FINAL_TO_REGULAR = {
  '\u05DA': '\u05DB', // ך -> כ
  '\u05DD': '\u05DE', // ם -> מ
  '\u05DF': '\u05E0', // ן -> נ
  '\u05E3': '\u05E4', // ף -> פ
  '\u05E5': '\u05E6', // ץ -> צ
};

function normalizeFinalLetters(word) {
  let result = '';
  for (const ch of word) {
    result += FINAL_TO_REGULAR[ch] || ch;
  }
  return result;
}

// Process words
const validWords = new Set();
let skipped = 0;

for (const line of lines) {
  // Skip lines with non-Hebrew chars (quotes, hyphens, spaces, digits)
  if (!line.match(/^[\u05D0-\u05EA\u05DA\u05DD\u05DF\u05E3\u05E5]+$/)) {
    skipped++;
    continue;
  }

  // Normalize final letters to regular forms
  const normalized = normalizeFinalLetters(line);

  // Must be at least 2 letters
  if (normalized.length >= 2) {
    validWords.add(normalized);
  }
}

// Sort and convert to array
const sortedWords = [...validWords].sort();

console.log(`Input lines: ${lines.length}`);
console.log(`Skipped (non-Hebrew): ${skipped}`);
console.log(`Valid words: ${sortedWords.length}`);
console.log(`Sample: ${sortedWords.slice(0, 10).join(', ')}`);

// Write JSON
writeFileSync(outputPath, JSON.stringify(sortedWords), 'utf-8');
console.log(`Written to: ${outputPath}`);
console.log(`File size: ${(readFileSync(outputPath).length / 1024 / 1024).toFixed(2)} MB`);
