import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getFirestore, onSnapshot, setDoc } from "firebase/firestore";

const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const BIZ = import.meta.env.VITE_BUSINESS_ID || "kaabil";
export const staffColRef = () => collection(db, "businesses", BIZ, "staff");
export const staffRef = (email) => doc(db, "businesses", BIZ, "staff", email.trim().toLowerCase());
export const settingsRef = () => doc(db, "businesses", BIZ, "config", "settings");
export { deleteDoc, doc, getDoc, onAuthStateChanged, onSnapshot, setDoc, signOut };

export async function signInWithGoogle() {
    await signInWithPopup(auth, new GoogleAuthProvider());
}