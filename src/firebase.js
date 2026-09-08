import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, TwitterAuthProvider } from 'firebase/auth';

// Firebase config is read from environment variables.
// Create a .env.local with REACT_APP_FIREBASE_* values.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDizoh0pHKMkUp32v8oMmrMcePcvOauugM",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "auction-hub-84d3d.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "auction-hub-84d3d",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "auction-hub-84d3d.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "1074565819406",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:1074565819406:web:0aa730565d3cd7157c205f",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const twitterProvider = new TwitterAuthProvider();

export default app;
