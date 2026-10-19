import { useCallback, useEffect, useMemo, useState } from "react";
import { useFeedback } from "../components/Feedback";
import Icon from "../components/Icon";
import { Badge, Button, Card, Empty, ErrorNote, Field, Modal, PageHeader, Skeleton, Stat } from "../components/ui";
import useBills from "../hooks/useBills";
import { downloadCsv } from "../lib/csv";
import { fmtDay, fmtStamp, inr, istDateKey, round2 } from "../lib/format";
import { fetchClosings, saveClosing } from "../services/closings";

function DiffBadge({ diff }) {
    const d = round2(diff);
    if (d === 0) return <Badge tone="green">Exact</Badge>;
    if (d > 0) return <Badge tone="blue">+{inr(d)} Over</Badge>;
    return <Badge tone="red">-{inr(Math.abs(d))} Short</Badge>;
}

function CloseModal({ day, summary, existing, user, onClose, onSaved }) {
    const { toast } = useFeedback();
    const [openingCash, setOpeningCash] = useState(existing?.openingCash ?? 0);
    const [countedCash, setCountedCash] = useState(existing?.countedCash ?? "");
    const [note, setNote] = useState(existing?.note ?? "");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const opening = Number(openingCash) || 0;
    const counted = countedCash === "" ? null : Number(countedCash);
    const expected = round2(opening + summary.cashSales);
    const diff = counted === null ? null : round2(counted - expected);

    const save = async () => {
        if (!Number.isFinite(opening) || opening < 0) return setErr("Enter a valid opening cash amount.");
        if (counted === null || !Number.isFinite(counted) || counted < 0) return setErr("Enter the counted cash in the drawer.");
        setBusy(true);
        try {
            await saveClosing(
                day,
                {
                    openingCash: opening,
                    cashSales: summary.cashSales,
                    upiSales: summary.upiSales,
                    otherSales: summary.otherSales,
                    billCount: summary.billCount,
                    voidCount: summary.voidCount,
                    countedCash: counted,
                    note,
                },
                user,
            );
            toast(`Day close saved for ${fmtDay(day)}`);
            onSaved();
        } catch (e) {
            setErr(e.code === "permission-denied" ? "Permission denied." : e.message);
            setBusy(false);
        }
    };

    return (
        <Modal
            title={`Close drawer · ${fmtDay(day)}`}
            onClose={onClose}
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button loading={busy} onClick={save}>{existing ? "Update close" : "Save day close"}</Button>
                </div>
            }>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5 text-sm">
                    <div>
                        <div className="text-xs font-bold uppercase text-slate-400">Cash sales</div>
                        <div className="mt-0.5 font-extrabold tabular-nums text-slate-900">{inr(summary.cashSales)}</div>
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase text-slate-400">UPI / Other</div>
                        <div className="mt-0.5 font-extrabold tabular-nums text-slate-900">{inr(summary.upiSales + summary.otherSales)}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Opening cash (₹)" hint="Float at start of day">
                        <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            className="input"
                            value={openingCash}
                            onChange={(e) => setOpeningCash(e.target.value)}
                        />
                    </Field>
                    <Field label="Counted cash (₹)" hint="Physical cash in drawer">
                        <input
                            autoFocus
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            className="input"
                            placeholder="0"
                            value={countedCash}
                            onChange={(e) => setCountedCash(e.target.value)}
                        />
                    </Field>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
                    <div>
                        <div className="text-xs font-bold uppercase text-slate-400">Expected cash</div>
                        <div className="mt-0.5 text-base font-black tabular-nums text-slate-900">{inr(expected)}</div>
                    </div>
                    {diff !== null && (
                        <div className="text-right">
                            <div className="text-xs font-bold uppercase text-slate-400">Difference</div>
                            <div className="mt-1"><DiffBadge diff={diff} /></div>
                        </div>
                    )}
                </div>

                <Field label="Note (optional)">
                    <input
                        className="input"
                        maxLength={200}
                        placeholder="e.g. Milk payout ₹150 or handover note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                </Field>

                {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
            </div>
        </Modal>
    );
}

export default function Closings({ user }) {
    const today = istDateKey();
    const [day, setDay] = useState(today);
    const [modalOpen, setModalOpen] = useState(false);
    const [history, setHistory] = useState({ rows: [], loading: true, error: null });
    const { bills, loading: billsLoading, error: billsError, reload: reloadBills } = useBills(day, day);

    const loadHistory = useCallback(async () => {
        setHistory((s) => ({ ...s, loading: true, error: null }));
        try {
            setHistory({ rows: await fetchClosings(90), loading: false, error: null });
        } catch (error) {
            setHistory((s) => ({ ...s, loading: false, error }));
        }
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const summary = useMemo(() => {
        let cashSales = 0, upiSales = 0, otherSales = 0, billCount = 0, voidCount = 0;
        bills.forEach((b) => {
            if (b.status === "void") {
                voidCount += 1;
                return;
            }
            billCount += 1;
            if (b.method === "CASH") cashSales += b.total;
            else if (b.method === "UPI") upiSales += b.total;
            else otherSales += b.total;
        });
        return {
            cashSales: round2(cashSales),
            upiSales: round2(upiSales),
            otherSales: round2(otherSales),
            billCount,
            voidCount,
        };
    }, [bills]);

    const selectedClose = useMemo(() => history.rows.find((r) => r.day === day) || null, [history.rows, day]);
    const expectedCash = round2((selectedClose?.openingCash ?? 0) + summary.cashSales);

    const refreshAll = () => {
        reloadBills();
        loadHistory();
    };

    const exportCsv = () => {
        const rows = [
            ["Date", "Opening Cash", "Cash Sales", "Expected Cash", "Counted Cash", "Difference", "UPI Sales", "Other Sales", "Bills", "Voids", "Closed By", "Note"],
            ...history.rows.map((r) => [
                r.day,
                r.openingCash ?? 0,
                r.cashSales ?? 0,
                r.expectedCash ?? 0,
                r.countedCash ?? 0,
                r.difference ?? 0,
                r.upiSales ?? 0,
                r.otherSales ?? 0,
                r.billCount ?? 0,
                r.voidCount ?? 0,
                r.closedByName || r.closedByEmail || "",
                r.note || "",
            ]),
        ];
        downloadCsv(`thermica-closings-${today}.csv`, rows);
    };

    return (
        <>
            <PageHeader
                title="Day close"
                desc="Expected vs counted cash in the drawer"
                actions={
                    <>
                        <Button variant="secondary" icon="refresh" onClick={refreshAll}>Refresh</Button>
                        <Button variant="secondary" icon="download" disabled={!history.rows.length} onClick={exportCsv}>Export CSV</Button>
                        <Button icon="check" disabled={billsLoading} onClick={() => setModalOpen(true)}>
                            {selectedClose ? "Update close" : "Close day"}
                        </Button>
                    </>
                }
            />
            <ErrorNote error={billsError || history.error} onRetry={refreshAll} />

            <Card className="mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                        <Icon name="calendar" className="h-4 w-4 text-slate-400" />
                        <span className="font-bold text-slate-700">Selected day:</span>
                        <input
                            type="date"
                            aria-label="Day"
                            value={day}
                            max={today}
                            onChange={(e) => e.target.value && setDay(e.target.value)}
                            className="input !w-auto !py-1.5"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedClose ? (
                            <>
                                <Badge tone="green">Closed</Badge>
                                <span className="text-xs text-slate-500">
                                    by {selectedClose.closedByName || selectedClose.closedByEmail} · {fmtStamp(selectedClose.closedAt)}
                                </span>
                            </>
                        ) : (
                            <Badge tone="amber">Open</Badge>
                        )}
                    </div>
                </div>
            </Card>

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat
                    label="Cash sales"
                    icon="receipt"
                    loading={billsLoading}
                    value={inr(summary.cashSales)}
                    sub={`${summary.billCount} completed bill${summary.billCount === 1 ? "" : "s"}`}
                />
                <Stat
                    label="Expected cash"
                    icon="trend"
                    loading={billsLoading}
                    value={inr(expectedCash)}
                    sub={`Opening ${inr(selectedClose?.openingCash ?? 0)} + cash sales`}
                />
                <Stat
                    label="Counted cash"
                    icon="bag"
                    loading={history.loading}
                    value={selectedClose ? inr(selectedClose.countedCash) : "—"}
                    sub={selectedClose ? "Recorded in drawer" : "Not counted yet"}
                />
                <Stat
                    label="Difference"
                    icon="shield"
                    loading={history.loading || billsLoading}
                    value={selectedClose ? inr(round2(selectedClose.countedCash - expectedCash)) : "—"}
                    sub={selectedClose ? <DiffBadge diff={selectedClose.countedCash - expectedCash} /> : "Close day to compare"}
                />
            </div>

            <Card title="Recent day closes" desc="Latest 90 days" pad={false}>
                {history.loading && !history.rows.length ? (
                    <div className="p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="mb-2 h-14" />)}</div>
                ) : history.rows.length === 0 ? (
                    <Empty icon="receipt" title="No day closes yet" hint="Close today's drawer to record expected vs counted cash." />
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {history.rows.map((r) => (
                            <li
                                key={r.id}
                                onClick={() => setDay(r.day)}
                                className={`flex cursor-pointer flex-wrap items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-slate-50 ${r.day === day ? "bg-slate-50/80" : ""}`}>
                                <div className="min-w-0 flex-1 basis-52">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-900">{fmtDay(r.day, { year: true })}</span>
                                        <DiffBadge diff={r.difference} />
                                    </div>
                                    <div className="mt-0.5 truncate text-xs text-slate-500">
                                        {r.closedByName || r.closedByEmail} · {fmtStamp(r.closedAt)}
                                        {r.note ? ` · "${r.note}"` : ""}
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-right text-sm tabular-nums">
                                    <div>
                                        <div className="text-[11px] font-bold uppercase text-slate-400">Expected</div>
                                        <div className="font-bold text-slate-700">{inr(r.expectedCash)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold uppercase text-slate-400">Counted</div>
                                        <div className="font-extrabold text-slate-900">{inr(r.countedCash)}</div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            {modalOpen && (
                <CloseModal
                    day={day}
                    summary={summary}
                    existing={selectedClose}
                    user={user}
                    onClose={() => setModalOpen(false)}
                    onSaved={() => {
                        setModalOpen(false);
                        loadHistory();
                    }}
                />
            )}
        </>
    );
}