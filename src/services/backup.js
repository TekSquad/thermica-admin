import { getDocs } from "firebase/firestore";
import { BIZ, col } from "../config/firebase";

const all = async (name) => (await getDocs(col(name))).docs.map((d) => ({ _id: d.id, ...d.data() }));

/** Reads everything for this business. Each document read counts towards Firestore usage. */
export async function buildBackup({ includeBills = true, includeAudit = true } = {}) {
    const [products, config, staff] = await Promise.all([all("products"), all("config"), all("staff")]);
    const bills = includeBills ? await all("bills") : [];
    const audit = includeAudit ? await all("audit") : [];

    return {
        data: {
            app: "thermica-admin-backup",
            version: 1,
            business: BIZ,
            exportedAt: new Date().toISOString(),
            products,
            config,
            staff,
            bills,
            audit,
        },
        counts: { products: products.length, staff: staff.length, bills: bills.length, audit: audit.length },
    };
}