const TZ = "Asia/Kolkata";

export const round2 = (v) => Math.round(Number(v || 0) * 100) / 100;
export const money = (v) => Number(v || 0).toFixed(2);
export const inr = (v) => {
    const n = round2(v);
    return `₹${n.toLocaleString("en-IN", {
        minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
        maximumFractionDigits: 2,
    })}`;
};
export const compactInr = (v) => {
    const n = Number(v || 0);
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
    return `₹${Math.round(n)}`;
};
export const uid = () =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ---- business days (always IST, same as the POS app) ----
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
export const istDateKey = (d = new Date()) => DAY.format(d);
export const istHour = () =>
    Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hour12: false }).format(new Date())) % 24;

const noon = (key) => new Date(`${key}T12:00:00+05:30`);
export const shiftDay = (key, n) => istDateKey(new Date(noon(key).getTime() + n * 86400000));
export const daysBetween = (a, b) => Math.round((noon(b) - noon(a)) / 86400000);
export const eachDay = (from, to) => {
    const out = [];
    for (let k = from; k <= to; k = shiftDay(k, 1)) out.push(k);
    return out;
};
export const dayRangeISO = (key) => {
    const start = new Date(`${key}T00:00:00+05:30`);
    return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() };
};

export const fmtDay = (key, { year = false } = {}) =>
    noon(key).toLocaleDateString("en-IN", {
        timeZone: TZ,
        weekday: "short",
        day: "numeric",
        month: "short",
        ...(year ? { year: "numeric" } : {}),
    });
export const fmtWeekday = (key) => noon(key).toLocaleDateString("en-IN", { timeZone: TZ, weekday: "short" });
export const fmtTime = (iso) =>
    new Date(iso)
        .toLocaleTimeString("en-IN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: true })
        .toUpperCase();
export const fmtDateTime = (iso) =>
    `${new Date(iso)
        .toLocaleDateString("en-GB", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" })
        .replaceAll("/", "-")} ${fmtTime(iso)}`;

/** Firestore Timestamp | ISO string | number -> readable, or "Just now" while pending. */
export const fmtStamp = (t) => {
    const d = t?.toDate?.() ?? (t ? new Date(t) : null);
    return d ? fmtDateTime(d.toISOString()) : "Just now";
};

// ---- bills ----
export const billDay = (b) => istDateKey(new Date(b.ts));
export const billToken = (b) => {
    if (Number.isInteger(b?.token)) return b.token;
    const parsed = parseInt(String(b?.id ?? "").split("-").pop(), 10);
    return Number.isFinite(parsed) ? parsed % 1000 : 0;
};
export const fmtToken = (b) => String(billToken(b) % 1000).padStart(3, "0");

// ---- thermal text helpers (same as the POS app) ----
export const ascii = (s) =>
    String(s ?? "")
        .replace(/₹/g, "Rs.")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7e\n]/g, "?");

export function wrap(text, width) {
    const out = [];
    for (const para of ascii(text).split("\n")) {
        let line = "";
        for (let word of para.split(/\s+/).filter(Boolean)) {
            while (word.length > width) {
                if (line) {
                    out.push(line);
                    line = "";
                }
                out.push(word.slice(0, width));
                word = word.slice(width);
            }
            if (!line) line = word;
            else if (line.length + 1 + word.length <= width) line += " " + word;
            else {
                out.push(line);
                line = word;
            }
        }
        out.push(line);
    }
    return out;
}

export function row(left, right, w) {
    const l = left.length + right.length >= w ? left.slice(0, Math.max(0, w - right.length - 1)) : left;
    return l + " ".repeat(Math.max(1, w - l.length - right.length)) + right;
}

const HOUR_FMT = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hour12: false });
/** Hour of day (0-23, IST) of an ISO timestamp. */
export const istHourOf = (iso) => Number(HOUR_FMT.format(new Date(iso))) % 24;