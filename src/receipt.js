const PAPER = { 58: 30, 80: 48 };
const sample = {
    id: "TS-20261016-0064",
    token: 64,
    ts: "2026-10-16T09:20:00",
    method: "CASH",
    type: "DINE_IN",
    total: 150,
    items: [{ name: "Poha with Sev", qty: 1, price: 30 }, { name: "Veg Executive Thali", qty: 1, price: 120 }],
};

const wrap = (value, width) => {
    const words = String(value ?? "").split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach((word) => {
        if (!word) return;
        if ((line ? `${line} ${word}` : word).length > width && line) {
            lines.push(line);
            line = word;
        } else line = line ? `${line} ${word}` : word;
    });
    if (line) lines.push(line);
    return lines.length ? lines : [""];
};

export function buildReceipt(settings, paper) {
    const width = PAPER[paper];
    const out = [];
    const center = (text, bold = false) => wrap(text, width).forEach((t) => out.push({ text: t, align: "center", bold }));
    const rule = (char = "-") => out.push({ text: char.repeat(width), align: "left" });
    if (settings.headerMode === "logo" && settings.logo) out.push({ image: settings.logo, align: "center" });
    else if (settings.name?.trim()) center(settings.name.trim(), true);
    if (settings.tagline?.trim()) center(settings.tagline.slice(0, width));
    if (settings.address?.trim()) wrap(settings.address.trim(), width).forEach((t) => out.push({ text: t }));
    if (settings.phone?.trim()) wrap(`Ph: ${settings.phone.trim()}`, width).forEach((t) => out.push({ text: t }));
    if (settings.header?.trim()) wrap(settings.header.trim(), width).forEach((t) => out.push({ text: t }));
    rule("=");
    center(`TOKEN NO: #${String(sample.token).padStart(3, "0")}`, true);
    rule("=");
    if (settings.showBill !== false) out.push({ text: `Bill: ${sample.id}` });
    if (settings.showDate) out.push({ text: `Date: ${new Date(sample.ts).toLocaleString()}` });
    if (settings.showPayment) out.push({ text: `Paid: ${sample.method}` });
    rule("-");
    sample.items.forEach((item) => out.push({ text: `${item.qty}x ${item.name}`.padEnd(width - 8) + `Rs. ${item.qty * item.price}`, align: "left" }));
    rule("-");
    out.push({ text: `TOTAL${" ".repeat(Math.max(1, width - 12))}Rs. ${sample.total}`, bold: true, align: "left" });
    rule("=");
    if (settings.footer?.trim()) center(settings.footer.trim());
    return out;
}

export { PAPER };
