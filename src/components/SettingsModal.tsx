import React, { useState } from 'react';
import { ConfirmationModal } from './ConfirmationModal';
import { soundService } from '../services/soundService';
import '../styles/app.css';

interface SettingsModalProps {
  onRestart: () => void;
  onExitToMenu: () => void;
  onForfeit: () => void;
  onClose: () => void;
  isOnlineGame?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onRestart, onExitToMenu, onForfeit, onClose, isOnlineGame = false }) => {
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [isMuted, setIsMuted] = useState(soundService.getMute());

  return (
    <>
      <div className="game-over-overlay" onClick={onClose}>
        <div className="game-over-card" style={{ padding: 'var(--space-6)', maxWidth: '300px' }} onClick={e => e.stopPropagation()}>
          <h2 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-xl)' }}>הגדרות</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <button 
              className="btn btn--secondary" 
              style={{ width: '100%', padding: 'var(--space-3)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              onClick={() => {
                const newMute = !isMuted;
                setIsMuted(newMute);
                soundService.setMute(newMute);
                if (!newMute) {
                  soundService.playTilePlace();
                }
              }}
            >
              {isMuted ? "🔊 הפעל צלילים" : "🔇 השתק צלילים"}
            </button>
            
            {!isOnlineGame && (
              <button 
                className="btn btn--secondary" 
                style={{ width: '100%', padding: 'var(--space-3)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                onClick={() => {
                  setConfirmAction({
                    title: 'התחל מהתחלה',
                    message: 'האם אתה בטוח שברצונך לאתחל את המשחק הנוכחי?',
                    action: () => { onRestart(); onClose(); }
                  });
                }}
              >
                🔄 התחל מהתחלה
              </button>
            )}

            <button 
              className="btn btn--secondary" 
              style={{ width: '100%', padding: 'var(--space-3)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              onClick={() => {
                onExitToMenu();
                onClose();
              }}
            >
              🏠 חזרה לתפריט הראשי
            </button>
            
            <button 
              className="btn btn--danger" 
              style={{ width: '100%', padding: 'var(--space-3)', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--color-danger)', color: 'white' }}
              onClick={() => {
                setConfirmAction({
                  title: 'לפרוש מהמשחק',
                  message: 'האם אתה בטוח שברצונך לפרוש מהמשחק? המשחק הנוכחי יימחק לצמיתות.',
                  action: () => { onForfeit(); onClose(); }
                });
              }}
            >
              🏳️ לפרוש מהמשחק
            </button>
          </div>

          <div style={{ 
            marginTop: 'var(--space-5)', 
            paddingTop: 'var(--space-4)', 
            borderTop: '1px solid #e2e8f0', 
            fontSize: '11px', 
            color: '#718096',
            textAlign: 'center',
            lineHeight: '1.5',
            direction: 'rtl'
          }}>
            <div style={{ marginBottom: '4px' }}>
              רשימת המילים מבוססת על מילון <strong>Hspell</strong> החופשי (גרסה 1.4).
            </div>
            <div style={{ marginBottom: '8px' }}>
              קוד המשחק והמילון מופצים תחת רישיון <strong>GNU GPLv3</strong>.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <a 
                href="http://hspell.ivrix.org.il/" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: '#3182ce', textDecoration: 'underline' }}
              >
                אתר Hspell
              </a>
              <span style={{ color: '#cbd5e0' }}>|</span>
              <a 
                href="https://www.gnu.org/licenses/gpl-3.0.html" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: '#3182ce', textDecoration: 'underline' }}
              >
                רישיון GPLv3
              </a>
            </div>
          </div>

          <button 
            className="btn btn--primary" 
            style={{ marginTop: 'var(--space-4)', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} 
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
