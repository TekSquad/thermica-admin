import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import { Badge, Button, Card, Empty, ErrorNote, PageHeader, Segmented, Skeleton } from "../components/ui";
import { fmtStamp, fmtToken, inr } from "../lib/format";
import { fetchAudit } from "../services/audit";

const TYPES = {
    bill_voided: { label: "Voided", tone: "red" },
    bill_reprinted: { label: "Reprinted", tone: "blue" },
};

export default function Audit() {
    const [state, setState] = useState({ rows: [], loading: true, error: null });
    const [type, setType] = useState("all");
    const [q, setQ] = useState("");

    const load = useCallback(async () => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            setState({ rows: await fetchAudit(200), loading: false, error: null });
        } catch (error) {
            setState((s) => ({ ...s, loading: false, error }));
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const shown = useMemo(() => {
        const query = q.trim().toLowerCase().replace(/^#/, "");
        return state.rows.filter(
            (r) =>
                (type === "all" || r.type === type) &&
                (!query ||
                    [r.billId, r.byName, r.byEmail, r.reason, r.token != null ? fmtToken({ token: r.token }) : ""]
                        .join(" ")
                        .toLowerCase()
                        .includes(query)),
        );
    }, [state.rows, type, q]);

    return (
        <>
            <PageHeader
                title="Audit log"
                desc="The latest 200 voids and reprints"
                actions={<Button variant="secondary" icon="refresh" onClick={load}>Refresh</Button>}
            />
            <ErrorNote error={state.error} onRetry={load} />

            <Card pad={false}>
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
                    <Segmented value={type} onChange={setType} options={[["all", "All"], ["bill_voided", "Voids"], ["bill_reprinted", "Reprints"]]} />
                    <div className="relative min-w-52 flex-1">
                        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input className="input !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bill, token, staff or reason" />
                    </div>
                </div>

                {state.loading && !state.rows.length ? (
                    <div className="p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="mb-2 h-14" />)}</div>
                ) : shown.length === 0 ? (
                    <Empty icon="shield" title="Nothing to show" hint="Voids and reprints will appear here." />
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {shown.map((r) => {
                            const t = TYPES[r.type] || { label: r.type, tone: "slate" };
                            return (
                                <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3">
                                    <Badge tone={t.tone} className="w-20 justify-center">{t.label}</Badge>
                                    <div className="min-w-0 flex-1 basis-56">
                                        <div className="truncate text-sm font-bold text-slate-900">
                                            {r.token != null && <span className="mr-1.5 rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-black text-white">#{fmtToken({ token: r.token })}</span>}
                                            {r.billId}
                                        </div>
                                        <div className="truncate text-xs text-slate-500">
                                            {r.byName || r.byEmail} · {r.deviceId || "—"}{r.reason ? ` · ${r.reason}` : ""}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {r.total != null && <div className="text-sm font-bold tabular-nums text-slate-900">{inr(r.total)}</div>}
                                        <div className="text-xs text-slate-500">{fmtStamp(r.at)}</div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Card>
        </>
    );
}