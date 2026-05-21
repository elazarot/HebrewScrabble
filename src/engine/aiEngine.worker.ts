/**
 * AI Engine Web Worker
 * Runs the heavy CPU-bound Scrabble AI search tree in a background thread.
 * Prevents main thread blocking and micro-stutters in the UI.
 * Convention §3: AI engine runs asynchronously in a worker thread.
 */

import { generateAIMove } from './aiEngine';
import { loadDictionary, isDictionaryLoaded } from './wordValidator';

addEventListener('message', async (e) => {
  const { board, rack, difficulty, isFirstMove } = e.data;
  
  // Ensure the local JSON dictionary is fully loaded in this worker's thread context
  if (!isDictionaryLoaded()) {
    await loadDictionary();
  }
  
  // Generate best moves (probabilistic based on EASY/HARD settings)
  const result = await generateAIMove(board, rack, difficulty, isFirstMove);
  
  // Post the calculated move back to the game thread
  postMessage(result);
});
