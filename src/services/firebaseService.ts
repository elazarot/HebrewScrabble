/**
 * Firebase Service for שבץ נא (Hebrew Scrabble)
 * Manages Firebase App initialization, Anonymous Auth, and Firestore Online Multiplayer Sync.
 * Convention §2: Sync only on turn complete (submit, pass, swap, forfeit).
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteField,
  onSnapshot, 
  collection, 
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';
import { getAuth, signInAnonymously as authSignInAnonymously, User } from 'firebase/auth';
import { GameState, MoveResult } from '../types';

// Web App Firebase Configuration
// To use your real project: create a Firebase project, enable Firestore & Anonymous Auth, 
// and populate these variables in a `.env` file or paste them here directly.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hebrew-scrabble.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hebrew-scrabble",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hebrew-scrabble.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "placeholder-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "placeholder-app-id"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * Perform background anonymous authentication to assign a stable UID.
 */
export async function signInPlayer(): Promise<User> {
  const result = await authSignInAnonymously(auth);
  return result.user;
}

/**
 * Generate a random 6-character uppercase lobby code ( invite code ).
 */
export function generateLobbyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Creates a brand new match document in Firestore under the 'matches' collection.
 */
export async function createOnlineMatch(
  gameId: string,
  lobbyCode: string,
  isPublic: boolean,
  hostName: string,
  hostUid: string,
  initialState: GameState
): Promise<void> {
  const matchRef = doc(db, 'matches', lobbyCode);
  
  // Format the game state for Firestore
  const matchData = {
    id: lobbyCode,
    gameId: gameId, // Vite/Local game ID
    status: 'WAITING',
    isPublic,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    currentPlayerIndex: 0,
    turnNumber: 1,
    tileBagSize: initialState.tileBag.length,
    board: JSON.stringify(initialState.board),
    players: [
      {
        uid: hostUid,
        name: hostName,
        score: 0,
        isReady: true
      },
      {
        uid: null,
        name: 'ממתין לשחקן...',
        score: 0,
        isReady: false
      }
    ],
    racks: {
      [hostUid]: initialState.players[0].rack,
      PENDING: initialState.players[1].rack // Hold guest's rack pre-drawn by host
    },
    tileBag: initialState.tileBag,
    lastMove: null,
    moveHistory: []
  };

  await setDoc(matchRef, matchData);
}

/**
 * Join an existing match by lobby code. Returns the pre-drawn guest rack.
 */
export async function joinOnlineMatch(
  lobbyCode: string,
  guestName: string,
  guestUid: string
): Promise<any[]> {
  const matchRef = doc(db, 'matches', lobbyCode);
  
  // Fetch existing match to verify its state and retrieve PENDING rack
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) {
    throw new Error('החדר אינו קיים!');
  }
  
  const matchData = matchSnap.data();
  if (matchData.status !== 'WAITING') {
    throw new Error('החדר כבר מלא או שהמשחק החל!');
  }
  
  const guestRack = matchData.racks?.PENDING || [];
  
  // Update players list and assign guest's rack, deleting the PENDING key
  const updateData: Record<string, any> = {
    status: 'PLAYING',
    updatedAt: Timestamp.now(),
    'players.1': {
      uid: guestUid,
      name: guestName,
      score: 0,
      isReady: true
    },
    [`racks.${guestUid}`]: guestRack,
    'racks.PENDING': deleteField()
  };

  await updateDoc(matchRef, updateData);
  return guestRack;
}

/**
 * Syncs the local turn complete transition to the Firestore server.
 */
export async function submitOnlineTurn(
  lobbyCode: string,
  newState: GameState,
  actionType: 'PLAY' | 'PASS' | 'SWAP',
  moveResult: MoveResult | null,
  playerUid: string,
  playerRack: any[]
): Promise<void> {
  const matchRef = doc(db, 'matches', lobbyCode);

  const updateData: Record<string, any> = {
    updatedAt: Timestamp.now(),
    currentPlayerIndex: newState.currentPlayerIndex,
    turnNumber: newState.turnNumber,
    tileBagSize: newState.tileBag.length,
    tileBag: newState.tileBag,
    board: JSON.stringify(newState.board),
    phase: newState.phase, // WAITING | PLAYING | GAME_OVER
    status: newState.phase === 'GAME_OVER' ? 'GAME_OVER' : 'PLAYING',
    
    // Sync player scores
    'players.0.score': newState.players[0].score,
    'players.1.score': newState.players[1].score,

    // Sync active racks privately
    [`racks.${playerUid}`]: playerRack
  };

  // Sync turn log/announcement
  if (actionType === 'PLAY' && moveResult) {
    updateData.lastMove = {
      playerIndex: newState.currentPlayerIndex === 1 ? 0 : 1, // The player who just played
      action: 'PLAY',
      score: moveResult.totalScore,
      words: moveResult.words.map(w => w.word)
    };
  } else if (actionType === 'PASS') {
    updateData.lastMove = {
      playerIndex: newState.currentPlayerIndex === 1 ? 0 : 1,
      action: 'PASS',
      score: 0,
      words: []
    };
  } else if (actionType === 'SWAP') {
    updateData.lastMove = {
      playerIndex: newState.currentPlayerIndex === 1 ? 0 : 1,
      action: 'SWAP',
      score: 0,
      words: []
    };
  }

  await updateDoc(matchRef, updateData);
}

/**
 * Set up real-time listener for changes in a specific match.
 */
export function listenToMatch(
  lobbyCode: string,
  callback: (matchData: any) => void
) {
  const matchRef = doc(db, 'matches', lobbyCode);
  return onSnapshot(matchRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    }
  });
}

/**
 * Set up real-time listener for open, public matches waiting for players.
 */
export function listenToPublicLobbies(
  callback: (lobbies: any[]) => void
) {
  const matchesRef = collection(db, 'matches');
  const q = query(
    matchesRef, 
    where('isPublic', '==', true), 
    where('status', '==', 'WAITING')
  );

  return onSnapshot(q, (querySnapshot) => {
    const lobbies: any[] = [];
    querySnapshot.forEach((doc) => {
      lobbies.push(doc.data());
    });
    callback(lobbies);
  });
}

/**
 * Maps a Firestore Match document back to the type-safe local GameState.
 */
export function convertFirestoreMatchToGameState(matchData: any, myUid: string): GameState {
  const hostUid = matchData.players[0].uid;
  const guestUid = matchData.players[1].uid;
  
  return {
    id: matchData.id,
    updatedAt: matchData.updatedAt?.toMillis ? matchData.updatedAt.toMillis() : Date.now(),
    board: JSON.parse(matchData.board),
    players: [
      {
        id: hostUid,
        name: matchData.players[0].name,
        score: matchData.players[0].score,
        rack: matchData.racks[hostUid] || [],
        isAI: false,
        consecutivePasses: 0,
        swapsRemaining: 3
      },
      {
        id: guestUid || 'player-2',
        name: matchData.players[1].name,
        score: matchData.players[1].score,
        rack: guestUid ? (matchData.racks[guestUid] || []) : [],
        isAI: false,
        consecutivePasses: 0,
        swapsRemaining: 3
      }
    ],
    currentPlayerIndex: matchData.currentPlayerIndex,
    tileBag: matchData.tileBag || [],
    phase: matchData.status === 'GAME_OVER' ? 'GAME_OVER' : 'PLAYING',
    turnPhase: 'PLACING',
    placedTiles: [],
    moveHistory: matchData.moveHistory || [],
    turnNumber: matchData.turnNumber,
    gameMode: 'PVP',
    aiDifficulty: 'EASY'
  };
}
