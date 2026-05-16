import React, { useMemo } from 'react';
import { GameState } from '../types';
import gameConfig from '../assets/game-config.json';
import '../styles/app.css';

interface TileBagTrackerModalProps {
  state: GameState;
  onClose: () => void;
}

export const TileBagTrackerModal: React.FC<TileBagTrackerModalProps> = ({ state, onClose }) => {
  const stats = useMemo(() => {
    const distribution = gameConfig.game_settings.tiles_distribution;
    const totals = new Map<string, number>();
    const remaining = new Map<string, number>();
    
    // Initialize with 0
    distribution.forEach(d => {
      const char = d.char === 'blank' ? '★' : d.char;
      totals.set(char, d.count);
      remaining.set(char, 0);
    });

    // Count remaining in bag
    state.tileBag.forEach(t => {
      const char = t.isBlank ? '★' : t.char;
      remaining.set(char, (remaining.get(char) || 0) + 1);
    });

    // Prepare array for rendering
    return distribution.map(d => {
      const char = d.char === 'blank' ? '★' : d.char;
      return {
        char,
        total: totals.get(char) || 0,
        remaining: remaining.get(char) || 0,
      };
    }).sort((a, b) => b.total - a.total); // Sort by total frequency
  }, [state.tileBag]);

  return (
    <div className="game-over-overlay" onClick={onClose}>
      <div className="game-over-card" style={{ padding: 'var(--space-4)', maxWidth: '90vw', width: '380px', maxHeight: '90vh', overflowY: 'hidden' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: 'var(--space-1)', fontSize: 'var(--text-xl)' }}>שק אריחים</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
          אריחים נותרים בשק: <strong>{state.tileBag.length}</strong>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--space-1)' }}>
          {stats.map(stat => (
            <div key={stat.char} style={{ 
              background: 'var(--color-bg-tertiary)', 
              padding: 'var(--space-1)', 
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: stat.remaining === 0 ? '1px solid hsla(0, 60%, 45%, 0.3)' : '1px solid hsla(40, 20%, 40%, 0.2)',
              opacity: stat.remaining === 0 ? 0.35 : 1
            }}>
              <span style={{ fontSize: 'var(--text-md)', fontWeight: 'bold', fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
                {stat.char}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                {stat.remaining}/{stat.total}
              </span>
            </div>
          ))}
        </div>

        <button className="btn btn--primary" style={{ marginTop: 'var(--space-4)', width: '100%', padding: 'var(--space-2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={onClose}>
          סגור
        </button>
      </div>
    </div>
  );
};
