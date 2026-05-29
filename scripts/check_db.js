import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function dump() {
  console.log("Fetching matches...");
  const querySnapshot = await getDocs(collection(db, 'matches'));
  console.log(`Found ${querySnapshot.size} matches:`);
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`- ID: ${doc.id}, isPublic: ${data.isPublic}, status: ${data.status}, turnNumber: ${data.turnNumber}, players: ${JSON.stringify(data.players)}`);
  });
  process.exit(0);
}

dump().catch(console.error);
