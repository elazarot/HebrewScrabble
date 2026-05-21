/**
 * useGame Hook
 * Main game logic hook that wires up the reducer, validation, and AI.
 * Provides all game actions to UI components.
 */

import { useReducer, useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { GameState, GameAction, Tile, AIDifficulty, MoveResult } from '../types';
import { gameReducer, createInitialGameState } from '../engine/gameState';
import { validateAndScoreMove } from '../engine/scoreCalculator';

import { loadDictionary } from '../engine/wordValidator';
import { drawTiles } from '../engine/tileBag';
import gameConfig from '../assets/game-config.json';

interface UseGameReturn {
  state: GameState;
  placeTile: (tile: Tile, row: number, col: number) => void;
  removePlacedTile: (row: number, col: number) => void;
  recallTiles: () => void;
  shuffleRack: () => void;
  submitTurn: () => MoveResult;
  passTurn: () => void;
  swapTiles: (tiles: Tile[]) => void;
  resetGame: (difficulty: AIDifficulty) => void;
  isCurrentPlayerHuman: boolean;
  isAIThinking: boolean;
  lastMoveResult: MoveResult | null;
  currentMoveResult: MoveResult | null;
  isDictionaryReady: boolean;
}

export function useGame(initialDifficulty: AIDifficulty = 'EASY'): UseGameReturn {
  const [state, dispatch] = useReducer(
    gameReducer,
    createInitialGameState(gameConfig, initialDifficulty)
  );
  
  const [isDictionaryReady, setIsDictionaryReady] = useState(false);
  const isAIThinkingRef = useRef(false);
  const lastMoveResultRef = useRef<MoveResult | null>(null);
  
  // Load dictionary on mount and track readiness
  useEffect(() => {
    loadDictionary().then(() => {
      setIsDictionaryReady(true);
    });
  }, []);
  
  const isCurrentPlayerHuman = !state.players[state.currentPlayerIndex]?.isAI;
  
  // Trigger AI move when it's the AI's turn
  useEffect(() => {
    const currentPlayer = state.players[state.currentPlayerIndex];
    let worker: Worker | null = null;
    
    if (
      currentPlayer?.isAI &&
      state.phase === 'PLAYING' &&
      !isAIThinkingRef.current &&
      isDictionaryReady // Wait for dictionary!
    ) {
      isAIThinkingRef.current = true;
      
      const isFirstMove = state.moveHistory.filter(m => m.action === 'PLAY').length === 0;
      
      // Instantiate background Web Worker using Vite module workers syntax
      worker = new Worker(
        new URL('../engine/aiEngine.worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      worker.postMessage({
        board: state.board,
        rack: currentPlayer.rack,
        difficulty: state.aiDifficulty,
        isFirstMove
      });
      
      worker.onmessage = (e) => {
        const aiPlacedTiles = e.data;
        isAIThinkingRef.current = false;
        
        if (!aiPlacedTiles) {
          // AI passes
          dispatch({ type: 'PASS_TURN' });
          worker?.terminate();
          return;
        }
        
        const moveResult = validateAndScoreMove(
          state.board,
          aiPlacedTiles,
          isFirstMove
        );
        
        if (moveResult.valid) {
          dispatch({ type: 'AI_MOVE', placedTiles: aiPlacedTiles, moveResult });
        } else {
          // If AI's move is invalid, just pass
          dispatch({ type: 'PASS_TURN' });
        }
        
        worker?.terminate();
      };
    }
    
    // Clean up worker thread if the component unmounts or turn changes mid-calculation
    return () => {
      if (worker) {
        worker.terminate();
        isAIThinkingRef.current = false;
      }
    };
  }, [state.currentPlayerIndex, state.phase, isDictionaryReady]);
  
  const placeTile = useCallback((tile: Tile, row: number, col: number) => {
    // Don't allow placing if square already has a tile
    if (state.board[row][col].tile !== null) return;
    if (state.placedTiles.some(pt => pt.row === row && pt.col === col)) return;
    
    dispatch({ type: 'PLACE_TILE', tile, row, col });
  }, [state.board, state.placedTiles]);
  
  const removePlacedTile = useCallback((row: number, col: number) => {
    dispatch({ type: 'REMOVE_PLACED_TILE', row, col });
  }, []);
  
  const recallTiles = useCallback(() => {
    dispatch({ type: 'RECALL_TILES' });
  }, []);
  
  const shuffleRack = useCallback(() => {
    dispatch({ type: 'SHUFFLE_RACK' });
  }, []);
  
  const submitTurn = useCallback((): MoveResult => {
    const isFirstMove = state.moveHistory.filter(m => m.action === 'PLAY').length === 0;
    const moveResult = validateAndScoreMove(state.board, state.placedTiles, isFirstMove);
    
    lastMoveResultRef.current = moveResult;
    
    if (moveResult.valid) {
      dispatch({ type: 'SUBMIT_TURN', moveResult });
    }
    
    return moveResult;
  }, [state.board, state.placedTiles, state.moveHistory]);
  
  const passTurn = useCallback(() => {
    dispatch({ type: 'PASS_TURN' });
  }, []);
  
  const swapTiles = useCallback((tiles: Tile[]) => {
    if (state.tileBag.length < tiles.length) return;
    
    const { drawn, remaining } = drawTiles(state.tileBag, tiles.length);
    dispatch({ type: 'SWAP_TILES', tilesToSwap: tiles, newTiles: drawn });
  }, [state.tileBag]);
  
  const resetGame = useCallback((difficulty: AIDifficulty) => {
    isAIThinkingRef.current = false;
    lastMoveResultRef.current = null;
    dispatch({ type: 'RESET_GAME', config: gameConfig, aiDifficulty: difficulty });
  }, []);
  
  const currentMoveResult = useMemo(() => {
    if (state.placedTiles.length === 0) return null;
    const isFirstMove = state.moveHistory.filter(m => m.action === 'PLAY').length === 0;
    return validateAndScoreMove(state.board, state.placedTiles, isFirstMove);
  }, [state.board, state.placedTiles, state.moveHistory]);

  return {
    state,
    placeTile,
    removePlacedTile,
    recallTiles,
    shuffleRack,
    submitTurn,
    passTurn,
    swapTiles,
    resetGame,
    isCurrentPlayerHuman,
    isAIThinking: isAIThinkingRef.current,
    lastMoveResult: lastMoveResultRef.current,
    currentMoveResult,
    isDictionaryReady
  };
}
