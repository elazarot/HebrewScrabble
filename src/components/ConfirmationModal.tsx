import React from 'react';
import '../styles/app.css';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel }) => {
  return (
    <div className="game-over-overlay" style={{ zIndex: 300 }}>
      <div className="game-over-card" style={{ padding: 'var(--space-6)', maxWidth: '320px' }}>
        <h2 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-xl)' }}>{title}</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
          {message}
        </p>
        
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button 
            className="btn btn--danger" 
            style={{ flex: 1, padding: 'var(--space-2)', justifyContent: 'center', background: 'var(--color-danger)', color: 'white' }}
            onClick={onConfirm}
          >
            אישור
          </button>
          <button 
            className="btn btn--secondary" 
            style={{ flex: 1, padding: 'var(--space-2)', justifyContent: 'center' }}
            onClick={onCancel}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};
