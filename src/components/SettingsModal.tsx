import React, { useState } from 'react';
import { ConfirmationModal } from './ConfirmationModal';
import '../styles/app.css';

interface SettingsModalProps {
  onRestart: () => void;
  onForfeit: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onRestart, onForfeit, onClose }) => {
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; action: () => void } | null>(null);

  return (
    <>
      <div className="game-over-overlay" onClick={onClose}>
        <div className="game-over-card" style={{ padding: 'var(--space-6)', maxWidth: '300px' }} onClick={e => e.stopPropagation()}>
          <h2 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-xl)' }}>הגדרות</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <button 
              className="btn btn--secondary" 
              style={{ width: '100%', padding: 'var(--space-3)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              onClick={() => {
                setConfirmAction({
                  title: 'התחל מהתחלה',
                  message: 'האם אתה בטוח שברצונך להתחיל מהתחלה?',
                  action: () => { onRestart(); onClose(); }
                });
              }}
            >
              🔄 התחל מהתחלה
            </button>
            
            <button 
              className="btn btn--danger" 
              style={{ width: '100%', padding: 'var(--space-3)', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--color-danger)', color: 'white' }}
              onClick={() => {
                setConfirmAction({
                  title: 'לפרוש מהמשחק',
                  message: 'האם אתה בטוח שברצונך לפרוש מהמשחק?',
                  action: () => { onForfeit(); onClose(); }
                });
              }}
            >
              🏳️ לפרוש מהמשחק
            </button>
          </div>

          <button 
            className="btn btn--primary" 
            style={{ marginTop: 'var(--space-6)', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} 
            onClick={onClose}
          >
            סגור
          </button>
        </div>
      </div>

      {confirmAction && (
        <ConfirmationModal
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmAction.action}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
};
