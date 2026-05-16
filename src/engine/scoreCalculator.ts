/**
 * Score Calculator Module
 * Computes scores for played words including bonus multipliers.
 * PRD §4: Bingo bonus of 50 points for using all 7 tiles.
 * PRD §5: Point values come from game-config.json.
 * Convention §1: All scoring values from config, no hard-coding.
 */

import { BoardSquare, PlacedTile, FormedWord, MoveResult, Tile, BonusType } from '../types';
import { isValidWord } from './wordValidator';
import gameConfig from '../assets/game-config.json';

/**
 * Finds all words formed by the current move and calculates their scores.
 * A move consists of tiles placed in a single row or column.
 * All newly formed words (primary + cross-words) are validated and scored.
 */
export function validateAndScoreMove(
  board: BoardSquare[][],
  placedTiles: PlacedTile[],
  isFirstMove: boolean
): MoveResult {
  const errors: string[] = [];
  
  if (placedTiles.length === 0) {
    return { valid: false, words: [], totalScore: 0, errors: ['לא הונחו אריחים'] };
  }
  
  // Check: all tiles must be in same row or same column
  const rows = new Set(placedTiles.map(t => t.row));
  const cols = new Set(placedTiles.map(t => t.col));
  const isHorizontal = rows.size === 1;
  const isVertical = cols.size === 1;
  
  if (!isHorizontal && !isVertical) {
    errors.push('כל האריחים חייבים להיות בשורה אחת או בעמודה אחת');
    return { valid: false, words: [], totalScore: 0, errors };
  }
  
  // Build a temporary board view with placed tiles
  const tempBoard = createTempBoard(board, placedTiles);
  
  // Check: first move must cover center square (7,7)
  if (isFirstMove) {
    const coversCenter = placedTiles.some(t => t.row === 7 && t.col === 7) ||
                         board[7][7].tile !== null;
    if (!coversCenter) {
      errors.push('התור הראשון חייב לעבור במשבצת המרכזית');
      return { valid: false, words: [], totalScore: 0, errors };
    }
  }
  
  // Check: tiles must be contiguous (no gaps in the line)
  if (!areTilesContiguous(tempBoard, placedTiles, isHorizontal)) {
    errors.push('האריחים חייבים להיות רצופים (ללא רווחים)');
    return { valid: false, words: [], totalScore: 0, errors };
  }
  
  // Check: after first move, tiles must connect to existing tiles
  if (!isFirstMove) {
    const connected = placedTiles.some(pt => isAdjacentToExisting(board, pt.row, pt.col));
    if (!connected) {
      errors.push('האריחים חייבים להתחבר לאריחים קיימים על הלוח');
      return { valid: false, words: [], totalScore: 0, errors };
    }
  }
  
  // Find all formed words
  const formedWords = findAllFormedWords(tempBoard, board, placedTiles, isHorizontal);
  
  if (formedWords.length === 0) {
    errors.push('לא נוצרה מילה תקינה');
    return { valid: false, words: [], totalScore: 0, errors };
  }
  
  // Validate each word against dictionary
  const invalidWords = formedWords.filter(fw => !isValidWord(fw.word)).map(fw => fw.word);
  
  if (invalidWords.length > 0) {
    if (invalidWords.length === 1) {
      errors.push(`המילה "${invalidWords[0]}" לא נמצאה במילון`);
    } else {
      const wordsStr = invalidWords.slice(0, -1).map(w => `"${w}"`).join(', ') + 
                       ` ו-"${invalidWords[invalidWords.length - 1]}"`;
      errors.push(`המילים ${wordsStr} לא נמצאו במילון`);
    }
    return { valid: false, words: formedWords, totalScore: 0, errors };
  }
  
  // Calculate total score
  let totalScore = formedWords.reduce((sum, w) => sum + w.score, 0);
  
  // Bingo bonus: using all 7 tiles in one turn
  const bingo = placedTiles.length === gameConfig.game_settings.tiles_per_player;
  if (bingo) {
    totalScore += gameConfig.game_settings.bingo_bonus;
  }
  
  return { valid: true, words: formedWords, totalScore, errors: [] };
}

/**
 * Creates a temporary board view with the currently placed tiles overlaid.
 * Used for finding words without modifying the actual board state.
 */
function createTempBoard(board: BoardSquare[][], placedTiles: PlacedTile[]): (Tile | null)[][] {
  const size = board.length;
  const temp: (Tile | null)[][] = [];
  
  for (let r = 0; r < size; r++) {
    temp[r] = [];
    for (let c = 0; c < size; c++) {
      temp[r][c] = board[r][c].tile;
    }
  }
  
  for (const pt of placedTiles) {
    temp[pt.row][pt.col] = pt.tile;
  }
  
  return temp;
}

/**
 * Checks if all placed tiles are contiguous along their line,
 * considering existing tiles that fill gaps.
 */
function areTilesContiguous(
  tempBoard: (Tile | null)[][],
  placedTiles: PlacedTile[],
  isHorizontal: boolean
): boolean {
  if (placedTiles.length <= 1) return true;
  
  if (isHorizontal) {
    const row = placedTiles[0].row;
    const minCol = Math.min(...placedTiles.map(t => t.col));
    const maxCol = Math.max(...placedTiles.map(t => t.col));
    for (let c = minCol; c <= maxCol; c++) {
      if (!tempBoard[row][c]) return false;
    }
  } else {
    const col = placedTiles[0].col;
    const minRow = Math.min(...placedTiles.map(t => t.row));
    const maxRow = Math.max(...placedTiles.map(t => t.row));
    for (let r = minRow; r <= maxRow; r++) {
      if (!tempBoard[r][col]) return false;
    }
  }
  
  return true;
}

/**
 * Checks if a position is adjacent to an existing (committed) tile on the board.
 */
function isAdjacentToExisting(board: BoardSquare[][], row: number, col: number): boolean {
  const size = board.length;
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc].tile !== null) {
      return true;
    }
  }
  return false;
}

/**
 * Finds all words formed by the current move.
 * Includes the primary word and all cross-words created by individual tiles.
 */
function findAllFormedWords(
  tempBoard: (Tile | null)[][],
  board: BoardSquare[][],
  placedTiles: PlacedTile[],
  isHorizontal: boolean
): FormedWord[] {
  const words: FormedWord[] = [];
  const size = board.length;
  const placedSet = new Set(placedTiles.map(pt => `${pt.row},${pt.col}`));
  
  // Find the primary word (along the placement direction)
  const primaryWord = extractWord(
    tempBoard,
    board,
    placedTiles[0].row,
    placedTiles[0].col,
    isHorizontal,
    placedSet,
    size
  );
  
  if (primaryWord && primaryWord.word.length >= 2) {
    words.push(primaryWord);
  }
  
  // Find cross-words (perpendicular to placement direction)
  for (const pt of placedTiles) {
    const crossWord = extractWord(
      tempBoard,
      board,
      pt.row,
      pt.col,
      !isHorizontal,
      placedSet,
      size
    );
    if (crossWord && crossWord.word.length >= 2) {
      words.push(crossWord);
    }
  }
  
  return words;
}

/**
 * Extracts a word from the board starting at the given position, extending in the given direction.
 * Calculates score with bonus multipliers for newly placed tiles.
 */
function extractWord(
  tempBoard: (Tile | null)[][],
  board: BoardSquare[][],
  startRow: number,
  startCol: number,
  isHorizontal: boolean,
  placedSet: Set<string>,
  size: number
): FormedWord | null {
  const dr = isHorizontal ? 0 : -1;
  const dc = isHorizontal ? 1 : 0; // Find start by going RIGHT for horizontal
  
  // Find the start of the word
  let r = startRow;
  let c = startCol;
  while (r + dr >= 0 && r + dr < size && c + dc >= 0 && c + dc < size && tempBoard[r + dr][c + dc]) {
    r += dr;
    c += dc;
  }
  
  // Read the full word
  const tiles: FormedWord['tiles'] = [];
  const stepR = isHorizontal ? 0 : 1;
  const stepC = isHorizontal ? -1 : 0; // Read left for horizontal
  let wordScore = 0;
  let wordMultiplier = 1;
  
  while (r >= 0 && r < size && c >= 0 && c < size && tempBoard[r][c]) {
    const tile = tempBoard[r][c]!;
    const bonus = board[r][c].bonus;
    const isNewTile = placedSet.has(`${r},${c}`);
    
    let tileScore = tile.isBlank ? 0 : tile.points;
    
    // Bonus multipliers only apply to newly placed tiles
    if (isNewTile) {
      if (bonus === 'DOUBLE_LETTER') tileScore *= 2;
      else if (bonus === 'TRIPLE_LETTER') tileScore *= 3;
      else if (bonus === 'DOUBLE_WORD' || bonus === 'CENTER') wordMultiplier *= 2;
      else if (bonus === 'TRIPLE_WORD') wordMultiplier *= 3;
    }
    
    wordScore += tileScore;
    tiles.push({ tile, row: r, col: c, bonus: isNewTile ? bonus : 'NONE' });
    
    r += stepR;
    c += stepC;
  }
  
  if (tiles.length < 2) return null;
  
  wordScore *= wordMultiplier;
  const word = tiles.map(t => {
    if (t.tile.isBlank) return t.tile.assignedChar || '?';
    return t.tile.char;
  }).join('');
  
  return { word, tiles, score: wordScore };
}
