import { getDocs, limit, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { col, ref } from "../config/firebase";
import { round2 } from "../lib/format";

export async function fetchClosings(max = 90) {
    const snap = await getDocs(query(col("closings"), orderBy("day", "desc"), limit(max)));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function saveClosing(day, { openingCash, cashSales, upiSales, otherSales, billCount, voidCount, countedCash, note }, user) {
    const opening = round2(openingCash);
    const cash = round2(cashSales);
    const counted = round2(countedCash);
    const expectedCash = round2(opening + cash);
    const difference = round2(counted - expectedCash);

    await setDoc(ref("closings", day), {
        day,
        openingCash: opening,
        cashSales: cash,
        upiSales: round2(upiSales),
        otherSales: round2(otherSales),
        billCount: Number(billCount || 0),
        voidCount: Number(voidCount || 0),
        expectedCash,
        countedCash: counted,
        difference,
        note: String(note || "").trim().slice(0, 200),
        closedByEmail: user.email,
        closedByName: user.name,
        closedAt: serverTimestamp(),
    });
}