import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBYWrDH663zB_1jiIcE4pV4r1Ol8oAjfuc",
  authDomain: "apexnet-lk.firebaseapp.com",
  projectId: "apexnet-lk",
  storageBucket: "apexnet-lk.firebasestorage.app",
  messagingSenderId: "640596119188",
  appId: "1:640596119188:web:ea0f67b845edc403726e81"
};

// Initialize Firebase, Firestore, and Auth
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();