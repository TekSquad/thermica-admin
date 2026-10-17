import { doc, getDocs, orderBy, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { col, db, ref } from "../config/firebase";
import { dayRangeISO } from "../lib/format";

// One-shot reads with a short cache keep Firestore read usage predictable.
const TTL = 60_000;
const cache = new Map();

export const clearBillsCache = () => cache.clear();

export async function fetchBills(fromDay, toDay, { force = false } = {}) {
    const key = `${fromDay}|${toDay}`;
    const hit = cache.get(key);
    if (!force && hit && Date.now() - hit.at < TTL) return hit.data;

    const { start } = dayRangeISO(fromDay);
    const { end } = dayRangeISO(toDay);
    const snap = await getDocs(
        query(col("bills"), where("ts", ">=", start), where("ts", "<", end), orderBy("ts", "desc")),
    );
    const data = snap.docs.map((d) => ({ ...d.data(), docId: d.id }));
    cache.set(key, { at: Date.now(), data });
    return data;
}

export async function voidBill(bill, user, reason) {
    const b = writeBatch(db);
    b.update(ref("bills", bill.docId), {
        status: "void",
        voidedByEmail: user.email,
        voidedByName: user.name,
        voidedAt: serverTimestamp(),
        voidReason: reason,
    });
    b.set(doc(col("audit")), {
        type: "bill_voided",
        billId: bill.id,
        token: bill.token ?? null,
        total: bill.total ?? null,
        byEmail: user.email,
        byName: user.name,
        deviceId: "ADMIN",
        reason,
        at: serverTimestamp(),
    });
    await b.commit();
    clearBillsCache();
}