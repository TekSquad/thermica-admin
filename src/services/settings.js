import { onSnapshot, setDoc } from "firebase/firestore";
import { ref } from "../config/firebase";
import { pickShared } from "../lib/settings";

export const watchSettings = (onData, onError) =>
    onSnapshot(ref("config", "settings"), (snap) => onData(snap.exists() ? snap.data() : null), onError);

export const saveSettings = (patch) => setDoc(ref("config", "settings"), pickShared(patch), { merge: true });