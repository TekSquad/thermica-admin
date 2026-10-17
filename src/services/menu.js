import { deleteDoc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { col, db, ref } from "../config/firebase";

export const watchProducts = (onData, onError) =>
    onSnapshot(
        col("products"),
        (snap) =>
            onData(
                snap.docs
                    .map((d) => ({ ...d.data(), id: d.data().id ?? d.id }))
                    .sort(
                        (a, b) =>
                            (a.createdAt ?? 0) - (b.createdAt ?? 0) || String(a.name).localeCompare(String(b.name)),
                    ),
            ),
        onError,
    );

export const watchCategories = (onData, onError) =>
    onSnapshot(ref("config", "categories"), (snap) => onData(snap.exists() ? snap.data().list ?? [] : []), onError);

export const saveProduct = (p) => setDoc(ref("products", p.id), p, { merge: true });
export const setAvailable = (id, available) => setDoc(ref("products", id), { available }, { merge: true });
export const deleteProduct = (id) => deleteDoc(ref("products", id));
export const saveCategories = (list) => setDoc(ref("config", "categories"), { list });

export function renameCategory(newList, productIds, to) {
    const b = writeBatch(db);
    b.set(ref("config", "categories"), { list: newList });
    productIds.forEach((id) => b.update(ref("products", id), { category: to }));
    return b.commit();
}