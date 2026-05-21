/**
 * Board Component
 * Renders the 15x15 game board with bonus squares and placed tiles.
 * Convention §5: Snap-to-grid via grid layout, RTL default.
 */

import React, { useCallback, useMemo } from 'react';
import { BoardSquare, PlacedTile, Tile, MoveResult } from '../types';
import { getBonusAbbr } from '../engine/boardLogic';

interface BoardProps {
  board: BoardSquare[][];
  placedTiles: PlacedTile[];
  selectedTile: Tile | null;
  onSquareClick: (row: number, col: number) => void;
  onPlacedTileClick: (row: number, col: number) => void;
  onLongPress?: (words: string[]) => void;
  currentMoveResult?: MoveResult | null;
  lastPlayedTiles?: PlacedTile[];
}

const bonusClassMap: Record<string, string> = {
  NONE: 'square--none',
  DOUBLE_LETTER: 'square--dl',
  TRIPLE_LETTER: 'square--tl',
  DOUBLE_WORD: 'square--dw',
  TRIPLE_WORD: 'square--tw',
  CENTER: 'square--center',
};

const Board: React.FC<BoardProps> = ({
  board,
  placedTiles,
  selectedTile,
  onSquareClick,
  onPlacedTileClick,
  onLongPress,
  currentMoveResult = null,
  lastPlayedTiles = [],
}) => {
  const placedMap = new Map(
    placedTiles.map(pt => [`${pt.row},${pt.col}`, pt.tile])
  );
  
  const lastPlayedMap = useMemo(() => new Map(
    lastPlayedTiles.map(pt => [`${pt.row},${pt.col}`, true])
  ), [lastPlayedTiles]);

  const validWordTilesMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (currentMoveResult?.valid) {
      currentMoveResult.words.forEach(fw => {
        fw.tiles.forEach(t => map.set(`${t.row},${t.col}`, true));
      });
    }
    return map;
  }, [currentMoveResult]);

  const [longPressTimer, setLongPressTimer] = React.useState<ReturnType<typeof setTimeout> | null>(null);

  const findWordAt = useCallback((row: number, col: number) => {
    // Check horizontal
    const hTiles: { col: number; char: string }[] = [];
    let c = col;
    while (c >= 0 && (board[row][c].tile || placedMap.get(`${row},${c}`))) {
      const t = board[row][c].tile || placedMap.get(`${row},${c}`);
      const char = (t?.isBlank ? t.assignedChar : t?.char) || '';
      hTiles.push({ col: c, char });
      c--;
    }
    c = col + 1;
    while (c < 15 && (board[row][c].tile || placedMap.get(`${row},${c}`))) {
      const t = board[row][c].tile || placedMap.get(`${row},${c}`);
      const char = (t?.isBlank ? t.assignedChar : t?.char) || '';
      hTiles.push({ col: c, char });
      c++;
    }

    // Check vertical
    const vTiles: { row: number; char: string }[] = [];
    let r = row;
    while (r >= 0 && (board[r][col].tile || placedMap.get(`${r},${col}`))) {
      const t = board[r][col].tile || placedMap.get(`${r},${col}`);
      const char = (t?.isBlank ? t.assignedChar : t?.char) || '';
      vTiles.push({ row: r, char });
      r--;
    }
    r = row + 1;
    while (r < 15 && (board[r][col].tile || placedMap.get(`${r},${col}`))) {
      const t = board[r][col].tile || placedMap.get(`${r},${col}`);
      const char = (t?.isBlank ? t.assignedChar : t?.char) || '';
      vTiles.push({ row: r, char });
      r++;
    }

    const words = [];
    if (hTiles.length >= 2) {
      const hWord = hTiles.sort((a, b) => b.col - a.col).map(t => t.char).join('');
      words.push(hWord);
    }
    if (vTiles.length >= 2) {
      const vWord = vTiles.sort((a, b) => a.row - b.row).map(t => t.char).join('');
      words.push(vWord);
    }
    
    return words;
  }, [board, placedMap]);

  const renderSquare = useCallback(
    (sq: BoardSquare) => {
      const key = `${sq.row},${sq.col}`;
      const placedTile = placedMap.get(key);
      const hasTile = sq.tile !== null || placedTile !== undefined;
      const bonusClass = bonusClassMap[sq.bonus] || 'square--none';

      const handleClick = () => {
        if (placedTile) {
          onPlacedTileClick(sq.row, sq.col);
        } else if (!sq.tile && selectedTile) {
          onSquareClick(sq.row, sq.col);
        }
      };

      const isPartOfValidWord = validWordTilesMap.has(key);

      const handleStart = () => {
        if (!hasTile) return;
        const timer = setTimeout(() => {
          const words = findWordAt(sq.row, sq.col);
          if (words.length > 0 && onLongPress) {
            onLongPress(words);
          }
        }, 600);
        setLongPressTimer(timer);
      };

      const handleEnd = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          setLongPressTimer(null);
        }
      };

      return (
        <div
          key={key}
          className={`square ${bonusClass} ${hasTile ? 'square--has-tile' : ''} ${
            selectedTile && !hasTile ? 'square--drop-target' : ''
          }`}
          onClick={handleClick}
        >
          {sq.tile ? (
            <div 
              className={`board-tile board-tile--committed ${lastPlayedMap.has(key) ? 'board-tile--last-played' : ''} ${isPartOfValidWord ? 'board-tile--valid-placement' : ''}`}
              onMouseDown={handleStart}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchEnd={handleEnd}
            >
              <span className="tile-char">
                {sq.tile.isBlank ? sq.tile.assignedChar || '★' : sq.tile.char}
              </span>
              {sq.tile.points > 0 && (
                <span className="tile-points">{sq.tile.points}</span>
              )}
            </div>
          ) : placedTile ? (
            <div
              className={`board-tile board-tile--placed ${isPartOfValidWord ? 'board-tile--valid-placement' : ''}`}
              onClick={(e) => { e.stopPropagation(); handleClick(); }}
              onMouseDown={handleStart}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchEnd={handleEnd}
            >
               <span className="tile-char">
                {placedTile.isBlank ? placedTile.assignedChar || '★' : placedTile.char}
              </span>
              {placedTile.points > 0 && (
                <span className="tile-points">{placedTile.points}</span>
              )}
            </div>
          ) : (
            <span>{getBonusAbbr(sq.bonus)}</span>
          )}
        </div>
      );
    },
    [placedMap, selectedTile, onSquareClick, onPlacedTileClick, lastPlayedMap, validWordTilesMap, findWordAt, onLongPress, longPressTimer]
  );

  const scoreBadgePosition = useMemo(() => {
    if (!currentMoveResult?.valid || placedTiles.length === 0 || currentMoveResult.words.length === 0) return null;
    
    const primaryWord = currentMoveResult.words[0];
    let maxRow = -1;
    let minCol = 15;
    
    // Position badge relative to the last tile of the primary word
    primaryWord.tiles.forEach(t => {
      if (t.row > maxRow) maxRow = t.row;
      if (t.col < minCol) minCol = t.col;
    });
    
    if (maxRow === -1) return null;
    return { row: maxRow, col: minCol };
  }, [placedTiles, currentMoveResult]);

  return (
    <div className="board-container">
      <div className="board" id="game-board">
        {board.flat().map(sq => renderSquare(sq))}
        
        {scoreBadgePosition && (
          <div 
            className="score-preview-badge"
            style={{
              top: `calc((${scoreBadgePosition.row} + 1) * (var(--square-size) + var(--board-gap)) - 8px)`,
              left: `clamp(2px, calc(${scoreBadgePosition.col} * (var(--square-size) + var(--board-gap)) - 8px), 100%)`,
            }}
          >
            {currentMoveResult?.totalScore}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Board);
