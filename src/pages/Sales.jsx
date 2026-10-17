import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import { useFeedback } from "../components/Feedback";
import { Badge, Button, Card, Empty, ErrorNote, Modal, PageHeader, Segmented, Stat } from "../components/ui";
import useBills from "../hooks/useBills";
import { downloadCsv } from "../lib/csv";
import {
    billDay, billToken, daysBetween, fmtDateTime, fmtDay, fmtStamp, fmtTime, fmtToken, inr, istDateKey, shiftDay,
} from "../lib/format";
import { voidBill } from "../services/bills";

const MAX_DAYS = 62;
const REASONS = ["Wrong item", "Customer cancelled", "Payment issue", "Test bill", "Other"];
const SORTERS = {
    newest: (a, b) => b.ts.localeCompare(a.ts),
    oldest: (a, b) => a.ts.localeCompare(b.ts),
    high: (a, b) => b.total - a.total,
    low: (a, b) => a.total - b.total,
    token: (a, b) => billToken(a) - billToken(b),
};
const DEFAULT_F = { staff: "all", method: "all", status: "all", type: "all", sort: "newest" };

function BillModal({ bill, user, onClose, onChanged }) {
    const { toast } = useFeedback();
    const [voiding, setVoiding] = useState(false);
    const [reason, setReason] = useState("");
    const [other, setOther] = useState("");
    const [busy, setBusy] = useState(false);
    const isVoid = bill.status === "void";
    const finalReason = reason === "Other" ? other.trim() : reason;

    const confirmVoid = async () => {
        setBusy(true);
        try {
            await voidBill(bill, user, finalReason);
            toast(`Bill ${bill.id} voided`);
            onChanged();
        } catch (e) {
            toast(e.code === "permission-denied" ? "Not allowed to void this bill." : e.message, "error");
            setBusy(false);
        }
    };

    return (
        <Modal
            title={`Token #${fmtToken(bill)}`}
            onClose={onClose}
            footer={
                voiding ? (
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setVoiding(false)} disabled={busy}>Back</Button>
                        <Button variant="danger" disabled={!finalReason} loading={busy} onClick={confirmVoid}>Void bill</Button>
                    </div>
                ) : (
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={onClose}>Close</Button>
                        {!isVoid && <Button variant="danger" onClick={() => setVoiding(true)}>Void bill</Button>}
                    </div>
                )
            }>
            {voiding ? (
                <div>
                    <p className="text-sm text-slate-600">
                        Void {inr(bill.total)}? It stops counting towards sales and is recorded in the audit log. Why?
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {REASONS.map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setReason(r)}
                                className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${reason === r ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                                {r}
                            </button>
                        ))}
                    </div>
                    {reason === "Other" && (
                        <input autoFocus maxLength={80} value={other} onChange={(e) => setOther(e.target.value)} placeholder="Short reason" className="input mt-3" />
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <div className="font-mono text-xs font-semibold text-slate-500">{bill.id}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            <span>{fmtDateTime(bill.ts)}</span>
                            <Badge>{bill.method}</Badge>
                            <Badge>{bill.type === "TAKEAWAY" ? "Takeaway" : "Dine-in"}</Badge>
                            {isVoid && <Badge tone="red">VOIDED</Badge>}
                        </div>
                    </div>

                    <div className="space-y-1 rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-600">
                        <div>Billed by <b className="text-slate-900">{bill.createdByName || bill.createdByEmail || "Unknown"}</b>{bill.deviceId ? ` · device ${bill.deviceId}` : ""}</div>
                        {isVoid && (
                            <div className="font-semibold text-red-600">
                                Voided by {bill.voidedByName || bill.voidedByEmail || "Unknown"} · {fmtStamp(bill.voidedAt)}
                                {bill.voidReason ? ` · ${bill.voidReason}` : ""}
                            </div>
                        )}
                    </div>

                    {bill.note && <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">Note: {bill.note}</p>}

                    <div className="divide-y divide-slate-100">
                        {bill.items.map((it, n) => (
                            <div key={`${it.id}-${n}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                                <span className="min-w-0 flex-1"><b>{it.qty}×</b> {it.name}</span>
                                <span className="font-bold tabular-nums">{inr(it.price * it.qty)}</span>
                            </div>
                        ))}
                    </div>

                    <div className={`flex justify-between border-t border-slate-200 pt-3 text-lg font-extrabold tabular-nums ${isVoid ? "text-slate-400 line-through" : "text-slate-900"}`}>
                        <span>Total</span>
                        <span>{inr(bill.total)}</span>
                    </div>
                </div>
            )}
        </Modal>
    );
}

function BillRow({ b, onOpen }) {
    const isVoid = b.status === "void";
    const amount = <span className={`font-extrabold tabular-nums ${isVoid ? "text-slate-400 line-through" : "text-slate-900"}`}>{inr(b.total)}</span>;
    return (
        <button type="button" onClick={() => onOpen(b)} className="block w-full px-4 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100">
            {/* mobile */}
            <div className="flex items-center gap-3 md:hidden">
                <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-xs font-black text-white">#{fmtToken(b)}</span>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900">{b.id}</div>
                    <div className="truncate text-xs text-slate-500">{fmtTime(b.ts)} · {b.createdByName || "Unknown"} · {b.method}</div>
                </div>
                <div className="text-right">
                    <div className="text-sm">{amount}</div>
                    <div className={`text-[11px] font-bold ${isVoid ? "text-red-600" : "text-emerald-600"}`}>{isVoid ? "Voided" : "Completed"}</div>
                </div>
            </div>
            {/* desktop */}
            <div className="hidden items-center gap-4 md:grid md:grid-cols-[4rem_minmax(0,1.4fr)_minmax(0,1fr)_8rem_6rem_6rem]">
                <span className="w-fit rounded-md bg-slate-900 px-1.5 py-0.5 text-xs font-black text-white">#{fmtToken(b)}</span>
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">{b.id}</div>
                    <div className="text-xs text-slate-500">{fmtDay(billDay(b))} · {fmtTime(b.ts)}</div>
                </div>
                <div className="truncate text-sm text-slate-600">{b.createdByName || b.createdByEmail || "Unknown"}</div>
                <div className="flex gap-1.5">
                    <Badge>{b.method}</Badge>
                    {b.type === "TAKEAWAY" && <Badge>Takeaway</Badge>}
                </div>
                <Badge tone={isVoid ? "red" : "green"} className="w-fit">{isVoid ? "Voided" : "Completed"}</Badge>
                <div className="text-right text-sm">{amount}</div>
            </div>
        </button>
    );
}

export default function Sales({ user }) {
    const today = istDateKey();
    const [range, setRange] = useState({ from: today, to: today });
    const [f, setF] = useState(DEFAULT_F);
    const [q, setQ] = useState("");
    const [limit, setLimit] = useState(50);
    const [open, setOpen] = useState(null);
    const { bills, loading, error, reload } = useBills(range.from, range.to);

    const apply = (from, to, changed) => {
        if (!from || !to) return;
        if (from > today) from = today;
        if (to > today) to = today;
        if (from > to) changed === "from" ? (to = from) : (from = to);
        if (daysBetween(from, to) > MAX_DAYS) {
            changed === "from" ? (to = shiftDay(from, MAX_DAYS)) : (from = shiftDay(to, -MAX_DAYS));
            if (to > today) to = today;
        }
        setRange({ from, to });
        setLimit(50);
    };

    const presets = [
        ["Today", today, today],
        ["Yesterday", shiftDay(today, -1), shiftDay(today, -1)],
        ["Last 7 days", shiftDay(today, -6), today],
        ["This month", `${today.slice(0, 7)}-01`, today],
    ];

    const people = useMemo(() => {
        const m = new Map();
        bills.forEach((b) => {
            const k = b.createdByEmail || "unknown";
            const e = m.get(k) || { email: k, name: b.createdByName || k, count: 0 };
            e.count += 1;
            m.set(k, e);
        });
        return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [bills]);

    const shown = useMemo(() => {
        const query = q.trim().toLowerCase().replace(/^#/, "");
        return bills
            .filter((b) => {
                if (f.staff !== "all" && (b.createdByEmail || "unknown") !== f.staff) return false;
                if (f.method !== "all" && b.method !== f.method) return false;
                if (f.status !== "all" && b.status !== f.status) return false;
                if (f.type !== "all" && (b.type || "DINE_IN") !== f.type) return false;
                if (!query) return true;
                return [b.id, fmtToken(b), b.method, b.note, b.createdByName, b.createdByEmail, b.voidedByName, ...b.items.map((i) => i.name)]
                    .join(" ")
                    .toLowerCase()
                    .includes(query);
            })
            .sort(SORTERS[f.sort]);
    }, [bills, f, q]);

    const done = shown.filter((b) => b.status !== "void");
    const revenue = done.reduce((s, b) => s + b.total, 0);
    const voided = shown.length - done.length;
    const filtering = q.trim() !== "" || Object.keys(DEFAULT_F).some((k) => k !== "sort" && f[k] !== DEFAULT_F[k]);
    const sel = (k) => (e) => {
        setF((c) => ({ ...c, [k]: e.target.value }));
        setLimit(50);
    };

    const exportCsv = () => {
        const rows = [["Bill ID", "Token", "Date", "Time", "Billed by", "Email", "Method", "Type", "Status", "Total", "Items", "Voided by", "Void reason", "Device"]];
        shown.forEach((b) =>
            rows.push([
                b.id, `#${fmtToken(b)}`, billDay(b), fmtTime(b.ts), b.createdByName || "", b.createdByEmail || "",
                b.method, b.type === "TAKEAWAY" ? "Takeaway" : "Dine-in", b.status, b.total,
                b.items.map((i) => `${i.qty}x ${i.name}`).join("; "), b.voidedByName || "", b.voidReason || "", b.deviceId || "",
            ]),
        );
        downloadCsv(`thermica-sales-${range.from}${range.to !== range.from ? `_to_${range.to}` : ""}.csv`, rows);
    };

    return (
        <>
            <PageHeader
                title="Sales"
                desc={range.from === range.to ? fmtDay(range.from, { year: true }) : `${fmtDay(range.from, { year: true })} – ${fmtDay(range.to, { year: true })}`}
                actions={
                    <>
                        <Button variant="secondary" icon="refresh" onClick={reload}>Refresh</Button>
                        <Button icon="download" disabled={!shown.length} onClick={exportCsv}>Export CSV</Button>
                    </>
                }
            />
            <ErrorNote error={error} onRetry={reload} />

            <Card className="mb-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Segmented
                        value={presets.find(([, a, b]) => a === range.from && b === range.to)?.[0] ?? ""}
                        onChange={(label) => {
                            const p = presets.find(([l]) => l === label);
                            apply(p[1], p[2], "from");
                        }}
                        options={presets.map(([l]) => [l, l])}
                    />
                    <div className="flex items-center gap-2 text-sm">
                        <Icon name="calendar" className="h-4 w-4 text-slate-400" />
                        <input type="date" aria-label="From" value={range.from} max={today} onChange={(e) => apply(e.target.value, range.to, "from")} className="input !w-auto !py-1.5" />
                        <span className="text-slate-400">to</span>
                        <input type="date" aria-label="To" value={range.to} max={today} onChange={(e) => apply(range.from, e.target.value, "to")} className="input !w-auto !py-1.5" />
                    </div>
                    <span className="text-xs text-slate-400">Up to {MAX_DAYS} days at a time</span>
                </div>
            </Card>

            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Revenue" icon="trend" loading={loading} value={inr(revenue)} sub={filtering ? "Filtered" : "All bills in range"} />
                <Stat label="Completed" icon="receipt" loading={loading} value={done.length} sub="Bills" />
                <Stat label="Average bill" icon="bag" loading={loading} value={inr(done.length ? revenue / done.length : 0)} />
                <Stat label="Voided" icon="alert" loading={loading} value={voided} sub="Not in revenue" />
            </div>

            <Card pad={false}>
                <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-6">
                    <div className="relative sm:col-span-2 lg:col-span-2">
                        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(50); }} placeholder="Token, bill, item or staff" className="input !pl-9" />
                    </div>
                    <select aria-label="Staff" className="input" value={f.staff} onChange={sel("staff")}>
                        <option value="all">All staff</option>
                        {people.map((p) => <option key={p.email} value={p.email}>{p.name} ({p.count})</option>)}
                    </select>
                    <select aria-label="Payment" className="input" value={f.method} onChange={sel("method")}>
                        <option value="all">All payments</option>
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="OTHER">Other</option>
                    </select>
                    <select aria-label="Status" className="input" value={f.status} onChange={sel("status")}>
                        <option value="all">All status</option>
                        <option value="completed">Completed</option>
                        <option value="void">Voided</option>
                    </select>
                    <select aria-label="Sort" className="input" value={f.sort} onChange={sel("sort")}>
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="high">Amount: high to low</option>
                        <option value="low">Amount: low to high</option>
                        <option value="token">Token number</option>
                    </select>
                </div>

                <div className="hidden grid-cols-[4rem_minmax(0,1.4fr)_minmax(0,1fr)_8rem_6rem_6rem] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 md:grid">
                    <span>Token</span><span>Bill</span><span>Staff</span><span>Payment</span><span>Status</span><span className="text-right">Total</span>
                </div>

                {loading && !bills.length ? (
                    <div className="divide-y divide-slate-100">
                        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-[60px] animate-pulse bg-slate-50" />)}
                    </div>
                ) : shown.length === 0 ? (
                    <Empty
                        icon="receipt"
                        title={bills.length ? "No bills match these filters" : "No bills in this range"}
                        action={filtering && <Button variant="secondary" onClick={() => { setF(DEFAULT_F); setQ(""); }}>Clear filters</Button>}
                    />
                ) : (
                    <div className="divide-y divide-slate-100">
                        {shown.slice(0, limit).map((b) => <BillRow key={b.docId} b={b} onOpen={setOpen} />)}
                    </div>
                )}

                {shown.length > limit && (
                    <div className="border-t border-slate-100 p-3 text-center">
                        <Button variant="ghost" onClick={() => setLimit((n) => n + 50)}>Show more ({shown.length - limit} left)</Button>
                    </div>
                )}
            </Card>

            {open && (
                <BillModal
                    bill={open}
                    user={user}
                    onClose={() => setOpen(null)}
                    onChanged={() => {
                        setOpen(null);
                        reload();
                    }}
                />
            )}
        </>
    );
}