import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";
import { DEFAULT_SETTINGS } from "../lib/settings";

const PLATFORM_REF = collection(db, "teksquad_platform", "metadata", "businesses");

export async function fetchMasterBusinesses() {
    const snap = await getDocs(PLATFORM_REF);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function provisionBusiness({ bizId, name, ownerEmail, ownerName }, adminEmail) {
    const slug = String(bizId || "").trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
    const email = String(ownerEmail || "").trim().toLowerCase();

    if (!slug) throw new Error("Enter a valid business ID slug (e.g. cafe-bliss).");
    if (!email) throw new Error("Enter a valid owner email address.");
    if (!name.trim()) throw new Error("Enter a business display name.");

    const batch = writeBatch(db);

    const masterRef = doc(db, "teksquad_platform", "metadata", "businesses", slug);
    batch.set(masterRef, {
        bizId: slug,
        name: name.trim(),
        ownerEmail: email,
        createdAt: Date.now(),
        createdBy: adminEmail,
        status: "active",
    });

    const staffRef = doc(db, "businesses", slug, "staff", email);
    batch.set(staffRef, {
        email,
        name: (ownerName || "").trim() || email.split("@")[0],
        role: "owner",
        active: true,
        root: true,
        updatedAt: Date.now(),
        updatedBy: adminEmail,
    });

    const settingsRef = doc(db, "businesses", slug, "config", "settings");
    batch.set(settingsRef, {
        ...DEFAULT_SETTINGS,
        name: name.trim(),
    });

    const categoriesRef = doc(db, "businesses", slug, "config", "categories");
    batch.set(categoriesRef, {
        list: ["Beverages", "Snacks", "Meals"],
    });

    await batch.commit();
    return slug;
}