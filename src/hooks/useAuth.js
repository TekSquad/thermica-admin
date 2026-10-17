import { useCallback, useEffect, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { auth, ref } from "../config/firebase";

/** status: loading | checking | signedOut | denied | ready */
export default function useAuth() {
    const [state, setState] = useState({ status: "loading", user: null });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let alive = true;
        const off = onAuthStateChanged(auth, async (fb) => {
            if (!fb) return alive && setState({ status: "signedOut", user: null });

            const user = {
                uid: fb.uid,
                email: (fb.email || "").toLowerCase(),
                name: fb.displayName || fb.email || "Owner",
                photo: fb.photoURL || "",
            };
            setState({ status: "checking", user });
            try {
                const snap = await getDoc(ref("staff", user.email));
                const s = snap.exists() ? snap.data() : null;
                const ok = s?.active === true && s?.role === "owner";
                if (!alive) return;
                setError("");
                setState({ status: ok ? "ready" : "denied", user });
            } catch (e) {
                if (!alive) return;
                setError(e.message || "Could not verify owner access.");
                setState({ status: "denied", user });
            }
        });
        return () => {
            alive = false;
            off();
        };
    }, [attempt]);

    const signIn = useCallback(async () => {
        setBusy(true);
        setError("");
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });
            await signInWithPopup(auth, provider);
        } catch (e) {
            if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") return;
            setError(
                e.code === "auth/popup-blocked"
                    ? "The sign-in popup was blocked. Allow popups for this site and try again."
                    : e.code === "auth/unauthorized-domain"
                        ? "This domain is not authorized in Firebase Authentication settings."
                        : e.message || "Sign-in failed.",
            );
        } finally {
            setBusy(false);
        }
    }, []);

    const signOutUser = useCallback(() => signOut(auth), []);
    const retry = useCallback(() => setAttempt((n) => n + 1), []);

    return { ...state, error, busy, signIn, signOut: signOutUser, retry };
}