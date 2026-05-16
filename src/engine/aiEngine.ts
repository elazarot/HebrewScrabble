/**
 * AI Engine Module
 * Simple AI opponent for PvE mode.
 * Convention §3: AI should run async to avoid blocking UI.
 * For now, runs synchronously with a setTimeout wrapper.
 * TODO: Move to Web Worker for true async execution.
 * 
 * Strategy:
 * - EASY: Places a random valid move (not optimal)
 * - HARD: Tries to find the highest-scoring move
 */

import { BoardSquare, Tile, PlacedTile, AIDifficulty } from '../types';
import { isValidWord } from './wordValidator';
import { validateAndScoreMove } from './scoreCalculator';

interface AIMove {
  placedTiles: PlacedTile[];
  words: string[];
}

/**
 * Generates an AI move based on the current board state and rack.
 * Returns placed tiles or null if the AI should pass.
 */
export function generateAIMove(
  board: BoardSquare[][],
  rack: Tile[],
  difficulty: AIDifficulty,
  isFirstMove: boolean
): Promise<PlacedTile[] | null> {
  return new Promise((resolve) => {
    // Simulate thinking time for UX
    const thinkTime = difficulty === 'EASY' ? 800 : 1500;
    
      setTimeout(() => {
        const moves = findAllValidMoves(board, rack, isFirstMove);
        
        // Calculate actual scores for all moves and filter valid ones
        const scoredMoves = moves
          .map(m => {
            const result = validateAndScoreMove(board, m.placedTiles, isFirstMove);
            return { ...m, score: result.totalScore, valid: result.valid };
          })
          .filter(m => m.valid);
        
        if (scoredMoves.length === 0) {
          resolve(null); // AI passes
          return;
        }
        
        // Sort moves by score (descending)
        scoredMoves.sort((a, b) => b.score - a.score);
        
        const isHard = difficulty === 'HARD';
        
        let chosenMove;
        
        if (isHard) {
          const useOptimized = Math.random() < 0.7; // 70% chance for HARD
          if (useOptimized) {
            // Hard + Optimized: Pick randomly from top 5 moves
            const topMoves = scoredMoves.slice(0, Math.min(5, scoredMoves.length));
            chosenMove = topMoves[Math.floor(Math.random() * topMoves.length)];
          } else {
            // Hard + Sub-optimal: Pick from the middle of the pack
            const midIndex = Math.floor(scoredMoves.length / 2);
            chosenMove = scoredMoves[midIndex];
          }
        } else {
          // EASY Mode
          const useOptimized = Math.random() < 0.8; // 80% chance for EASY
          if (useOptimized) {
            // Easy + Optimized (for easy): Pick from bottom 5 moves (but at least 2 letters)
            const bottomMoves = scoredMoves.slice(Math.max(0, scoredMoves.length - 5));
            chosenMove = bottomMoves[Math.floor(Math.random() * bottomMoves.length)];
          } else {
            // Easy + Random boost: Pick from the top/middle
            const luckyIndex = Math.floor(Math.random() * Math.min(10, scoredMoves.length));
            chosenMove = scoredMoves[luckyIndex];
          }
        }
        
        resolve(chosenMove.placedTiles);
      }, thinkTime);
  });
}

/**
 * Finds all valid moves the AI can make.
 * Scans each anchor point on the board and tries to extend words.
 */
function findAllValidMoves(
  board: BoardSquare[][],
  rack: Tile[],
  isFirstMove: boolean
): AIMove[] {
  const size = board.length;
  const moves: AIMove[] = [];
  
  if (isFirstMove) {
    // First move: try placing words through center (7,7)
    const firstMoves = findFirstMoves(board, rack, size);
    moves.push(...firstMoves);
  } else {
    // Find anchor squares (empty squares adjacent to filled squares)
    const anchors = findAnchors(board, size);
    
    for (const [anchorRow, anchorCol] of anchors) {
      // Try horizontal words through this anchor
      const hMoves = tryPlaceWord(board, rack, anchorRow, anchorCol, true, size);
      moves.push(...hMoves);
      
      // Try vertical words through this anchor
      const vMoves = tryPlaceWord(board, rack, anchorRow, anchorCol, false, size);
      moves.push(...vMoves);
    }
  }
  
  return moves;
}

/** Finds anchor squares - empty squares adjacent to at least one placed tile */
function findAnchors(board: BoardSquare[][], size: number): [number, number][] {
  const anchors: [number, number][] = [];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c].tile !== null) continue;
      
      const hasNeighbor = dirs.some(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        return nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc].tile !== null;
      });
      
      if (hasNeighbor) {
        anchors.push([r, c]);
      }
    }
  }
  
  return anchors;
}

/** Generates moves for the first turn, placing through center */
function findFirstMoves(board: BoardSquare[][], rack: Tile[], size: number): AIMove[] {
  const moves: AIMove[] = [];
  const centerRow = Math.floor(size / 2);
  const centerCol = Math.floor(size / 2);
  
  // Try 2-letter combinations through center horizontally
  for (let len = 2; len <= Math.min(rack.length, 7); len++) {
    const combos = getCombinations(rack, len);
    for (const combo of combos) {
      // Try placing horizontally through center
      for (let startCol = centerCol; startCol < Math.min(size, centerCol + len); startCol++) {
        const placedTiles: PlacedTile[] = combo.map((tile, i) => ({
          tile: tile.isBlank ? { ...tile, assignedChar: 'א' } : tile,
          row: centerRow,
          col: startCol - i, // RTL: place leftwards
        }));
        
        const word = combo.map(t => t.isBlank ? (t.assignedChar || 'א') : t.char).join('');
        if (isValidWord(word)) {
          moves.push({ placedTiles, words: [word] });
        }
      }
      
      // Try vertically through center
      for (let startRow = Math.max(0, centerRow - len + 1); startRow <= centerRow; startRow++) {
        if (startRow + len > size) continue;
        
        const placedTiles: PlacedTile[] = combo.map((tile, i) => ({
          tile: tile.isBlank ? { ...tile, assignedChar: 'א' } : tile,
          row: startRow + i,
          col: centerCol,
        }));
        
        const word = combo.map(t => t.isBlank ? (t.assignedChar || 'א') : t.char).join('');
        if (isValidWord(word)) {
          moves.push({ placedTiles, words: [word] });
        }
      }
    }
    
    // Stop early if we found moves (for performance)
    if (moves.length > 0) break;
  }
  
  return moves;
}

/** Tries to place a word through an anchor point */
function tryPlaceWord(
  board: BoardSquare[][],
  rack: Tile[],
  anchorRow: number,
  anchorCol: number,
  isHorizontal: boolean,
  size: number
): AIMove[] {
  const moves: AIMove[] = [];
  
  // Try placing 1-3 tiles at the anchor and adjacent positions
  for (let len = 1; len <= Math.min(rack.length, 3); len++) {
    const combos = getCombinations(rack, len);
    
    for (const combo of combos) {
      // Place tiles starting at anchor
      const placedTiles: PlacedTile[] = [];
      let valid = true;
      
      for (let i = 0; i < combo.length; i++) {
        const r = isHorizontal ? anchorRow : anchorRow + i;
        const c = isHorizontal ? anchorCol - i : anchorCol; // RTL: place leftwards
        
        if (r < 0 || r >= size || c < 0 || c >= size || board[r][c].tile !== null) {
          valid = false;
          break;
        }
        
        placedTiles.push({
          tile: combo[i].isBlank ? { ...combo[i], assignedChar: 'א' } : combo[i],
          row: r,
          col: c
        });
      }
      
      if (!valid || placedTiles.length === 0) continue;
      
      // Check if the word formed is valid
      const wordTiles = getFullWord(board, placedTiles, isHorizontal, size);
      if (wordTiles.length >= 2) {
        const word = wordTiles.map(t => {
          if (t.isBlank) return t.assignedChar || 'א';
          return t.char;
        }).join('');
        
        if (isValidWord(word)) {
          moves.push({ placedTiles, words: [word] });
        }
      }
    }
  }
  
  return moves;
}

/** Gets the full word including existing board tiles around the placed tiles */
function getFullWord(
  board: BoardSquare[][],
  placedTiles: PlacedTile[],
  isHorizontal: boolean,
  size: number
): Tile[] {
  const tiles: Tile[] = [];
  const placedMap = new Map(placedTiles.map(pt => [`${pt.row},${pt.col}`, pt.tile]));
  
  const startR = placedTiles[0].row;
  const startC = placedTiles[0].col;
  const searchDr = isHorizontal ? 0 : -1;
  const searchDc = isHorizontal ? 1 : 0; // RTL: find start by going right
  
  let r = startR;
  let c = startC;
  while (r + searchDr >= 0 && r + searchDr < size && c + searchDc >= 0 && c + searchDc < size && (placedMap.has(`${r + searchDr},${c + searchDc}`) || board[r + searchDr][c + searchDc].tile)) {
    r += searchDr;
    c += searchDc;
  }
  
  const readDr = isHorizontal ? 0 : 1;
  const readDc = isHorizontal ? -1 : 0; // RTL: read by going left
  
  // Read forward
  while (r >= 0 && r < size && c >= 0 && c < size) {
    const key = `${r},${c}`;
    if (placedMap.has(key)) {
      tiles.push(placedMap.get(key)!);
    } else if (board[r][c].tile) {
      tiles.push(board[r][c].tile!);
    } else {
      break;
    }
    r += readDr;
    c += readDc;
  }
  
  return tiles;
}

/** Gets all combinations of k elements from the array */
function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  
  const result: T[][] = [];
  
  // Limit combinations for performance
  const maxCombos = 200;
  
  function helper(start: number, current: T[]): void {
    if (result.length >= maxCombos) return;
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      helper(i + 1, current);
      current.pop();
    }
  }
  
  helper(0, []);
  
  // Also generate permutations of each combination
  const permuted: T[][] = [];
  for (const combo of result) {
    if (permuted.length >= maxCombos) break;
    const perms = getPermutations(combo);
    for (const perm of perms) {
      if (permuted.length >= maxCombos) break;
      permuted.push(perm);
    }
  }
  
  return permuted;
}

/** Gets all permutations of an array */
function getPermutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  const maxPerms = 100;
  
  for (let i = 0; i < arr.length && result.length < maxPerms; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = getPermutations(rest);
    for (const perm of perms) {
      if (result.length >= maxPerms) break;
      result.push([arr[i], ...perm]);
    }
  }
  
  return result;
}
