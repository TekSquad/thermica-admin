import { fmtDateTime, fmtTime, fmtToken, money, row, wrap } from "./format";

export const PAPER = {
    50: { chars: 28, label: "50mm" },
    58: { chars: 30, label: "58mm" },
    80: { chars: 48, label: "80mm" },
};

export const SAMPLE_BILL = {
    id: "TS-20261016-0064",
    token: 64,
    ts: "2026-10-16T09:20:00+05:30",
    method: "CASH",
    type: "DINE_IN",
    status: "completed",
    note: "",
    total: 230,
    items: [
        { id: "a", name: "Poha with Sev", price: 30, qty: 1 },
        { id: "b", name: "Veg Executive Thali", price: 120, qty: 1 },
        { id: "c", name: "Mini Lunch Combo", price: 80, qty: 1 },
    ],
};

const line = (t, o = {}) => ({ t: String(t ?? ""), align: "center", bold: false, tall: false, ...o });

export function buildReceipt(s, bill, { copy = "customer", paper = 58 } = {}) {
    const w = PAPER[paper]?.chars ?? PAPER[58].chars;
    const out = [];
    const center = (text, o = {}) => wrap(String(text ?? ""), w).forEach((p) => out.push(line(p, { ...o, align: "center" })));
    const left = (text, o = {}) => wrap(String(text ?? ""), w).forEach((p) => out.push(line(p, { ...o, align: "left" })));
    const rule = (c = "-") => out.push(line(c.repeat(w)));
    const tokenStr = fmtToken(bill);

    if (copy !== "kitchen") {
        if (s.headerMode === "logo" && s.logo) out.push({ type: "image", data: s.logo, align: "center" });
        else if (s.name?.trim()) center(s.name.trim(), { bold: true, tall: true });

        if (s.tagline?.trim()) center(s.tagline.trim().slice(0, w));
        if (s.address?.trim()) left(s.address.trim());
        if (s.phone?.trim()) left(`Ph: ${s.phone.trim()}`);
        if (s.header?.trim()) left(s.header.trim());

        rule("=");
        center(`TOKEN NO: #${tokenStr}`, { bold: true, tall: true });
        rule("=");

        const meta = [];
        if (s.showBill !== false) meta.push(`Bill: ${bill.id}`);
        if (s.showDate) meta.push(`Date: ${fmtDateTime(bill.ts)}`);
        if (s.showPayment) meta.push(`Paid: ${bill.method}`);
        if (bill.type === "TAKEAWAY") meta.push("Order: Takeaway");
        if (meta.length) {
            meta.forEach((m) => left(m));
            rule("-");
        }

        const qtyW = 3;
        const priceW = Math.max(8, ...bill.items.map((i) => money(i.price * i.qty).length));
        const nameW = Math.max(8, w - priceW - qtyW);
        const padR = (t, n) => String(t ?? "").slice(0, n).padEnd(n);
        const padL = (t, n) => String(t ?? "").slice(0, n).padStart(n);
        const mid = (t, n) => {
            const x = String(t ?? "").slice(0, n);
            const l = Math.floor((n - x.length) / 2);
            return " ".repeat(l) + x + " ".repeat(n - x.length - l);
        };
        const itemRow = (name, qty, price, o = {}) =>
            line(padR(name, nameW) + mid(qty, qtyW) + padL(price, priceW), { ...o, align: "left" });

        out.push(itemRow("ITEM", "QTY", "PRICE", { bold: true }));
        rule("-");
        bill.items.forEach((item) => {
            const parts = wrap(item.name, nameW);
            const first = parts.shift() ?? "";
            out.push(itemRow(first, item.qty, money(item.price * item.qty)));
            parts.forEach((p) => out.push(itemRow(p, "", "")));
        });
        rule("-");
        out.push(line(row("GRAND TOTAL:", `Rs. ${money(bill.total)}`, w), { bold: true }));
        rule("=");

        if (bill.note) left(`Note: ${bill.note}`);
        if (s.footer?.trim()) center(s.footer.trim());
    } else {
        center("*** KITCHEN COPY ***", { bold: true });
        rule("=");
        center(`TOKEN NO: #${tokenStr}`, { bold: true, tall: true });
        rule("=");
        out.push(line(`Bill: ${bill.id}`, { align: "left" }));
        out.push(
            line(row(`Time: ${fmtTime(bill.ts)}`, bill.type === "TAKEAWAY" ? "TAKEAWAY" : "DINE-IN", w), {
                align: "left",
            }),
        );
        rule("-");
        out.push(line("QTY  ITEM", { bold: true, align: "left" }));
        rule("-");
        bill.items.forEach((item) => {
            const prefix = `${String(item.qty).padEnd(3)}x `;
            const parts = wrap(item.name, w - prefix.length);
            const first = parts.shift() ?? "";
            out.push(line(prefix + first, { bold: true, align: "left" }));
            parts.forEach((p) => out.push(line(" ".repeat(prefix.length) + p, { bold: true, align: "left" })));
        });
        if (bill.note) {
            rule("-");
            left(`NOTE: ${bill.note}`, { bold: true });
        }
        rule("=");
    }
    return out;
}