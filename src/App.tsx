/**
 * Main Application Component for שבץ נא (Hebrew Scrabble)
 * Orchestrates all game UI: board, rack, controls, scoring, and game flow.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGame } from './hooks/useGame';
import Board from './components/Board';
import Rack from './components/Rack';
import { TileBagTrackerModal } from './components/TileBagTrackerModal';
import { SettingsModal } from './components/SettingsModal';
import { DefinitionModal } from './components/DefinitionModal';
import { HomeScreen } from './components/HomeScreen';
import { soundService } from './services/soundService';
import { fetchDefinitions, WordDefinition } from './services/dictionaryService';
import { Tile, AIDifficulty, MoveResult, GameState } from './types';
import { 
  signInPlayer, 
  generateLobbyCode, 
  createOnlineMatch, 
  joinOnlineMatch, 
  submitOnlineTurn, 
  listenToMatch, 
  listenToPublicLobbies, 
  convertFirestoreMatchToGameState,
  db
} from './services/firebaseService';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { createInitialGameState, gameReducer } from './engine/gameState';
import { drawTiles } from './engine/tileBag';
import gameConfig from './assets/game-config.json';

/** Hebrew letters for blank tile assignment */
const HEBREW_LETTERS = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'];

type Screen = 'MENU' | 'LOBBY' | 'GAME';

interface Message {
  text: string;
  type: 'error' | 'success' | 'info';
}

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('MENU');
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeDefinitions, setActiveDefinitions] = useState<WordDefinition[]>([]);
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [tilesToSwap, setTilesToSwap] = useState<Set<string>>(new Set());
  const [blankTileId, setBlankTileId] = useState<string | null>(null);
  const [savedGamesList, setSavedGamesList] = useState<GameState[]>([]);

  // Firebase Online PvP states
  const [myUid, setMyUid] = useState<string>('');
  const [lobbyCode, setLobbyCode] = useState<string | null>(null);
  const [isLobbyHost, setIsLobbyHost] = useState(false);
  const [publicLobbies, setPublicLobbies] = useState<any[]>([]);
  const [activeNotification, setActiveNotification] = useState<{
    lobbyCode: string;
    opponentName: string;
    lastMove: any;
    gameState: GameState;
  } | null>(null);

  // References for background listener cleanups
  const activePvpListenersRef = useRef<Record<string, () => void>>({});
  const lobbyListenerRef = useRef<(() => void) | null>(null);
  const notificationTimerRef = useRef<any | null>(null);

  const {
    state,
    placeTile,
    removePlacedTile,
    recallTiles,
    shuffleRack,
    submitTurn,
    swapTiles,
    resetGame,
    loadGame,
    isCurrentPlayerHuman,
    currentMoveResult,
    isDictionaryReady,
  } = useGame('EASY');

  // Load and refresh saved games list from localStorage
  const refreshSavedGames = useCallback(() => {
    try {
      const saved = localStorage.getItem('scrabble_saved_games');
      if (saved) {
        const parsed: Record<string, GameState> = JSON.parse(saved);
        const list = Object.values(parsed).filter(
          (g) => g && g.phase === 'PLAYING' && g.id && (g.moveHistory?.length > 0 || g.turnNumber > 1)
        );
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        setSavedGamesList(list);
      } else {
        setSavedGamesList([]);
      }
    } catch (e) {
      console.error("Error loading saved games list:", e);
      setSavedGamesList([]);
    }
  }, []);

  // Update list on mount and whenever game state changes
  useEffect(() => {
    refreshSavedGames();
  }, [state, refreshSavedGames]);

  const handleResumeGame = useCallback((game: GameState) => {
    loadGame(game);
    soundService.playSuccess();
    setScreen('GAME');
  }, [loadGame]);

  const handleDeleteGame = useCallback((gameId: string) => {
    try {
      const saved = localStorage.getItem('scrabble_saved_games');
      if (saved) {
        const parsed: Record<string, GameState> = JSON.parse(saved);
        delete parsed[gameId];
        localStorage.setItem('scrabble_saved_games', JSON.stringify(parsed));
        soundService.playTileRecall();
        refreshSavedGames();
      }
    } catch (e) {
      console.error("Error deleting game:", e);
    }
  }, [refreshSavedGames]);

  const showMessage = useCallback((text: string, type: Message['type']) => {
    setMessage({ text, type });
  }, []);

  // 1. Firebase Anonymous Auth Sign-In on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await signInPlayer();
        setMyUid(user.uid);
      } catch (error) {
        console.warn("Firebase Auth failed, falling back to local guest UID:", error);
        let localUid = localStorage.getItem('scrabble_local_uid');
        if (!localUid) {
          localUid = `guest_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('scrabble_local_uid', localUid);
        }
        setMyUid(localUid);
      }
    };
    initAuth();
  }, []);

  // 2. Real-time listener for open public lobbies
  useEffect(() => {
    try {
      const unsubscribe = listenToPublicLobbies((lobbies) => {
        setPublicLobbies(lobbies);
      });
      return () => unsubscribe();
    } catch (error) {
      console.warn("Could not subscribe to public lobbies board:", error);
    }
  }, []);

  // 3. Active LOBBY listener for hosts waiting for Player 2
  useEffect(() => {
    if (screen === 'LOBBY' && lobbyCode && myUid) {
      soundService.playTilePlace();
      
      const unsubscribe = listenToMatch(lobbyCode, (matchData) => {
        if (matchData && matchData.status === 'PLAYING' && matchData.players[1] && matchData.players[1].uid) {
          soundService.playSuccess();
          const activeGameState = convertFirestoreMatchToGameState(matchData, myUid);
          loadGame(activeGameState);
          setScreen('GAME');
          setLobbyCode(null);
        }
      });
      
      lobbyListenerRef.current = unsubscribe;
      return () => {
        if (lobbyListenerRef.current) {
          lobbyListenerRef.current();
          lobbyListenerRef.current = null;
        }
      };
    }
  }, [screen, lobbyCode, myUid, loadGame]);

  // 4. Background listener for ALL other active online PvP games to show turn notifications
  useEffect(() => {
    if (!myUid) return;
    
    const otherOnlineGames = savedGamesList.filter(
      g => g.gameMode === 'PVP' && g.id?.length === 6 && g.id !== state.id
    );
    
    // Clean up outdated listeners
    const activeKeys = Object.keys(activePvpListenersRef.current);
    for (const key of activeKeys) {
      if (!otherOnlineGames.some(g => g.id === key)) {
        activePvpListenersRef.current[key]();
        delete activePvpListenersRef.current[key];
      }
    }
    
    // Add new background listeners
    for (const game of otherOnlineGames) {
      if (!activePvpListenersRef.current[game.id]) {
        try {
          const unsubscribe = listenToMatch(game.id, (matchData) => {
            if (!matchData) return;
            
            const incomingState = convertFirestoreMatchToGameState(matchData, myUid);
            
            const savedGames = localStorage.getItem('scrabble_saved_games');
            if (savedGames) {
              const parsed: Record<string, GameState> = JSON.parse(savedGames);
              const localSavedGame = parsed[game.id];
              
              if (localSavedGame && incomingState.turnNumber > localSavedGame.turnNumber) {
                // Opponent made a turn!
                parsed[game.id] = incomingState;
                localStorage.setItem('scrabble_saved_games', JSON.stringify(parsed));
                refreshSavedGames();
                
                // If it is now the user's turn
                const localPlayerIndex = matchData.players[1].uid === myUid ? 1 : 0;
                if (incomingState.currentPlayerIndex === localPlayerIndex && incomingState.phase === 'PLAYING') {
                  soundService.playSuccess();
                  
                  const opponentName = localPlayerIndex === 0 ? matchData.players[1].name : matchData.players[0].name;
                  
                  setActiveNotification({
                    lobbyCode: game.id,
                    opponentName,
                    lastMove: matchData.lastMove,
                    gameState: incomingState
                  });
                  
                  if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
                  notificationTimerRef.current = setTimeout(() => {
                    setActiveNotification(null);
                  }, 3000); // Auto-dismiss after exactly 3 seconds
                }
              }
            }
          });
          activePvpListenersRef.current[game.id] = unsubscribe;
        } catch (err) {
          console.warn(`Error setting background listener for game ${game.id}:`, err);
        }
      }
    }
  }, [savedGamesList, state.id, myUid, refreshSavedGames]);

  // 5. Active GAME Sync Listener - listens to Firestore while actively playing an online PvP game
  const isOnlineGame = state.gameMode === 'PVP' && state.id?.length === 6;
  useEffect(() => {
    if (screen === 'GAME' && isOnlineGame && myUid) {
      const unsubscribe = listenToMatch(state.id, (matchData) => {
        if (!matchData) return;
        const incomingState = convertFirestoreMatchToGameState(matchData, myUid);
        
        // Only load if turn progressed or game ended
        if (incomingState.turnNumber !== state.turnNumber) {
          loadGame(incomingState);
          
          const localPlayerIndex = incomingState.players[1]?.id === myUid ? 1 : 0;
          if (incomingState.currentPlayerIndex === localPlayerIndex && incomingState.phase === 'PLAYING') {
            soundService.playSuccess();
            showMessage("תורך הגיע!", "success");
          }
        } else if (incomingState.phase === 'GAME_OVER' && state.phase !== 'GAME_OVER') {
          loadGame(incomingState);
        } else {
          // Sync minor changes safely
          const hasPlacedTiles = state.placedTiles.length > 0;
          if (!hasPlacedTiles && JSON.stringify(incomingState.board) !== JSON.stringify(state.board)) {
            loadGame(incomingState);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [screen, isOnlineGame, state.id, state.turnNumber, state.phase, myUid, loadGame, showMessage]);

  // Clean up all hooks on unmount
  useEffect(() => {
    return () => {
      Object.values(activePvpListenersRef.current).forEach(unsub => unsub());
      if (lobbyListenerRef.current) lobbyListenerRef.current();
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, []);

  // Online-First local player selectors
  const localPlayerIndex = (state.gameMode === 'PVP' && state.players[1]?.id === myUid) ? 1 : 0;
  const opponentPlayerIndex = localPlayerIndex === 0 ? 1 : 0;
  
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isMyTurn = state.phase === 'PLAYING' && state.currentPlayerIndex === localPlayerIndex;
  const isAITurn = !isOnlineGame && currentPlayer?.isAI;

  const localPlayer = state.players[localPlayerIndex];
  const opponentPlayer = state.players[opponentPlayerIndex];

  // Deselect tile when turn changes or game resets
  useEffect(() => {
    setSelectedTile(null);
  }, [state.currentPlayerIndex, state.phase]);

  // Auto-clear messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Trigger sound when move history changes (represents a successful play by AI or second player)
  const lastMoveHistoryLengthRef = useRef(state.moveHistory?.length || 0);
  useEffect(() => {
    const moveHistoryLength = state.moveHistory?.length || 0;
    if (moveHistoryLength > lastMoveHistoryLengthRef.current) {
      const lastMove = state.moveHistory?.[moveHistoryLength - 1];
      // Only play AI/Second Player sound if it's not the active local player's manual click triggering it
      if (lastMove && lastMove.playerIndex !== localPlayerIndex) {
        if (lastMove.action === 'PLAY') {
          soundService.playSuccess();
        } else if (lastMove.action === 'PASS' || lastMove.action === 'SWAP') {
          soundService.playTileRecall();
        }
      }
      lastMoveHistoryLengthRef.current = moveHistoryLength;
    }
  }, [state.moveHistory, localPlayerIndex]);

  const handleStartGame = useCallback((difficulty: AIDifficulty, gameMode: 'PVE' | 'PVP' = 'PVE') => {
    resetGame(difficulty, gameMode);
    setScreen('GAME');
  }, [resetGame]);

  const handleTileSelect = useCallback((tile: Tile) => {
    if (isOnlineGame && !isMyTurn) return;
    soundService.playTilePlace();
    setSelectedTile(prev => prev?.id === tile.id ? null : tile);
  }, [isOnlineGame, isMyTurn]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (isOnlineGame && !isMyTurn) return;
    if (!selectedTile) return;
    
    // If the tile is a blank/joker, prompt for letter assignment before placing
    if (selectedTile.isBlank && !selectedTile.assignedChar) {
      soundService.playTilePlace();
      setBlankTileId(selectedTile.id);
      // Store the target position temporarily
      (window as any).__blankTarget = { row, col };
      return;
    }
    
    soundService.playTilePlace();
    placeTile(selectedTile, row, col);
    setSelectedTile(null);
  }, [selectedTile, placeTile, isOnlineGame, isMyTurn]);

  /** Handles blank tile letter assignment */
  const handleBlankAssign = useCallback((char: string) => {
    if (isOnlineGame && !isMyTurn) return;
    if (!blankTileId || !selectedTile) return;
    const assignedTile = { ...selectedTile, assignedChar: char };
    const target = (window as any).__blankTarget;
    if (target) {
      soundService.playTilePlace();
      placeTile(assignedTile, target.row, target.col);
      delete (window as any).__blankTarget;
    }
    setBlankTileId(null);
    setSelectedTile(null);
  }, [blankTileId, selectedTile, placeTile, isOnlineGame, isMyTurn]);

  const handlePlacedTileClick = useCallback((row: number, col: number) => {
    if (isOnlineGame && !isMyTurn) return;
    soundService.playTilePlace();
    removePlacedTile(row, col);
    setSelectedTile(null);
  }, [removePlacedTile, isOnlineGame, isMyTurn]);

  const handleSubmit = useCallback(async () => {
    const result: MoveResult = submitTurn();
    if (result.valid) {
      soundService.playSuccess();
      showMessage(`+${result.totalScore} נקודות!`, 'success');
      setSelectedTile(null);

      if (isOnlineGame) {
        try {
          const nextState = gameReducer(state, { type: 'SUBMIT_TURN', moveResult: result });
          await submitOnlineTurn(state.id, nextState, 'PLAY', result, myUid, nextState.players[localPlayerIndex].rack);
        } catch (e) {
          console.error("Error syncing online turn submit:", e);
          showMessage("שגיאה בסנכרון המהלך ברשת.", "error");
        }
      }
    } else {
      soundService.playError();
      const errorMsg = result.errors.length > 0 ? result.errors.join('. ') : 'מהלך לא תקין';
      showMessage(errorMsg, 'error');
    }
  }, [submitTurn, showMessage, isOnlineGame, state, myUid, localPlayerIndex]);

  const handleRecall = useCallback(() => {
    soundService.playTileRecall();
    recallTiles();
    setSelectedTile(null);
  }, [recallTiles]);

  /** Toggle swap mode - player selects tiles to exchange */
  const handleSwapMode = useCallback(async () => {
    if (swapMode) {
      // Execute swap
      if (tilesToSwap.size > 0) {
        const tiles = localPlayer?.rack.filter(t => tilesToSwap.has(t.id)) || [];
        swapTiles(tiles);
        soundService.playSuccess();
        showMessage(`הוחלפו ${tiles.length} אריחים`, 'info');

        if (isOnlineGame) {
          try {
            // Replicate draw
            const { drawn } = drawTiles(state.tileBag, tiles.length);
            const nextState = gameReducer(state, { type: 'SWAP_TILES', tilesToSwap: tiles, newTiles: drawn });
            await submitOnlineTurn(state.id, nextState, 'SWAP', null, myUid, nextState.players[localPlayerIndex].rack);
          } catch (e) {
            console.error("Error syncing online tiles swap:", e);
          }
        }
      }
      setSwapMode(false);
      setTilesToSwap(new Set());
    } else {
      soundService.playTilePlace();
      setSwapMode(true);
      setSelectedTile(null);
    }
  }, [swapMode, tilesToSwap, swapTiles, showMessage, localPlayer?.rack, isOnlineGame, state, myUid, localPlayerIndex]);

  const handleSwapCancel = useCallback(() => {
    soundService.playTileRecall();
    setSwapMode(false);
    setTilesToSwap(new Set());
  }, []);

  const handleSwapTileToggle = useCallback((tile: Tile) => {
    soundService.playTilePlace();
    setTilesToSwap(prev => {
      const next = new Set(prev);
      if (next.has(tile.id)) {
        next.delete(tile.id);
      } else {
        const remainingLimit = localPlayer?.swapsRemaining || 0;
        if (next.size >= remainingLimit) {
          soundService.playError();
          showMessage(`נשארו לך רק ${remainingLimit} אריחים להחלפה סך הכל!`, 'error');
          return prev;
        }
        next.add(tile.id);
      }
      return next;
    });
  }, [localPlayer?.swapsRemaining, showMessage]);

  const handleLongPress = useCallback(async (words: string[]) => {
    // Block dictionary lookup while the player is actively placing unconfirmed tiles
    if (state.currentPlayerIndex === localPlayerIndex && state.placedTiles.length > 0) {
      showMessage('לא ניתן לחפש במילון כאשר יש אריחים לא מאושרים על הלוח!', 'error');
      return;
    }

    setIsLoadingDefinition(true);

    // Create a 10-second timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 10000)
    );

    try {
      // Race the fetch call against the 10-second timeout
      const defs = await Promise.race([
        fetchDefinitions(words),
        timeoutPromise
      ]);

      setIsLoadingDefinition(false);
      if (defs.length > 0) {
        setActiveDefinitions(defs);
      } else {
        showMessage(`לא נמצאה הגדרה עבור "${words[0]}"`, 'info');
      }
    } catch (error) {
      setIsLoadingDefinition(false);
      showMessage('שגיאת חיבור: לא ניתן היה לטעון את המילון (חיבור אינטרנט חלש)', 'error');
    }
  }, [state.currentPlayerIndex, localPlayerIndex, state.placedTiles.length, showMessage]);

  const handleNewGame = useCallback(() => {
    soundService.playTileRecall();
    setScreen('MENU');
    setSelectedTile(null);
    setMessage(null);
  }, []);

  const handleRestartGame = useCallback(() => {
    resetGame(state.aiDifficulty, state.gameMode, state.id);
    showMessage('המשחק אותחל מחדש!', 'success');
  }, [resetGame, state.aiDifficulty, state.gameMode, state.id, showMessage]);

  const handleExitToMenu = useCallback(() => {
    soundService.playTileRecall();
    setScreen('MENU');
    setSelectedTile(null);
    setMessage(null);
  }, []);

  const handleForfeitGame = useCallback(async () => {
    // If it's an online game, update Firestore match to GAME_OVER status
    if (isOnlineGame) {
      try {
        const matchRef = doc(db, 'matches', state.id);
        await updateDoc(matchRef, {
          status: 'GAME_OVER',
          updatedAt: Timestamp.now()
        });
      } catch (e) {
        console.error("Error forfeiting online game:", e);
      }
    }

    // Delete the game from localStorage
    try {
      const saved = localStorage.getItem('scrabble_saved_games');
      if (saved) {
        const parsed: Record<string, GameState> = JSON.parse(saved);
        delete parsed[state.id];
        localStorage.setItem('scrabble_saved_games', JSON.stringify(parsed));
      }
    } catch (e) {
      console.error("Error deleting game on forfeit:", e);
    }

    // Reset the internal hook state to a clean blank game to avoid resurrection
    resetGame('EASY', 'PVE');

    // Instantly refresh the menu's saved games list
    refreshSavedGames();

    soundService.playTileRecall();
    setScreen('MENU');
    setSelectedTile(null);
    setMessage(null);
    showMessage('פרשת מהמשחק!', 'info');
  }, [state.id, isOnlineGame, resetGame, refreshSavedGames, showMessage]);

  // PvP Multiplayer Create/Join Callbacks
  const handleCreateOnlineRoom = useCallback(async (isPublic: boolean, name: string) => {
    try {
      const code = generateLobbyCode();
      soundService.playSuccess();
      
      resetGame('EASY', 'PVP', code);
      
      const initialPvpState = createInitialGameState(gameConfig, 'EASY', 'PVP', code);
      initialPvpState.players[0].name = name;
      initialPvpState.players[0].id = myUid;
      
      await createOnlineMatch(code, code, isPublic, name, myUid, initialPvpState);
      
      setLobbyCode(code);
      setIsLobbyHost(true);
      setScreen('LOBBY');
    } catch (error) {
      console.error("Error creating online match:", error);
      showMessage("שגיאה בפתיחת החדר. אנא נסה שנית.", "error");
    }
  }, [myUid, resetGame, showMessage]);

  const handleJoinOnlineRoom = useCallback(async (code: string, name: string) => {
    try {
      soundService.playSuccess();
      showMessage("מתחבר לחדר...", "info");
      
      const guestRack = await joinOnlineMatch(code, name, myUid);
      
      const matchRef = doc(db, 'matches', code);
      const matchSnap = await getDoc(matchRef);
      if (matchSnap.exists()) {
        const matchData = matchSnap.data();
        const activeGameState = convertFirestoreMatchToGameState(matchData, myUid);
        
        loadGame(activeGameState);
        setScreen('GAME');
        showMessage("הצטרפת בהצלחה!", "success");
      }
    } catch (error: any) {
      console.error("Error joining online match:", error);
      soundService.playError();
      showMessage(error.message || "קוד חדר לא תקין או שהחדר סגור.", "error");
    }
  }, [myUid, loadGame, showMessage]);

  const handleJoinPublicLobby = useCallback(async (lobby: any) => {
    const name = localStorage.getItem('scrabble_player_name') || 'שחקן';
    await handleJoinOnlineRoom(lobby.id, name);
  }, [handleJoinOnlineRoom]);

  // (player derivations are defined above, near the hook)

  // ===== MENU SCREEN =====
  if (screen === 'MENU') {
    return (
      <HomeScreen 
        onStartGame={handleStartGame} 
        savedGames={savedGamesList}
        onResumeGame={handleResumeGame}
        onDeleteGame={handleDeleteGame}
        publicLobbies={publicLobbies}
        onCreateOnlineRoom={handleCreateOnlineRoom}
        onJoinOnlineRoom={handleJoinOnlineRoom}
        onJoinPublicLobby={handleJoinPublicLobby}
      />
    );
  }

  // Notification banner click transition
  const handleNotificationClick = useCallback(() => {
    if (!activeNotification) return;
    soundService.playSuccess();
    loadGame(activeNotification.gameState);
    setActiveNotification(null);
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    setScreen('GAME');
  }, [activeNotification, loadGame]);

  // ===== LOBBY SCREEN =====
  if (screen === 'LOBBY') {
    return (
      <div className="new-game-screen glass" style={{ 
        background: 'radial-gradient(circle, hsl(45, 25%, 92%) 0%, hsl(45, 20%, 85%) 100%)',
        padding: 'var(--space-6) var(--space-4)',
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ 
          maxWidth: '440px', 
          width: '100%', 
          background: 'white', 
          border: '1.5px solid hsla(45, 20%, 50%, 0.15)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6) var(--space-5)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-5)',
          textAlign: 'center',
          direction: 'rtl'
        }}>
          <h2 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: 'var(--text-xl)', 
            color: 'var(--color-accent)', 
            margin: 0
          }}>
            ממתין לשחקן נוסף... ⏳
          </h2>
          
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', margin: 0, lineHeight: 1.6 }}>
            שתף את קוד החדר הבא עם החבר שלך כדי שיוכל להצטרף אליך:
          </p>

          <div style={{
            background: 'var(--color-bg-secondary)',
            border: '2px dashed var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4) var(--space-6)',
            fontSize: '36px',
            fontWeight: 'bold',
            fontFamily: 'var(--font-display)',
            letterSpacing: '6px',
            color: 'var(--color-text-primary)',
            userSelect: 'all',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
            textTransform: 'uppercase'
          }}>
            {lobbyCode}
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(lobbyCode || '');
              soundService.playSuccess();
              showMessage("הקוד הועתק ללוח!", "success");
            }}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-accent)',
              color: 'white',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s'
            }}
          >
            📋 העתק קוד
          </button>

          <div style={{ width: '100%', height: '1.5px', background: 'hsla(45, 20%, 50%, 0.1)' }} />

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
            חדר זה יפורסם אוטומטית ברשת אם בחרת בחדר ציבורי.
          </p>

          <button
            onClick={async () => {
              soundService.playTileRecall();
              if (lobbyCode) {
                try {
                  const matchRef = doc(db, 'matches', lobbyCode);
                  await updateDoc(matchRef, { status: 'GAME_OVER', updatedAt: Timestamp.now() });
                } catch (e) {
                  console.error("Error canceling lobby:", e);
                }
              }
              setLobbyCode(null);
              setScreen('MENU');
            }}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              background: 'none',
              border: '1.5px solid hsla(0, 0%, 0%, 0.1)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            ✕ ביטול וחזרה לתפריט
          </button>
        </div>
      </div>
    );
  }

  // ===== GAME SCREEN =====
  const lastMove = (state.moveHistory && state.moveHistory.length > 0) ? state.moveHistory[state.moveHistory.length - 1] : null;
  let lastMoveText = '';
  if (lastMove && lastMove.action === 'PLAY' && lastMove.words && lastMove.words.length > 0) {
    const isLocalPlayerMove = lastMove.playerIndex === localPlayerIndex;
    const playerStr = isLocalPlayerMove ? 'שיחקת' : `היריב (${state.players[opponentPlayerIndex]?.name}) שיחק`;
    const mainWord = lastMove.words[0].word;
    lastMoveText = `${playerStr} את המילה "${mainWord}" עבור ${lastMove.score} נקודות`;
  } else if (lastMove && lastMove.action === 'PASS') {
    const isLocalPlayerMove = lastMove.playerIndex === localPlayerIndex;
    const playerStr = isLocalPlayerMove ? 'דילגת על התור' : `היריב (${state.players[opponentPlayerIndex]?.name}) דילג על התור`;
    lastMoveText = `${playerStr}`;
  } else if (lastMove && lastMove.action === 'SWAP') {
    const isLocalPlayerMove = lastMove.playerIndex === localPlayerIndex;
    const playerStr = isLocalPlayerMove ? 'החלפת אריחים' : `היריב (${state.players[opponentPlayerIndex]?.name}) החליף אריחים`;
    lastMoveText = `${playerStr}`;
  }

  return (
    <div className="app">
      {/* Active Turn Dropdown Notification (disappears in exactly 3 seconds) */}
      {activeNotification && (
        <div 
          onClick={handleNotificationClick}
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            width: '90%',
            maxWidth: '440px',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '2px solid var(--color-success)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15), inset 0 2px 2px white',
            padding: 'var(--space-3) var(--space-4)',
            cursor: 'pointer',
            direction: 'rtl',
            textAlign: 'right',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'notificationSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '24px' }}>🔔</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: 'var(--text-sm)', color: 'var(--color-success)' }}>
              תורך הגיע במשחק רשת!
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              {activeNotification.lastMove && activeNotification.lastMove.action === 'PLAY' ? (
                <span>היריב <strong>{activeNotification.opponentName}</strong> שיחק את המילה "{activeNotification.lastMove.words[0]}" ל-{activeNotification.lastMove.score} נקודות.</span>
              ) : activeNotification.lastMove && activeNotification.lastMove.action === 'PASS' ? (
                <span>היריב <strong>{activeNotification.opponentName}</strong> דילג על התור שלו.</span>
              ) : activeNotification.lastMove && activeNotification.lastMove.action === 'SWAP' ? (
                <span>היריב <strong>{activeNotification.opponentName}</strong> החליף אריחים.</span>
              ) : (
                <span>היריב <strong>{activeNotification.opponentName}</strong> ביצע מהלך.</span>
              )}
            </div>
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontWeight: 'bold' }}>כנס למשחק ←</span>
        </div>
      )}

      {/* Header with scores */}
      <header className="app-header" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        <div className="header-settings">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            style={{
              background: 'none', border: '1px solid var(--color-text-muted)', color: 'var(--color-text-muted)',
              width: '36px', height: '36px', borderRadius: 'var(--radius-round)', cursor: 'pointer', fontSize: 'var(--text-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            ⚙️
          </button>
        </div>

        <div className="header-scores" style={{ justifySelf: 'center' }}>
          <div className={`player-score ${state.currentPlayerIndex === 0 ? 'player-score--active' : ''}`}>
            <span className="score-name">{state.players[0]?.name}</span>
            <span className="score-value">{state.players[0]?.score}</span>
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-lg)', margin: '0 var(--space-2)' }}>:</div>
          <div className={`player-score ${state.currentPlayerIndex === 1 ? 'player-score--active' : ''}`}>
            <span className="score-name">{state.players[1]?.name}</span>
            <span className="score-value">{state.players[1]?.score}</span>
          </div>
        </div>

        <div className="header-info" style={{ justifySelf: 'end' }}>
          <button 
            onClick={() => setIsTrackerOpen(true)}
            style={{
              background: 'none', border: '1px solid var(--color-accent)', color: 'var(--color-accent)',
              padding: '4px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            🎒 {state.tileBag.length}
          </button>
        </div>
      </header>

      <div style={{ height: '30px', position: 'relative' }}>
        {lastMoveText && (
          <div className="last-move-announcement" style={{ 
            textAlign: 'center', color: 'var(--color-primary)', fontSize: 'var(--text-sm)', 
            fontWeight: 'bold', padding: 'var(--space-1)', width: '100%', position: 'absolute', top: 0
          }}>
            {lastMoveText}
          </div>
        )}
      </div>

      {/* Main game area */}
      <main className="game-main">
        <div className="game-layout">
          <div className="board-section">
            {/* AI thinking indicator */}
            {isAITurn && state.phase === 'PLAYING' && (
              <div className="ai-thinking">
                <span>🤖 המחשב חושב</span>
                <div className="ai-thinking-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            {/* Online PvP Turn waiting indicator */}
            {isOnlineGame && !isMyTurn && state.phase === 'PLAYING' && (
              <div className="ai-thinking" style={{ border: '1px solid var(--color-success)' }}>
                <span>⏳ ממתין למהלך של {opponentPlayer?.name}...</span>
              </div>
            )}

            <Board
              board={state.board}
              placedTiles={state.placedTiles}
              selectedTile={selectedTile}
              onSquareClick={handleSquareClick}
              onPlacedTileClick={handlePlacedTileClick}
              onLongPress={handleLongPress}
              currentMoveResult={currentMoveResult}
              lastPlayedTiles={lastMove?.placedTiles}
            />
            {/* Message Bar centered over board */}
            {message && (
              <div className={`message-bar message-bar--${message.type}`} style={{ 
                position: 'absolute', 
                bottom: '40px', 
                left: '50%', 
                transform: 'translateX(-50%)',
                zIndex: 9999,
                width: 'auto',
                minWidth: '280px'
              }}>
                {message.text}
              </div>
            )}
          </div>

          <div className="rack-section">
            {/* Player Rack */}
        <Rack
          tiles={localPlayer?.rack || []}
          selectedTileId={selectedTile?.id || null}
          onTileSelect={swapMode ? handleSwapTileToggle : handleTileSelect}
          disabled={!isMyTurn || state.phase === 'GAME_OVER'}
          swapMode={swapMode}
          tilesToSwap={tilesToSwap}
        />

        {/* Game Controls */}
        <div className="controls">
          {!swapMode ? (
            <>
              <button
                className="btn btn--primary"
                onClick={handleSubmit}
                disabled={state.placedTiles.length === 0 || !isMyTurn}
                id="btn-submit"
              >
                ✓ שלח מהלך
              </button>
              <button
                className="btn btn--secondary"
                onClick={handleRecall}
                disabled={state.placedTiles.length === 0 || !isMyTurn}
                id="btn-recall"
              >
                ↩ החזר אריחים
              </button>
              <button
                className="btn btn--secondary"
                onClick={() => { soundService.playShuffle(); shuffleRack(); }}
                disabled={!isMyTurn}
                id="btn-shuffle"
              >
                🔀 ערבב
              </button>
              <button
                className="btn btn--secondary"
                onClick={handleSwapMode}
                disabled={!isMyTurn || state.tileBag.length === 0 || state.placedTiles.length > 0 || (localPlayer?.swapsRemaining || 0) <= 0}
                id="btn-swap"
              >
                🔄 החלף אריחים (נותרו: {localPlayer?.swapsRemaining || 0})
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn--accent"
                onClick={handleSwapMode}
                disabled={tilesToSwap.size === 0}
                id="btn-swap-confirm"
              >
                ✓ אשר החלפה ({tilesToSwap.size})
              </button>
              <button
                className="btn btn--secondary"
                onClick={handleSwapCancel}
                id="btn-swap-cancel"
              >
                ✕ ביטול
              </button>
            </>
          )}
        </div>
          </div>
        </div>

        {/* Blank tile letter picker modal */}
        {blankTileId && (
          <div className="game-over-overlay" onClick={() => setBlankTileId(null)}>
            <div className="game-over-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
              <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>בחר אות לג׳וקר</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', justifyContent: 'center' }}>
                {HEBREW_LETTERS.map(letter => (
                  <button
                    key={letter}
                    className="btn btn--secondary"
                    style={{ width: 44, height: 44, fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', padding: 0, justifyContent: 'center' }}
                    onClick={() => handleBlankAssign(letter)}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {isTrackerOpen && (
        <TileBagTrackerModal
          state={state}
          onClose={() => setIsTrackerOpen(false)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          onRestart={handleRestartGame}
          onExitToMenu={handleExitToMenu}
          onForfeit={handleForfeitGame}
          onClose={() => setIsSettingsOpen(false)}
          isOnlineGame={isOnlineGame}
        />
      )}

      {activeDefinitions.length > 0 && (
        <DefinitionModal
          definitions={activeDefinitions}
          onClose={() => setActiveDefinitions([])}
        />
      )}

      {isLoadingDefinition && (
        <div className="game-over-overlay" style={{ background: 'rgba(0,0,0,0.3)', zIndex: 500 }}>
          <div className="ai-thinking">
            טוען הגדרה...
          </div>
        </div>
      )}


      {/* Game Over Overlay */}
      {state.phase === 'GAME_OVER' && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>
              {localPlayer?.score > opponentPlayer?.score
                ? '🎉 ניצחת!'
                : localPlayer?.score < opponentPlayer?.score
                ? '😔 הפסדת'
                : '🤝 תיקו!'}
            </h2>
            <div className="final-scores">
              <div className={`final-score ${localPlayer?.score >= opponentPlayer?.score ? 'winner' : ''}`}>
                <span className="final-score-label">{localPlayer?.name}</span>
                <span className="final-score-value">{localPlayer?.score}</span>
              </div>
              <div className={`final-score ${opponentPlayer?.score >= localPlayer?.score ? 'winner' : ''}`}>
                <span className="final-score-label">{opponentPlayer?.name}</span>
                <span className="final-score-value">{opponentPlayer?.score}</span>
              </div>
            </div>
            <button className="btn btn--accent" onClick={handleNewGame} id="btn-new-game">
              🔄 משחק חדש
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
