/// Type definitions for שבץ נא (Hebrew Scrabble)
/// All core types used across the game engine and UI components.

/** Represents a single letter tile */
export interface Tile {
  id: string;
  char: string;        // Hebrew letter or "blank" for joker
  points: number;      // Point value from config
  isBlank: boolean;    // True for joker/blank tiles
  assignedChar?: string; // For blank tiles: the letter chosen by the player
}

/** Types of bonus squares on the board */
export type BonusType =
  | 'NONE'
  | 'DOUBLE_LETTER'   // אות כפולה
  | 'TRIPLE_LETTER'   // אות משולשת
  | 'DOUBLE_WORD'     // מילה כפולה
  | 'TRIPLE_WORD'     // מילה משולשת
  | 'CENTER';         // משבצת מרכזית (also acts as DOUBLE_WORD on first turn)

/** Represents a single square on the 15x15 board */
export interface BoardSquare {
  row: number;
  col: number;
  bonus: BonusType;
  tile: Tile | null;   // Placed & committed tile (from previous turns)
}

/** A tile that has been placed on the board during the current turn (not yet committed) */
export interface PlacedTile {
  tile: Tile;
  row: number;
  col: number;
}

/** Player information */
export interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
  score: number;
  rack: Tile[];       // Current hand (up to 7 tiles)
  isAI: boolean;
  consecutivePasses: number;
  swapsRemaining: number;
}

/** Represents a word found on the board after a move */
export interface FormedWord {
  word: string;
  tiles: { tile: Tile; row: number; col: number; bonus: BonusType }[];
  score: number;
}

/** Result of validating and scoring a move */
export interface MoveResult {
  valid: boolean;
  words: FormedWord[];
  totalScore: number;
  errors: string[];
}

/** Possible game phases */
export type GamePhase = 'WAITING' | 'PLAYING' | 'GAME_OVER';

/** Turn phase within a player's turn */
export type TurnPhase = 'PLACING' | 'SUBMITTED';

/** Difficulty level for AI opponent */
export type AIDifficulty = 'EASY' | 'HARD';

/** The complete game state - single source of truth for the game */
export interface GameState {
  id: string;
  updatedAt: number;
  board: BoardSquare[][];
  players: Player[];
  currentPlayerIndex: number;
  tileBag: Tile[];
  phase: GamePhase;
  turnPhase: TurnPhase;
  placedTiles: PlacedTile[];     // Tiles placed during current turn (not yet committed)
  moveHistory: MoveHistoryEntry[];
  turnNumber: number;
  gameMode: 'PVE' | 'PVP';
  aiDifficulty: AIDifficulty;
  forfeitedBy?: string | null;
}

/** Entry in the move history log */
export interface MoveHistoryEntry {
  playerIndex: number;
  action: 'PLAY' | 'PASS' | 'SWAP';
  words?: FormedWord[];
  score: number;
  turnNumber: number;
  placedTiles?: PlacedTile[]; // Tiles newly placed in this turn
}

/** Game configuration loaded from JSON */
export interface GameConfig {
  game_settings: {
    board_size: number;
    tiles_per_player: number;
    bingo_bonus: number;
    total_tiles: number;
    use_final_letters: boolean;
    timer_enabled_by_default: boolean;
    tiles_distribution: TileDistribution[];
  };
}

/** Tile distribution entry from config */
export interface TileDistribution {
  char: string;
  count: number;
  points: number;
}

/** Game action types for the reducer */
export type GameAction =
  | { type: 'PLACE_TILE'; tile: Tile; row: number; col: number }
  | { type: 'REMOVE_PLACED_TILE'; row: number; col: number }
  | { type: 'SUBMIT_TURN'; moveResult: MoveResult }
  | { type: 'PASS_TURN' }
  | { type: 'SWAP_TILES'; tilesToSwap: Tile[]; newTiles: Tile[] }
  | { type: 'RECALL_TILES' }
  | { type: 'SHUFFLE_RACK' }
  | { type: 'AI_MOVE'; placedTiles: PlacedTile[]; moveResult: MoveResult }
  | { type: 'SET_BLANK_LETTER'; tileId: string; char: string }
  | { type: 'LOAD_GAME'; savedState: GameState }
  | { type: 'RESET_GAME'; config: GameConfig; aiDifficulty: AIDifficulty; gameMode?: 'PVE' | 'PVP'; gameId: string };
