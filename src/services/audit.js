import { getDocs, limit, orderBy, query } from "firebase/firestore";
import { col } from "../config/firebase";

export async function fetchAudit(max = 200) {
    const snap = await getDocs(query(col("audit"), orderBy("at", "desc"), limit(max)));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}