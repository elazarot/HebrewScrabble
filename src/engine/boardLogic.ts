/**
 * Board Logic Module
 * Defines the standard 15x15 Scrabble board layout with bonus squares.
 * Bonus positions follow the official Scrabble board pattern.
 * PRD §4: Board is 15x15 with standard bonus squares.
 */

import { BoardSquare, BonusType } from '../types';

/**
 * Standard Scrabble bonus square positions.
 * Positions are defined for one quadrant + axes, then mirrored.
 */
const TRIPLE_WORD_POSITIONS: [number, number][] = [
  [0, 0], [0, 7], [0, 14],
  [7, 0], [7, 14],
  [14, 0], [14, 7], [14, 14],
];

const DOUBLE_WORD_POSITIONS: [number, number][] = [
  [1, 1], [2, 2], [3, 3], [4, 4],
  [1, 13], [2, 12], [3, 11], [4, 10],
  [13, 1], [12, 2], [11, 3], [10, 4],
  [13, 13], [12, 12], [11, 11], [10, 10],
];

const TRIPLE_LETTER_POSITIONS: [number, number][] = [
  [1, 5], [1, 9],
  [5, 1], [5, 5], [5, 9], [5, 13],
  [9, 1], [9, 5], [9, 9], [9, 13],
  [13, 5], [13, 9],
];

const DOUBLE_LETTER_POSITIONS: [number, number][] = [
  [0, 3], [0, 11],
  [2, 6], [2, 8],
  [3, 0], [3, 7], [3, 14],
  [6, 2], [6, 6], [6, 8], [6, 12],
  [7, 3], [7, 11],
  [8, 2], [8, 6], [8, 8], [8, 12],
  [11, 0], [11, 7], [11, 14],
  [12, 6], [12, 8],
  [14, 3], [14, 11],
];

const CENTER_POSITION: [number, number] = [7, 7];

/** Creates a Set key from row,col for fast lookup */
function posKey(row: number, col: number): string {
  return `${row},${col}`;
}

/** Build lookup sets for bonus positions */
function buildBonusLookup(): Map<string, BonusType> {
  const lookup = new Map<string, BonusType>();
  
  lookup.set(posKey(CENTER_POSITION[0], CENTER_POSITION[1]), 'CENTER');
  
  for (const [r, c] of TRIPLE_WORD_POSITIONS) {
    lookup.set(posKey(r, c), 'TRIPLE_WORD');
  }
  for (const [r, c] of DOUBLE_WORD_POSITIONS) {
    lookup.set(posKey(r, c), 'DOUBLE_WORD');
  }
  for (const [r, c] of TRIPLE_LETTER_POSITIONS) {
    lookup.set(posKey(r, c), 'TRIPLE_LETTER');
  }
  for (const [r, c] of DOUBLE_LETTER_POSITIONS) {
    lookup.set(posKey(r, c), 'DOUBLE_LETTER');
  }
  
  return lookup;
}

const bonusLookup = buildBonusLookup();

/**
 * Creates an empty 15x15 game board with bonus squares assigned.
 * Called once at game initialization.
 */
export function createEmptyBoard(size: number): BoardSquare[][] {
  const board: BoardSquare[][] = [];
  
  for (let row = 0; row < size; row++) {
    const rowSquares: BoardSquare[] = [];
    for (let col = 0; col < size; col++) {
      const bonus = bonusLookup.get(posKey(row, col)) || 'NONE';
      rowSquares.push({ row, col, bonus, tile: null });
    }
    board.push(rowSquares);
  }
  
  return board;
}

/**
 * Returns the bonus type label in Hebrew for display purposes.
 */
export function getBonusLabel(bonus: BonusType): string {
  switch (bonus) {
    case 'DOUBLE_LETTER': return 'אות\nכפולה';
    case 'TRIPLE_LETTER': return 'אות\nמשולשת';
    case 'DOUBLE_WORD': return 'מילה\nכפולה';
    case 'TRIPLE_WORD': return 'מילה\nמשולשת';
    case 'CENTER': return '★';
    default: return '';
  }
}

/**
 * Returns a short bonus abbreviation for compact display.
 */
export function getBonusAbbr(bonus: BonusType): string {
  switch (bonus) {
    case 'DOUBLE_LETTER': return 'א×2';
    case 'TRIPLE_LETTER': return 'א×3';
    case 'DOUBLE_WORD': return 'מ×2';
    case 'TRIPLE_WORD': return 'מ×3';
    case 'CENTER': return '★';
    default: return '';
  }
}
