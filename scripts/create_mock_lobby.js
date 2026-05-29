import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAJiOHpoMo7O9YPb2LL7IDgh5v9BGYiE-8",
  authDomain: "hebrewscrabble.firebaseapp.com",
  projectId: "hebrewscrabble",
  storageBucket: "hebrewscrabble.firebasestorage.app",
  messagingSenderId: "696772776771",
  appId: "1:696772776771:web:6a5342a7c08b89b02a55f6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function create() {
  const code = "TESTAB";
  console.log(`Creating mock WAITING public lobby ${code}...`);
  const matchRef = doc(db, 'matches', code);
  
  await setDoc(matchRef, {
    id: code,
    gameId: "mock-game-id",
    status: "WAITING",
    isPublic: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    currentPlayerIndex: 0,
    turnNumber: 1,
    tileBagSize: 100,
    board: JSON.stringify(Array(15).fill(null).map(() => Array(15).fill({ bonus: "NONE", tile: null }))),
    players: [
      {
        uid: "mock-host-uid",
        name: "בדיקת מערכת 🤖",
        score: 0,
        isReady: true
      },
      {
        uid: null,
        name: "ממתין לשחקן...",
        score: 0,
        isReady: false
      }
    ],
    racks: {
      "mock-host-uid": [],
      PENDING: []
    },
    tileBag: [],
    lastMove: null,
    moveHistory: []
  });
  
  console.log("Mock lobby created successfully!");
  process.exit(0);
}

create().catch(console.error);
