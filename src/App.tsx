/**
 * Main Application Component for שבץ נא (Hebrew Scrabble)
 * Orchestrates all game UI: board, rack, controls, scoring, and game flow.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useGame } from './hooks/useGame';
import Board from './components/Board';
import Rack from './components/Rack';
import { TileBagTrackerModal } from './components/TileBagTrackerModal';
import { SettingsModal } from './components/SettingsModal';
import { DefinitionModal } from './components/DefinitionModal';
import { fetchDefinitions, WordDefinition } from './services/dictionaryService';
import { Tile, AIDifficulty, MoveResult } from './types';

/** Hebrew letters for blank tile assignment */
const HEBREW_LETTERS = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'];

type Screen = 'MENU' | 'GAME';

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

  const {
    state,
    placeTile,
    removePlacedTile,
    recallTiles,
    shuffleRack,
    submitTurn,
    swapTiles,
    resetGame,
    isCurrentPlayerHuman,
    currentMoveResult,
    isDictionaryReady,
  } = useGame('EASY');

  const currentPlayer = state.players[state.currentPlayerIndex];

  // Deselect tile when turn changes or game resets
  useEffect(() => {
    setSelectedTile(null);
  }, [state.currentPlayerIndex, state.phase]);
  const isAITurn = currentPlayer?.isAI;
  const humanPlayer = state.players[0];
  const aiPlayer = state.players[1];

  // Auto-clear messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const showMessage = useCallback((text: string, type: Message['type']) => {
    setMessage({ text, type });
  }, []);

  const handleStartGame = useCallback((difficulty: AIDifficulty) => {
    resetGame(difficulty);
    setScreen('GAME');
  }, [resetGame]);

  const handleTileSelect = useCallback((tile: Tile) => {
    setSelectedTile(prev => prev?.id === tile.id ? null : tile);
  }, []);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (!selectedTile) return;
    
    // If the tile is a blank/joker, prompt for letter assignment before placing
    if (selectedTile.isBlank && !selectedTile.assignedChar) {
      setBlankTileId(selectedTile.id);
      // Store the target position temporarily
      (window as any).__blankTarget = { row, col };
      return;
    }
    
    placeTile(selectedTile, row, col);
    setSelectedTile(null);
  }, [selectedTile, placeTile]);

  /** Handles blank tile letter assignment */
  const handleBlankAssign = useCallback((char: string) => {
    if (!blankTileId || !selectedTile) return;
    const assignedTile = { ...selectedTile, assignedChar: char };
    const target = (window as any).__blankTarget;
    if (target) {
      placeTile(assignedTile, target.row, target.col);
      delete (window as any).__blankTarget;
    }
    setBlankTileId(null);
    setSelectedTile(null);
  }, [blankTileId, selectedTile, placeTile]);

  const handlePlacedTileClick = useCallback((row: number, col: number) => {
    removePlacedTile(row, col);
    setSelectedTile(null);
  }, [removePlacedTile]);

  const handleSubmit = useCallback(() => {
    const result: MoveResult = submitTurn();
    if (result.valid) {
      showMessage(`+${result.totalScore} נקודות!`, 'success');
      setSelectedTile(null);
    } else {
      const errorMsg = result.errors.length > 0 ? result.errors.join('. ') : 'מהלך לא תקין';
      showMessage(errorMsg, 'error');
    }
  }, [submitTurn, showMessage]);

  const handleRecall = useCallback(() => {
    recallTiles();
    setSelectedTile(null);
  }, [recallTiles]);

  /** Toggle swap mode - player selects tiles to exchange */
  const handleSwapMode = useCallback(() => {
    if (swapMode) {
      // Execute swap
      if (tilesToSwap.size > 0) {
        const tiles = humanPlayer?.rack.filter(t => tilesToSwap.has(t.id)) || [];
        swapTiles(tiles);
        showMessage(`הוחלפו ${tiles.length} אריחים`, 'info');
      }
      setSwapMode(false);
      setTilesToSwap(new Set());
    } else {
      setSwapMode(true);
      setSelectedTile(null);
    }
  }, [swapMode, tilesToSwap, swapTiles, showMessage]);

  const handleSwapCancel = useCallback(() => {
    setSwapMode(false);
    setTilesToSwap(new Set());
  }, []);

  const handleSwapTileToggle = useCallback((tile: Tile) => {
    setTilesToSwap(prev => {
      const next = new Set(prev);
      if (next.has(tile.id)) next.delete(tile.id);
      else next.add(tile.id);
      return next;
    });
  }, []);

  const handleLongPress = useCallback(async (words: string[]) => {
    setIsLoadingDefinition(true);
    const defs = await fetchDefinitions(words);
    setIsLoadingDefinition(false);
    if (defs.length > 0) {
      setActiveDefinitions(defs);
    } else {
      showMessage(`לא נמצאה הגדרה עבור "${words[0]}"`, 'info');
    }
  }, [showMessage]);

  const handleNewGame = useCallback(() => {
    setScreen('MENU');
    setSelectedTile(null);
    setMessage(null);
  }, []);

  // (player derivations are defined above, near the hook)

  // ===== MENU SCREEN =====
  if (screen === 'MENU') {
    return (
      <div className="new-game-screen">
        <h1>שבץ נא</h1>
        <p className="subtitle">משחק מילים בעברית</p>
        <div className="difficulty-picker">
          <button
            className="difficulty-btn"
            onClick={() => handleStartGame('EASY')}
            id="btn-easy"
          >
            <div className="diff-label">😊 קל</div>
            <div className="diff-desc">למתחילים</div>
          </button>
          <button
            className="difficulty-btn"
            onClick={() => handleStartGame('HARD')}
            id="btn-hard"
          >
            <div className="diff-label">🧠 קשה</div>
            <div className="diff-desc">למומחים</div>
          </button>
        </div>
      </div>
    );
  }

  // ===== GAME SCREEN =====
  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  let lastMoveText = '';
  if (lastMove && lastMove.action === 'PLAY' && lastMove.words && lastMove.words.length > 0) {
    const playerStr = lastMove.playerIndex === 0 ? 'שיחקת' : 'המחשב שיחק';
    const mainWord = lastMove.words[0].word;
    lastMoveText = `${playerStr} את המילה "${mainWord}" עבור ${lastMove.score} נקודות`;
  }

  return (
    <div className="app">
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
            <span className="score-name">{humanPlayer?.name}</span>
            <span className="score-value">{humanPlayer?.score}</span>
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-lg)', margin: '0 var(--space-2)' }}>:</div>
          <div className={`player-score ${state.currentPlayerIndex === 1 ? 'player-score--active' : ''}`}>
            <span className="score-name">{aiPlayer?.name}</span>
            <span className="score-value">{aiPlayer?.score}</span>
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
          </div>

          <div className="rack-section">
            {/* Player Rack */}
        <Rack
          tiles={humanPlayer?.rack || []}
          selectedTileId={selectedTile?.id || null}
          onTileSelect={swapMode ? handleSwapTileToggle : handleTileSelect}
          disabled={isAITurn || state.phase === 'GAME_OVER'}
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
                disabled={state.placedTiles.length === 0 || isAITurn}
                id="btn-submit"
              >
                ✓ שלח מהלך
              </button>
              <button
                className="btn btn--secondary"
                onClick={handleRecall}
                disabled={state.placedTiles.length === 0 || isAITurn}
                id="btn-recall"
              >
                ↩ החזר אריחים
              </button>
              <button
                className="btn btn--secondary"
                onClick={shuffleRack}
                disabled={isAITurn}
                id="btn-shuffle"
              >
                🔀 ערבב
              </button>
              <button
                className="btn btn--secondary"
                onClick={handleSwapMode}
                disabled={isAITurn || state.tileBag.length === 0 || state.placedTiles.length > 0 || (humanPlayer?.swapsRemaining || 0) <= 0}
                id="btn-swap"
              >
                🔄 החלף ({humanPlayer?.swapsRemaining || 0}/3)
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
          onRestart={handleNewGame}
          onForfeit={() => {
            // Forfeit means setting score to 0 or just ending the game
            handleNewGame();
          }}
          onClose={() => setIsSettingsOpen(false)}
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
              {humanPlayer.score > aiPlayer.score
                ? '🎉 ניצחת!'
                : humanPlayer.score < aiPlayer.score
                ? '😔 הפסדת'
                : '🤝 תיקו!'}
            </h2>
            <div className="final-scores">
              <div className={`final-score ${humanPlayer.score >= aiPlayer.score ? 'winner' : ''}`}>
                <span className="final-score-label">{humanPlayer.name}</span>
                <span className="final-score-value">{humanPlayer.score}</span>
              </div>
              <div className={`final-score ${aiPlayer.score >= humanPlayer.score ? 'winner' : ''}`}>
                <span className="final-score-label">{aiPlayer.name}</span>
                <span className="final-score-value">{aiPlayer.score}</span>
              </div>
            </div>
            <button className="btn btn--accent" onClick={handleNewGame} id="btn-new-game">
              🔄 משחק חדש
            </button>
          </div>
        </div>
      )}
      {message && (
        <div className={`message-bar message-bar--${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default App;
