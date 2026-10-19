import { useCallback, useEffect, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, BIZ, db, ref } from "../config/firebase";

/** status: loading | checking | signedOut | denied | ready */
export default function useAuth() {
    const [state, setState] = useState({ status: "loading", user: null, tenantStatus: null });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let alive = true;
        let authGeneration = 0;
        let offTenant = null;
        const offAuth = onAuthStateChanged(auth, async (fb) => {
            const generation = ++authGeneration;
            offTenant?.();
            offTenant = null;
            if (!fb) {
                if (alive) setState({ status: "signedOut", user: null, tenantStatus: null });
                return;
            }

            const user = {
                uid: fb.uid,
                email: (fb.email || "").toLowerCase(),
                name: fb.displayName || fb.email || "Owner",
                photo: fb.photoURL || "",
            };
            if (alive) setState({ status: "checking", user, tenantStatus: null });
            try {
                const staffSnap = await getDoc(ref("staff", user.email));
                const staff = staffSnap.exists() ? staffSnap.data() : null;
                const owner = staff?.active === true && staff?.role === "owner";
                if (!alive || generation !== authGeneration) return;
                if (!owner) {
                    setError("");
                    setState({ status: "denied", user, tenantStatus: null });
                    return;
                }

                // The registry is the shared control plane. Firestore rules permit only this
                // exact tenant document to an active owner and independently enforce its state.
                offTenant = onSnapshot(doc(db, "teksquad_platform", "metadata", "businesses", BIZ), { includeMetadataChanges: true }, (tenantSnap) => {
                    if (!alive || generation !== authGeneration) return;
                    if (tenantSnap.metadata.fromCache) {
                        setState({ status: "checking", user, tenantStatus: null });
                        return;
                    }
                    const tenantStatus = tenantSnap.exists() ? tenantSnap.data().status || "active" : "suspended";
                    if (!["active", "paused", "suspended"].includes(tenantStatus)) {
                        setError("This business has an unsupported access status. Contact Thermica support.");
                        setState({ status: "denied", user, tenantStatus: null });
                        return;
                    }
                    setError("");
                    setState({ status: "ready", user, tenantStatus });
                }, (err) => {
                    if (!alive || generation !== authGeneration) return;
                    setError(err.message || "Could not verify this business status.");
                    setState({ status: "denied", user, tenantStatus: null });
                });
            } catch (e) {
                if (!alive || generation !== authGeneration) return;
                setError(e.message || "Could not verify owner access.");
                setState({ status: "denied", user, tenantStatus: null });
            }
        });
        return () => {
            alive = false;
            offTenant?.();
            offAuth();
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
