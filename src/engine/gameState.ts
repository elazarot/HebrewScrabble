/**
 * Game State Reducer
 * Central state management for the Hebrew Scrabble game.
 * Implements all game actions as pure reducer functions.
 * Convention §2: No Firestore writes from state transitions - only on turn complete.
 */

import {
  GameState,
  GameAction,
  GameConfig,
  PlacedTile,
  AIDifficulty,
  MoveResult,
} from '../types';
import { createEmptyBoard } from './boardLogic';
import { createTileBag, drawTiles, shuffleTiles } from './tileBag';

/**
 * Creates the initial game state from configuration.
 * Sets up the board, tile bag, and draws initial hands for both players.
 */
export function createInitialGameState(
  config: GameConfig,
  aiDifficulty: AIDifficulty = 'EASY',
  gameMode: 'PVE' | 'PVP' = 'PVE',
  gameId: string = `game_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
): GameState {
  const board = createEmptyBoard(config.game_settings.board_size);
  let tileBag = createTileBag(config);
  
  // Draw tiles for player 1 (human)
  const draw1 = drawTiles(tileBag, config.game_settings.tiles_per_player);
  tileBag = draw1.remaining;
  
  // Draw tiles for player 2 (AI or human)
  const draw2 = drawTiles(tileBag, config.game_settings.tiles_per_player);
  tileBag = draw2.remaining;
  
  const isPVP = gameMode === 'PVP';
  
  return {
    id: gameId,
    updatedAt: Date.now(),
    board,
    players: [
      {
        id: 'player-1',
        name: isPVP ? 'שחקן 1' : 'שחקן',
        score: 0,
        rack: draw1.drawn,
        isAI: false,
        consecutivePasses: 0,
        swapsRemaining: 3,
      },
      {
        id: isPVP ? 'player-2' : 'ai-player',
        name: isPVP ? 'שחקן 2' : 'מחשב',
        score: 0,
        rack: draw2.drawn,
        isAI: !isPVP,
        consecutivePasses: 0,
        swapsRemaining: 3,
      },
    ],
    currentPlayerIndex: 0,
    tileBag,
    phase: 'PLAYING',
    turnPhase: 'PLACING',
    placedTiles: [],
    moveHistory: [],
    turnNumber: 1,
    gameMode,
    aiDifficulty,
  };
}

/**
 * Main game reducer - handles all state transitions.
 * Pure function: no side effects, no API calls.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  let newState = state;
  switch (action.type) {
    case 'PLACE_TILE':
      newState = handlePlaceTile(state, action.tile, action.row, action.col);
      break;
    
    case 'REMOVE_PLACED_TILE':
      newState = handleRemovePlacedTile(state, action.row, action.col);
      break;
    
    case 'RECALL_TILES':
      newState = handleRecallTiles(state);
      break;
    
    case 'SHUFFLE_RACK':
      newState = handleShuffleRack(state);
      break;
    
    case 'SUBMIT_TURN':
      newState = handleSubmitTurn(state, action.moveResult);
      break;
    
    case 'PASS_TURN':
      newState = handlePassTurn(state);
      break;
    
    case 'SWAP_TILES':
      newState = handleSwapTiles(state, action.tilesToSwap, action.newTiles);
      break;
    
    case 'AI_MOVE':
      newState = handleAIMove(state, action.placedTiles, action.moveResult);
      break;
    
    case 'SET_BLANK_LETTER':
      newState = handleSetBlankLetter(state, action.tileId, action.char);
      break;
    
    case 'LOAD_GAME':
      newState = {
        ...action.savedState,
        moveHistory: action.savedState.moveHistory || [],
        gameMode: action.savedState.gameMode || 'PVE',
        placedTiles: action.savedState.placedTiles || [],
        turnPhase: action.savedState.turnPhase || 'PLACING'
      };
      break;
    
    case 'RESET_GAME':
      newState = createInitialGameState(action.config, action.aiDifficulty, action.gameMode || 'PVE', action.gameId);
      break;
    
    default:
      return state;
  }

  // Automatically update the updatedAt timestamp whenever the state changes (and it's not a LOAD_GAME which already has a valid timestamp)
  if (newState !== state && action.type !== 'LOAD_GAME') {
    newState = { ...newState, updatedAt: Date.now() };
  }

  return newState;
}

/** Places a tile from the player's rack onto the board */
function handlePlaceTile(state: GameState, tile: typeof state.placedTiles[0]['tile'], row: number, col: number): GameState {
  const player = state.players[state.currentPlayerIndex];
  
  // Safety check: Verify the tile actually exists in the player's rack
  const tileExists = player.rack.some(t => t.id === tile.id);
  if (!tileExists) {
    console.error("נסיון להניח אריח שלא קיים במאגר:", tile.char);
    return state;
  }

  // Remove tile from rack
  const newRack = player.rack.filter(t => t.id !== tile.id);
  
  // Add to placed tiles
  const newPlacedTiles: PlacedTile[] = [...state.placedTiles, { tile, row, col }];
  
  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, rack: newRack } : p
  );
  
  return {
    ...state,
    players: newPlayers,
    placedTiles: newPlacedTiles,
    turnPhase: 'PLACING',
  };
}

/** Removes a placed tile from the board back to the player's rack */
function handleRemovePlacedTile(state: GameState, row: number, col: number): GameState {
  const placedTile = state.placedTiles.find(pt => pt.row === row && pt.col === col);
  if (!placedTile) return state;
  
  const player = state.players[state.currentPlayerIndex];
  const resetTile = placedTile.tile.isBlank ? { ...placedTile.tile, assignedChar: undefined } : placedTile.tile;
  const newRack = [...player.rack, resetTile];
  const newPlacedTiles = state.placedTiles.filter(pt => !(pt.row === row && pt.col === col));
  
  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, rack: newRack } : p
  );
  
  return {
    ...state,
    players: newPlayers,
    placedTiles: newPlacedTiles,
  };
}

/** Returns all placed tiles back to the rack */
function handleRecallTiles(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  const returnedTiles = state.placedTiles.map(pt => pt.tile.isBlank ? { ...pt.tile, assignedChar: undefined } : pt.tile);
  const newRack = [...player.rack, ...returnedTiles];
  
  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, rack: newRack } : p
  );
  
  return {
    ...state,
    players: newPlayers,
    placedTiles: [],
  };
}

/** Shuffles the current player's rack */
function handleShuffleRack(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  const newRack = shuffleTiles(player.rack);
  
  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, rack: newRack } : p
  );
  
  return { ...state, players: newPlayers };
}

/** Commits the current move: places tiles on board, draws new tiles, advances turn */
function handleSubmitTurn(state: GameState, moveResult: MoveResult): GameState {
  // Commit placed tiles to the board
  const newBoard = state.board.map(row => row.map(sq => ({ ...sq })));
  for (const pt of state.placedTiles) {
    newBoard[pt.row][pt.col] = {
      ...newBoard[pt.row][pt.col],
      tile: pt.tile,
    };
  }
  
  // Draw new tiles to refill to 7
  const player = state.players[state.currentPlayerIndex];
  const currentRackSize = player.rack.length; // Already filtered in previous steps
  const tilesNeeded = Math.max(0, 7 - currentRackSize); 
  const { drawn, remaining } = drawTiles(state.tileBag, tilesNeeded);
  
  // Update player score and rack
  const newPlayers = state.players.map((p, i) => {
    if (i === state.currentPlayerIndex) {
      return {
        ...p,
        score: p.score + moveResult.totalScore,
        rack: [...p.rack, ...drawn],
        consecutivePasses: 0,
      };
    }
    return p;
  });
  
  // Check for game over
  const currentPlayer = newPlayers[state.currentPlayerIndex];
  const isGameOver = currentPlayer.rack.length === 0 && remaining.length === 0;
  
  // Record move history
  const historyEntry = {
    playerIndex: state.currentPlayerIndex,
    action: 'PLAY' as const,
    words: moveResult.words,
    score: moveResult.totalScore,
    turnNumber: state.turnNumber,
    placedTiles: state.placedTiles,
  };
  
  return {
    ...state,
    board: newBoard,
    players: newPlayers,
    tileBag: remaining,
    placedTiles: [],
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
    turnPhase: 'PLACING',
    phase: isGameOver ? 'GAME_OVER' : 'PLAYING',
    moveHistory: [...state.moveHistory, historyEntry],
    turnNumber: state.turnNumber + 1,
  };
}

/** Player passes their turn */
function handlePassTurn(state: GameState): GameState {
  const newPlayers = state.players.map((p, i) => {
    if (i === state.currentPlayerIndex) {
      return { ...p, consecutivePasses: p.consecutivePasses + 1 };
    }
    return p;
  });
  
  // Game ends if all players pass consecutively
  const allPassed = newPlayers.every(p => p.consecutivePasses >= 2);
  
  const historyEntry = {
    playerIndex: state.currentPlayerIndex,
    action: 'PASS' as const,
    score: 0,
    turnNumber: state.turnNumber,
  };
  
  // Recall any placed tiles first
  const player = newPlayers[state.currentPlayerIndex];
  const returnedTiles = state.placedTiles.map(pt => pt.tile.isBlank ? { ...pt.tile, assignedChar: undefined } : pt.tile);
  if (returnedTiles.length > 0) {
    newPlayers[state.currentPlayerIndex] = {
      ...player,
      rack: [...player.rack, ...returnedTiles],
    };
  }
  
  return {
    ...state,
    players: newPlayers,
    placedTiles: [],
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
    turnPhase: 'PLACING',
    phase: allPassed ? 'GAME_OVER' : 'PLAYING',
    moveHistory: [...state.moveHistory, historyEntry],
    turnNumber: state.turnNumber + 1,
  };
}

/** Swaps selected tiles for new ones from the bag */
function handleSwapTiles(state: GameState, tilesToSwap: typeof state.players[0]['rack'], newTiles: typeof state.players[0]['rack']): GameState {
  const player = state.players[state.currentPlayerIndex];
  const remainingRack = player.rack.filter(t => !tilesToSwap.some(s => s.id === t.id));
  const newRack = [...remainingRack, ...newTiles];
  
  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, rack: newRack, consecutivePasses: 0, swapsRemaining: p.swapsRemaining - tilesToSwap.length } : p
  );
  
  // Return swapped tiles to bag
  const newBag = shuffleTiles([...state.tileBag, ...tilesToSwap]);
  
  // Recall any placed tiles
  const returnedTiles = state.placedTiles.map(pt => pt.tile.isBlank ? { ...pt.tile, assignedChar: undefined } : pt.tile);
  if (returnedTiles.length > 0) {
    newPlayers[state.currentPlayerIndex] = {
      ...newPlayers[state.currentPlayerIndex],
      rack: [...newPlayers[state.currentPlayerIndex].rack, ...returnedTiles],
    };
  }
  
  const historyEntry = {
    playerIndex: state.currentPlayerIndex,
    action: 'SWAP' as const,
    score: 0,
    turnNumber: state.turnNumber,
  };
  
  return {
    ...state,
    players: newPlayers,
    tileBag: newBag,
    placedTiles: [],
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
    turnPhase: 'PLACING',
    moveHistory: [...state.moveHistory, historyEntry],
    turnNumber: state.turnNumber + 1,
  };
}

/** Handles AI move - same as submit but for the AI player */
function handleAIMove(state: GameState, placedTiles: PlacedTile[], moveResult: MoveResult): GameState {
  // First place the tiles
  let newState = state;
  for (const pt of placedTiles) {
    newState = handlePlaceTile(newState, pt.tile, pt.row, pt.col);
  }
  
  // Then submit
  return handleSubmitTurn(
    { ...newState, placedTiles },
    moveResult
  );
}

/** Sets the letter assignment for a blank/joker tile */
function handleSetBlankLetter(state: GameState, tileId: string, char: string): GameState {
  const newPlacedTiles = state.placedTiles.map(pt => {
    if (pt.tile.id === tileId) {
      return { ...pt, tile: { ...pt.tile, assignedChar: char } };
    }
    return pt;
  });
  
  return { ...state, placedTiles: newPlacedTiles };
}
