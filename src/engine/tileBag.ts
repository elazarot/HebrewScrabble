/**
 * Tile Bag Module
 * Manages the pool of tiles from which players draw.
 * All tile counts and point values are loaded from game-config.json (single source of truth).
 * PRD §5: 104 tiles total with specified distribution.
 */

import { Tile, GameConfig } from '../types';

let tileIdCounter = 0;

/** Resets the tile ID counter (for new games) */
export function resetTileIdCounter(): void {
  tileIdCounter = 0;
}

/**
 * Creates the full tile bag from the game configuration.
 * Each tile gets a unique ID for tracking throughout the game.
 */
export function createTileBag(config: GameConfig): Tile[] {
  resetTileIdCounter();
  const tiles: Tile[] = [];
  
  for (const dist of config.game_settings.tiles_distribution) {
    for (let i = 0; i < dist.count; i++) {
      tiles.push({
        id: `tile-${tileIdCounter++}`,
        char: dist.char,
        points: dist.points,
        isBlank: dist.char === 'blank',
      });
    }
  }
  
  return shuffleTiles(tiles);
}

/**
 * Fisher-Yates shuffle for randomizing tile order.
 * Returns a new shuffled array (does not mutate input).
 */
export function shuffleTiles(tiles: Tile[]): Tile[] {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Draws a specified number of tiles from the bag.
 * Returns the drawn tiles and the remaining bag.
 * PRD §4: 7 tiles per player at all times (when possible).
 */
export function drawTiles(
  bag: Tile[],
  count: number
): { drawn: Tile[]; remaining: Tile[] } {
  const actualCount = Math.min(count, bag.length);
  const drawn = bag.slice(0, actualCount);
  const remaining = bag.slice(actualCount);
  return { drawn, remaining };
}

/**
 * Returns tiles to the bag and reshuffles.
 * Used when swapping tiles.
 */
export function returnTilesToBag(bag: Tile[], tiles: Tile[]): Tile[] {
  return shuffleTiles([...bag, ...tiles]);
}
