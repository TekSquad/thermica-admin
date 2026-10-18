import { getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { ref } from "../config/firebase";
import { istDateKey } from "../lib/format";

// config/app: { maintenance, message, minVersion }
export const watchApp = (onData, onError) =>
    onSnapshot(ref("config", "app"), (snap) => onData(snap.exists() ? snap.data() : {}), onError);

export const saveApp = (patch, by) =>
    setDoc(ref("config", "app"), { ...patch, updatedAt: Date.now(), updatedBy: by }, { merge: true });

/** Highest number reserved by any device today (IST). */
export async function getTodayCounter() {
    const snap = await getDoc(ref("counters", istDateKey()));
    return snap.exists() ? Number(snap.data().seq) || 0 : 0;
}