/**
 * Rack Component
 * Displays the player's hand of tiles.
 * Supports normal selection mode and swap mode.
 */

import React from 'react';
import { Tile } from '../types';

interface RackProps {
  tiles: Tile[];
  selectedTileId: string | null;
  onTileSelect: (tile: Tile) => void;
  disabled: boolean;
  swapMode?: boolean;
  tilesToSwap?: Set<string>;
}

const Rack: React.FC<RackProps> = ({
  tiles,
  selectedTileId,
  onTileSelect,
  disabled,
  swapMode = false,
  tilesToSwap = new Set(),
}) => {
  return (
    <div className="rack-container">
      {swapMode && (
        <div style={{
          color: 'var(--color-warning)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          marginBottom: 'var(--space-1)',
        }}>
          בחר אריחים להחלפה
        </div>
      )}
      <div className="rack">
        {tiles.map((tile) => {
          const isSwapSelected = swapMode && tilesToSwap.has(tile.id);
          const isSelected = !swapMode && selectedTileId === tile.id;

          return (
            <div
              key={tile.id}
              className={`tile ${tile.isBlank ? 'tile--blank' : ''} ${
                isSelected ? 'tile--selected' : ''
              } ${isSwapSelected ? 'tile--swap-selected' : ''}`}
              onClick={() => !disabled && onTileSelect(tile)}
              style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              <span className="tile-char">
                {tile.isBlank ? tile.assignedChar || '★' : tile.char}
              </span>
              {tile.points > 0 && <span className="tile-points">{tile.points}</span>}
            </div>
          );
        })}
        {/* Empty slots for visual consistency */}
        {Array.from({ length: Math.max(0, 7 - tiles.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="tile" style={{ opacity: 0.1, cursor: 'default' }}>
            <span className="tile-char"></span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(Rack);
