import React, { useState } from 'react';
import { AIDifficulty, GameState } from '../types';
import { soundService } from '../services/soundService';
import { ConfirmationModal } from './ConfirmationModal';

interface HomeScreenProps {
  onStartGame: (difficulty: AIDifficulty, gameMode: 'PVE' | 'PVP') => void;
  savedGames?: GameState[];
  onResumeGame?: (game: GameState) => void;
  onDeleteGame?: (gameId: string) => void;
  publicLobbies?: any[];
  onCreateOnlineRoom?: (isPublic: boolean, name: string) => void;
  onJoinOnlineRoom?: (code: string, name: string) => void;
  onJoinPublicLobby?: (lobby: any) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ 
  onStartGame,
  savedGames = [],
  onResumeGame,
  onDeleteGame,
  publicLobbies = [],
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onJoinPublicLobby
}) => {
  const [showPVEModal, setShowPVEModal] = useState(false);
  const [isMuted, setIsMuted] = useState(soundService.getMute());
  const [deleteGameId, setDeleteGameId] = useState<string | null>(null);
  
  const [showOnlineDashboard, setShowOnlineDashboard] = useState(false);
  const [playerName, setPlayerName] = useState(localStorage.getItem('scrabble_player_name') || 'שחקן');
  const [isRoomPublic, setIsRoomPublic] = useState(true);
  const [joinRoomCode, setJoinRoomCode] = useState('');

  const handleCreateRoom = () => {
    soundService.playSuccess();
    localStorage.setItem('scrabble_player_name', playerName);
    onCreateOnlineRoom && onCreateOnlineRoom(isRoomPublic, playerName);
  };

  const handleJoinRoom = () => {
    if (joinRoomCode.trim().length !== 6) {
      soundService.playError();
      alert('נא להזין קוד תקין בן 6 אותיות!');
      return;
    }
    soundService.playSuccess();
    localStorage.setItem('scrabble_player_name', playerName);
    onJoinOnlineRoom && onJoinOnlineRoom(joinRoomCode.toUpperCase().trim(), playerName);
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundService.setMute(newMuted);
    if (!newMuted) {
      soundService.playTilePlace();
    }
  };

  const selectGameMode = (mode: 'PVE' | 'PVP', difficulty: AIDifficulty = 'EASY') => {
    soundService.playSuccess();
    onStartGame(difficulty, mode);
  };

  const handleButtonClick = () => {
    soundService.playTilePlace();
  };

  if (showOnlineDashboard) {
    return (
      <div className="new-game-screen glass" style={{ 
        background: 'radial-gradient(circle, hsl(45, 25%, 92%) 0%, hsl(45, 20%, 85%) 100%)',
        padding: 'var(--space-6) var(--space-4)',
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        position: 'relative',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {/* Top left return link */}
        <div style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)', zIndex: 10 }}>
          <button 
            onClick={() => { soundService.playTileRecall(); setShowOnlineDashboard(false); }}
            style={{
              background: 'var(--color-bg-primary)',
              border: '1px solid hsla(45, 20%, 50%, 0.2)',
              color: 'var(--color-text-primary)',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              boxShadow: 'var(--shadow-sm)',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            ← חזור
          </button>
        </div>

        <div style={{ 
          maxWidth: '480px', 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 'var(--space-5)', 
          zIndex: 2,
          margin: 'auto 0'
        }}>
          {/* Logo / Title */}
          <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
            <h1 style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: 'var(--text-2xl)', 
              color: 'var(--color-accent)', 
              margin: '0 0 var(--space-1) 0',
              textShadow: '1px 1px 0px white'
            }}>משחק אונליין</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', margin: 0, fontWeight: 500 }}>
              שחקו עם חברים או משתמשים אחרים ברשת
            </p>
          </div>

          {/* Name Input Container */}
          <div style={{ 
            width: '100%', 
            background: 'var(--color-bg-primary)', 
            border: '1.5px solid hsla(45, 20%, 50%, 0.15)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            textAlign: 'right'
          }}>
            <label style={{ fontWeight: 'bold', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
              ✍️ כינוי למשחקי רשת:
            </label>
            <input 
              type="text" 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.substring(0, 12))}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid hsla(45, 20%, 50%, 0.3)',
                fontSize: 'var(--text-base)',
                textAlign: 'right',
                fontFamily: 'var(--font-primary)',
                background: 'white',
                outline: 'none'
              }}
              placeholder="הזן את שמך..."
            />
          </div>

          {/* Create / Join Columns */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
            
            {/* Create Room Option */}
            <div style={{
              background: 'var(--color-bg-primary)',
              border: '1.5px solid hsla(45, 20%, 50%, 0.15)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              textAlign: 'right'
            }}>
              <h3 style={{ fontWeight: 'bold', fontSize: 'var(--text-md)', color: 'var(--color-accent)' }}>
                ➕ צור חדר חדש
              </h3>
              
              {/* Public/Private Toggles */}
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  onClick={() => setIsRoomPublic(true)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: isRoomPublic ? '2px solid var(--color-success)' : '1px solid hsla(45, 20%, 50%, 0.2)',
                    background: isRoomPublic ? 'white' : 'var(--color-bg-secondary)',
                    fontWeight: isRoomPublic ? 'bold' : 'normal',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)'
                  }}
                >
                  🌐 חדר ציבורי
                </button>
                <button
                  onClick={() => setIsRoomPublic(false)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: !isRoomPublic ? '2px solid var(--color-accent)' : '1px solid hsla(45, 20%, 50%, 0.2)',
                    background: !isRoomPublic ? 'white' : 'var(--color-bg-secondary)',
                    fontWeight: !isRoomPublic ? 'bold' : 'normal',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)'
                  }}
                >
                  🔒 חדר פרטי
                </button>
              </div>
              
              <button
                onClick={handleCreateRoom}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(to bottom, var(--color-success) 0%, hsla(140, 50%, 35%, 1) 100%)',
                  color: 'white',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'var(--text-md)',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                פתח חדר משחק
              </button>
            </div>

            {/* Join Room Option */}
            <div style={{
              background: 'var(--color-bg-primary)',
              border: '1.5px solid hsla(45, 20%, 50%, 0.15)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              textAlign: 'right'
            }}>
              <h3 style={{ fontWeight: 'bold', fontSize: 'var(--text-md)', color: 'var(--color-accent)' }}>
                🔑 הצטרף עם קוד
              </h3>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  onClick={handleJoinRoom}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-accent)',
                    color: 'white',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  הצטרף
                </button>
                <input
                  type="text"
                  maxLength={6}
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid hsla(45, 20%, 50%, 0.3)',
                    fontSize: 'var(--text-base)',
                    textAlign: 'center',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    outline: 'none'
                  }}
                  placeholder="הקלד קוד..."
                />
              </div>
            </div>

          </div>

          {/* Public Lobbies List */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            textAlign: 'right'
          }}>
            <h3 style={{ fontWeight: 'bold', fontSize: 'var(--text-md)', color: 'var(--color-text-primary)' }}>
              🌐 חדרים ציבוריים פתוחים ({publicLobbies.length})
            </h3>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              maxHeight: '180px',
              overflowY: 'auto',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              background: 'hsla(45, 20%, 50%, 0.05)',
              border: '1px solid hsla(45, 20%, 50%, 0.1)',
              scrollbarWidth: 'none'
            }}>
              {publicLobbies.length === 0 ? (
                <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  אין חדרים ציבוריים פתוחים כרגע. צור חדר פומבי כדי ששחקנים אחרים יוכלו להצטרף אליך!
                </div>
              ) : (
                publicLobbies.map((lobby) => (
                  <div
                    key={lobby.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'white',
                      border: '1px solid hsla(45, 20%, 50%, 0.15)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <button
                      onClick={() => {
                        soundService.playSuccess();
                        localStorage.setItem('scrabble_player_name', playerName);
                        onJoinPublicLobby && onJoinPublicLobby(lobby);
                      }}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-success)',
                        color: 'white',
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 'var(--text-xs)'
                      }}
                    >
                      הצטרף
                    </button>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
                        החדר של {lobby.players[0].name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        קוד: {lobby.id}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
            שבץ נא אונליין • שחק עם חברים בשקיפות והגינות מלאה
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="new-game-screen glass" style={{ 
      background: 'radial-gradient(circle, hsl(45, 25%, 92%) 0%, hsl(45, 20%, 85%) 100%)',
      padding: 'var(--space-6) var(--space-4)',
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      position: 'relative',
      overflowY: 'auto',
      overflowX: 'hidden',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      {/* Background decoration - stylized letter tiles */}
      <div className="bg-tile-decoration" style={{
        position: 'absolute', top: '10%', right: '-50px', fontSize: '120px', 
        fontFamily: 'var(--font-display)', color: 'hsla(45, 20%, 50%, 0.05)', 
        transform: 'rotate(15deg)', pointerEvents: 'none', userSelect: 'none'
      }}>ש</div>
      <div className="bg-tile-decoration" style={{
        position: 'absolute', bottom: '10%', left: '-50px', fontSize: '140px', 
        fontFamily: 'var(--font-display)', color: 'hsla(45, 20%, 50%, 0.05)', 
        transform: 'rotate(-25deg)', pointerEvents: 'none', userSelect: 'none'
      }}>ב</div>

      {/* Mute button on top right */}
      <div style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)', zIndex: 10 }}>
        <button 
          onClick={handleToggleMute}
          style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid hsla(45, 20%, 50%, 0.2)',
            color: 'var(--color-text-primary)',
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-round)',
            cursor: 'pointer',
            fontSize: 'var(--text-lg)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          title={isMuted ? "בטל השתקה" : "השתק צלילים"}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>

      <div style={{ 
        maxWidth: '480px', 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: 'var(--space-5)', 
        zIndex: 2,
        margin: 'auto 0'
      }}>
        
        {/* Beautiful Animated Scrabble Board Tile Logo */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
          {['ש', 'ב', 'ץ', ' ', 'נ', 'א'].map((letter, idx) => (
            letter === ' ' ? <div key={idx} style={{ width: '10px' }} /> : (
              <div 
                key={idx}
                className="logo-tile"
                style={{
                  width: '52px',
                  height: '56px',
                  background: 'linear-gradient(135deg, hsl(35, 60%, 92%) 0%, hsl(35, 50%, 82%) 100%)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'bold',
                  color: 'var(--color-tile-text)',
                  boxShadow: '0 4px 6px hsla(0, 0%, 0%, 0.15), inset 0 2px 2px white',
                  border: '1px solid hsla(35, 20%, 40%, 0.15)',
                  transform: `rotate(${(idx % 2 === 0 ? 1 : -1) * (idx * 2 + 1)}deg) translateY(${idx % 2 === 0 ? '-3px' : '3px'})`,
                  position: 'relative'
                }}
              >
                {letter}
                <span style={{
                  position: 'absolute', bottom: '4px', left: '4px', fontSize: '9px',
                  color: 'var(--color-tile-points)', fontWeight: 'normal'
                }}>
                  {letter === 'ש' ? '2' : letter === 'ב' ? '3' : letter === 'ץ' ? '8' : letter === 'נ' ? '1' : '1'}
                </span>
              </div>
            )
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <h1 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: 'var(--text-3xl)', 
            color: 'var(--color-accent)', 
            margin: '0 0 var(--space-2) 0',
            textShadow: '1px 1px 0px white'
          }}>שבץ נא</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)', margin: 0, fontWeight: 500 }}>
            משחק המילים הקלאסי בעברית
          </p>
        </div>

          {/* Active Games List */}
          {savedGames.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              width: '100%',
              marginBottom: 'var(--space-2)'
            }}>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-md)',
                color: 'var(--color-primary)',
                margin: '0 0 var(--space-1) 0',
                fontWeight: 'bold',
                textAlign: 'right'
              }}>
                🎮 המשחקים הפעילים שלך ({savedGames.length})
              </h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                maxHeight: '220px',
                overflowY: 'auto',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                background: 'hsla(45, 20%, 50%, 0.05)',
                border: '1px solid hsla(45, 20%, 50%, 0.1)',
                scrollbarWidth: 'thin'
              }}>
                {savedGames.map((game) => {
                  const human = game.players[0];
                  const ai = game.players[1];
                  const difficultyText = game.aiDifficulty === 'HARD' ? 'קשה' : 'קלה';
                  const difficultyColor = game.aiDifficulty === 'HARD' ? 'var(--color-danger)' : 'var(--color-success)';
                  const formattedDate = new Date(game.updatedAt).toLocaleDateString('he-IL', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div 
                      key={game.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%)',
                        border: '1.5px solid hsla(45, 20%, 50%, 0.15)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        gap: 'var(--space-2)'
                      }}
                      onClick={() => onResumeGame && onResumeGame(game)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-success)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'hsla(45, 20%, 50%, 0.15)';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      {/* Game Details (occupies the right and center in RTL) */}
                      <div style={{ flex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 'bold', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                            משחק מול המחשב
                          </span>
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: 'bold', 
                            color: difficultyColor,
                            border: `1px solid ${difficultyColor}`,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            background: 'white'
                          }}>
                            {difficultyText}
                          </span>
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                          ניקוד: <strong style={{ color: 'var(--color-accent)' }}>{human.score}</strong> (שחקן) לעומת <strong style={{ color: 'var(--color-text-primary)' }}>{ai.score}</strong> (AI)
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '1px' }}>
                          פעילות אחרונה: {formattedDate}
                        </div>
                      </div>

                      {/* Trash/Delete Button on the Left side with vertical divider line */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingRight: 'var(--space-2)',
                        borderRight: '1.5px solid hsla(45, 20%, 50%, 0.2)'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteGameId(game.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-danger)',
                            cursor: 'pointer',
                            fontSize: 'var(--text-lg)',
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-round)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'hsla(354, 70%, 50%, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="מחק משחק"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* Menu Buttons Group */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%' }}>
          
          {/* Option 1: PVE button (expands difficulty choice) */}
          {!showPVEModal ? (
            <button
              className="difficulty-btn"
              onClick={() => { handleButtonClick(); setShowPVEModal(true); }}
              style={{
                width: '100%',
                padding: 'var(--space-4) var(--space-6)',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid hsla(45, 20%, 50%, 0.2)',
                background: 'linear-gradient(to bottom, var(--color-bg-primary), var(--color-bg-secondary))',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                textAlign: 'right',
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <span style={{ fontSize: '32px' }}>🤖</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>משחק מול המחשב</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: '2px' }}>שחק לבד מול ה-AI שלנו ברמות קושי משתנות</div>
              </div>
              <span style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-muted)' }}>←</span>
            </button>
          ) : (
            /* PvE Difficulty Choices */
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'var(--space-2)', 
              width: '100%', 
              background: 'hsla(45, 20%, 50%, 0.05)', 
              padding: 'var(--space-3)', 
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed hsla(45, 20%, 50%, 0.2)'
            }}>
              <div style={{ display: 'flex', gap: 'var(--space-2)', width: '100%' }}>
                <button
                  className="difficulty-btn"
                  onClick={() => selectGameMode('PVE', 'EASY')}
                  style={{
                    flex: 1,
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--color-success)',
                    background: 'var(--color-bg-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '24px' }}>😊</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-success)' }}>רמה קלה</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>למתחילים</span>
                </button>
                <button
                  className="difficulty-btn"
                  onClick={() => selectGameMode('PVE', 'HARD')}
                  style={{
                    flex: 1,
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--color-danger)',
                    background: 'var(--color-bg-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '24px' }}>🧠</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-danger)' }}>רמה קשה</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>למומחים ואסטרטגים</span>
                </button>
              </div>
              <button 
                onClick={() => { handleButtonClick(); setShowPVEModal(false); }}
                style={{
                  background: 'none', border: 'none', color: 'var(--color-text-muted)',
                  fontSize: 'var(--text-sm)', padding: '6px', cursor: 'pointer', fontWeight: 600,
                  textDecoration: 'underline'
                }}
              >
                חזור לאפשרויות
              </button>
            </div>
          )}

          {/* Option 3: Online PvP */}
          <button
            className="difficulty-btn"
            onClick={() => { soundService.playTilePlace(); setShowOnlineDashboard(true); }}
            style={{
              width: '100%',
              padding: 'var(--space-4) var(--space-6)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid hsla(45, 20%, 50%, 0.2)',
              background: 'linear-gradient(to bottom, var(--color-bg-primary), var(--color-bg-secondary))',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              textAlign: 'right',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <span style={{ fontSize: '32px' }}>🌐</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>משחק אונליין</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: '2px' }}>שחקו נגד חברים מרחוק או שחקנים אקראיים</div>
            </div>
            <span style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-muted)' }}>←</span>
          </button>

        </div>

        {/* Footer legal attribution */}
        <div style={{ 
          marginTop: 'var(--space-6)', 
          textAlign: 'center', 
          fontSize: 'var(--text-xs)', 
          color: 'var(--color-text-muted)', 
          lineHeight: '1.5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <div>האפליקציה והמילון מופצים תחת רישיון <strong>GNU GPLv3</strong>.</div>
          <div>מבוסס על פרויקט <strong>Hspell</strong> (המאיית העברי החופשי, גרסה 1.4).</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
            <a 
              href="http://hspell.ivrix.org.il/" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'var(--color-accent)', textDecoration: 'underline', fontWeight: 600 }}
            >
              אתר Hspell
            </a>
            <span style={{ color: 'hsla(45, 20%, 50%, 0.3)' }}>|</span>
            <a 
              href="https://www.gnu.org/licenses/gpl-3.0.html" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'var(--color-accent)', textDecoration: 'underline', fontWeight: 600 }}
            >
              רישיון GPLv3
            </a>
          </div>
        </div>
      </div>

      {deleteGameId && (
        <ConfirmationModal
          title="מחיקת משחק"
          message="האם אתה בטוח שברצונך למחוק משחק זה לצמיתות? לא ניתן יהיה לשחזר אותו."
          onConfirm={() => {
            onDeleteGame && onDeleteGame(deleteGameId);
            setDeleteGameId(null);
          }}
          onCancel={() => setDeleteGameId(null)}
        />
      )}
    </div>
  );
};
