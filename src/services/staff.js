import { deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import { col, ref } from "../config/firebase";

const norm = (email) => String(email || "").trim().toLowerCase();

export const watchStaff = (onData, onError) =>
    onSnapshot(
        col("staff"),
        (snap) =>
            onData(
                snap.docs
                    .map((d) => {
                        const x = d.data();
                        return {
                            id: d.id,
                            email: x.email || d.id,
                            name: x.name || "",
                            role: x.role === "owner" ? "owner" : "cashier",
                            active: x.active === true, // same strict check as the POS
                            updatedAt: x.updatedAt || null,
                        };
                    })
                    .sort((a, b) => (b.role === "owner") - (a.role === "owner") || a.email.localeCompare(b.email)),
            ),
        onError,
    );

export const saveStaff = (email, patch, by) =>
    setDoc(
        ref("staff", norm(email)),
        { email: norm(email), ...patch, updatedAt: Date.now(), updatedBy: by },
        { merge: true },
    );

export const removeStaff = (email) => deleteDoc(ref("staff", norm(email)));