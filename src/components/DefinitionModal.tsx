import React from 'react';
import { WordDefinition } from '../services/dictionaryService';

interface DefinitionModalProps {
  definitions: WordDefinition[];
  onClose: () => void;
}

const SOURCES = [
  { name: 'מילוג', getUrl: (word: string) => `https://milog.co.il/${encodeURIComponent(word)}` },
  { name: 'אבניאון', getUrl: (word: string) => `https://www.milononline.net/do_search.php?Q=${encodeURIComponent(word)}` },
  { name: 'האקדמיה ללשון', getUrl: (word: string) => `https://hebrew-academy.org.il/?s=${encodeURIComponent(word)}` }
];

export const DefinitionModal: React.FC<DefinitionModalProps> = ({ definitions, onClose }) => {
  const [currentWordIndex, setCurrentWordIndex] = React.useState(0);
  const currentWord = definitions[currentWordIndex];
  
  // Track the current URL being shown for the current word
  const [currentUrl, setCurrentUrl] = React.useState(currentWord?.sourceUrl || '');
  const [currentSourceName, setCurrentSourceName] = React.useState(currentWord?.sourceName || 'מילוג');

  // Reset URL when changing words (e.g. for overlapping words)
  React.useEffect(() => {
    if (currentWord) {
      setCurrentUrl(currentWord.sourceUrl);
      setCurrentSourceName(currentWord.sourceName);
    }
  }, [currentWordIndex, currentWord]);

  if (!currentWord) return null;

  return (
    <div className="game-over-overlay" onClick={onClose} style={{ zIndex: 400 }}>
      <div className="game-over-card" style={{ padding: 'var(--space-4)', maxWidth: '420px', width: '92vw', height: '85vh', textAlign: 'right', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--color-accent)', margin: 0 }}>
             פירוש: {currentWord.word}
          </h2>
          {definitions.length > 1 && (
            <span style={{ fontSize: 'var(--text-xs)', background: 'var(--color-accent)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>
              {currentWordIndex + 1} / {definitions.length}
            </span>
          )}
        </div>

        {/* Source Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          {SOURCES.map(source => (
            <button
              key={source.name}
              onClick={() => {
                setCurrentUrl(source.getUrl(currentWord.word));
                setCurrentSourceName(source.name);
              }}
              style={{
                flex: 1,
                padding: '6px 2px',
                fontSize: 'var(--text-xs)',
                borderRadius: '4px 4px 0 0',
                border: 'none',
                background: currentSourceName === source.name ? 'var(--color-accent)' : '#eee',
                color: currentSourceName === source.name ? 'white' : '#666',
                cursor: 'pointer',
                fontWeight: currentSourceName === source.name ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {source.name}
            </button>
          ))}
        </div>
        
        <div style={{ 
          flex: 1,
          background: 'white', 
          borderRadius: '0 0 var(--radius-md) var(--radius-md)',
          marginBottom: 'var(--space-4)',
          overflow: 'hidden',
          border: '1px solid hsla(0,0%,0%,0.1)',
          position: 'relative'
        }}>
          <iframe 
            src={currentUrl} 
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={`מילון ${currentSourceName}`}
          />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {definitions.length > 1 && (
            <button 
              className="btn btn--secondary" 
              style={{ width: '100%', justifyContent: 'center', padding: 'var(--space-2)' }}
              onClick={() => setCurrentWordIndex((currentWordIndex + 1) % definitions.length)}
            >
              🔄 מילה הבאה בהצלבה
            </button>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button 
              className="btn btn--secondary" 
              style={{ flex: 1, justifyContent: 'center', padding: 'var(--space-2)', fontSize: 'var(--text-xs)' }}
              onClick={() => window.open(currentUrl, '_blank')}
            >
              🌐 פתח בדפדפן
            </button>
            
            <button 
              className="btn btn--primary" 
              style={{ flex: 1, justifyContent: 'center', padding: 'var(--space-2)' }} 
              onClick={onClose}
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
