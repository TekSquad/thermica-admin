import { useMemo, useState } from "react";
import BarChart from "../components/BarChart";
import RangePicker from "../components/RangePicker";
import { Badge, Button, Card, Empty, ErrorNote, PageHeader, Segmented, Skeleton, Stat } from "../components/ui";
import useBills from "../hooks/useBills";
import { downloadCsv } from "../lib/csv";
import { billDay, eachDay, fmtDay, inr, istDateKey, istHourOf, shiftDay } from "../lib/format";

const hourLabel = (h) => (h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`);

function Table({ head, rows, right = [] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        {head.map((h, i) => (
                            <th key={h} className={`whitespace-nowrap px-4 py-2 ${right.includes(i) ? "text-right" : ""}`}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map((r, n) => (
                        <tr key={n}>
                            {r.map((c, i) => (
                                <td key={i} className={`whitespace-nowrap px-4 py-2.5 tabular-nums ${right.includes(i) ? "text-right" : ""} ${i === 0 ? "font-bold text-slate-900" : "text-slate-600"}`}>
                                    {c}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function Reports() {
    const today = istDateKey();
    const [range, setRange] = useState({ from: shiftDay(today, -6), to: today });
    const [tab, setTab] = useState("items");
    const [itemSort, setItemSort] = useState("revenue");
    const { bills, loading, error, reload } = useBills(range.from, range.to);

    const A = useMemo(() => {
        const items = new Map();
        const staff = new Map();
        const days = new Map(eachDay(range.from, range.to).map((k) => [k, { day: k, revenue: 0, count: 0, voids: 0 }]));
        const hours = Array(24).fill(0);
        let revenue = 0, count = 0, voids = 0;

        bills.forEach((b) => {
            const k = b.createdByEmail || "unknown";
            const s = staff.get(k) || { name: b.createdByName || k, count: 0, revenue: 0, voids: 0 };
            const d = days.get(billDay(b));
            staff.set(k, s);

            if (b.status === "void") {
                voids += 1;
                s.voids += 1;
                if (d) d.voids += 1;
                return;
            }
            revenue += b.total;
            count += 1;
            s.count += 1;
            s.revenue += b.total;
            if (d) {
                d.revenue += b.total;
                d.count += 1;
            }
            hours[istHourOf(b.ts)] += 1;
            b.items.forEach((i) => {
                const x = items.get(i.name) || { name: i.name, qty: 0, revenue: 0 };
                x.qty += i.qty;
                x.revenue += i.price * i.qty;
                items.set(i.name, x);
            });
        });

        const used = hours.map((v, h) => (v ? h : -1)).filter((h) => h >= 0);
        const lo = used.length ? Math.min(...used) : 0;
        const hi = used.length ? Math.max(...used) : 0;
        const peak = used.length ? hours.indexOf(Math.max(...hours)) : -1;

        return {
            revenue, count, voids,
            items: [...items.values()],
            staff: [...staff.values()].sort((a, b) => b.revenue - a.revenue),
            days: [...days.values()],
            hours, peak,
            hourChart: used.length
                ? Array.from({ length: hi - lo + 1 }, (_, i) => ({ key: lo + i, label: hourLabel(lo + i), value: hours[lo + i], active: lo + i === peak }))
                : [],
        };
    }, [bills, range]);

    const items = useMemo(
        () => [...A.items].sort((a, b) => (itemSort === "qty" ? b.qty - a.qty : b.revenue - a.revenue)),
        [A.items, itemSort],
    );
    const topItem = items[0] ? (itemSort === "qty" ? items[0].qty : items[0].revenue) : 1;
    const activeDays = A.days.filter((d) => d.count > 0).length;
    const label = `${fmtDay(range.from)} – ${fmtDay(range.to)}`;
    const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(0)}%` : "0%");

    const exportCsv = () => {
        const name = `thermica-${tab}-${range.from}_to_${range.to}.csv`;
        if (tab === "items")
            downloadCsv(name, [["Item", "Quantity", "Revenue"], ...items.map((i) => [i.name, i.qty, i.revenue])]);
        else if (tab === "hours")
            downloadCsv(name, [["Hour", "Bills"], ...A.hours.map((v, h) => [`${String(h).padStart(2, "0")}:00`, v])]);
        else if (tab === "staff")
            downloadCsv(name, [["Staff", "Bills", "Revenue", "Average bill", "Voided", "Void rate"], ...A.staff.map((s) => [s.name, s.count, s.revenue, s.count ? Math.round(s.revenue / s.count) : 0, s.voids, pct(s.voids, s.count + s.voids)])]);
        else
            downloadCsv(name, [["Date", "Bills", "Revenue", "Average bill", "Voided"], ...A.days.map((d) => [d.day, d.count, d.revenue, d.count ? Math.round(d.revenue / d.count) : 0, d.voids])]);
    };

    return (
        <>
            <PageHeader
                title="Reports"
                desc={label}
                actions={
                    <>
                        <Button variant="secondary" icon="refresh" onClick={reload}>Refresh</Button>
                        <Button icon="download" disabled={!bills.length} onClick={exportCsv}>Export CSV</Button>
                    </>
                }
            />
            <ErrorNote error={error} onRetry={reload} />
            <RangePicker value={range} onChange={setRange} />

            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Revenue" icon="trend" loading={loading && !bills.length} value={inr(A.revenue)} sub={`${activeDays} active day${activeDays === 1 ? "" : "s"}`} />
                <Stat label="Bills" icon="receipt" loading={loading && !bills.length} value={A.count} sub="Completed" />
                <Stat label="Average bill" icon="bag" loading={loading && !bills.length} value={inr(A.count ? A.revenue / A.count : 0)} />
                <Stat label="Voided" icon="alert" loading={loading && !bills.length} value={A.voids} sub={`${pct(A.voids, A.count + A.voids)} of all bills`} />
            </div>

            <Segmented
                className="mb-4"
                value={tab}
                onChange={setTab}
                options={[["items", "Items"], ["hours", "Peak hours"], ["staff", "Staff"], ["days", "Days"]]}
            />

            {loading && !bills.length ? (
                <Skeleton className="h-72" />
            ) : bills.length === 0 ? (
                <Card><Empty icon="chart" title="No bills in this range" hint="Pick a different range to see reports." /></Card>
            ) : tab === "items" ? (
                <Card
                    title="Best sellers"
                    desc={`${items.length} item${items.length === 1 ? "" : "s"} sold`}
                    pad={false}
                    actions={<Segmented value={itemSort} onChange={setItemSort} options={[["revenue", "By revenue"], ["qty", "By quantity"]]} />}>
                    <ul className="divide-y divide-slate-100">
                        {items.slice(0, 100).map((i, n) => (
                            <li key={i.name} className="flex items-center gap-4 px-5 py-3">
                                <span className="w-6 text-xs font-extrabold text-slate-400">{n + 1}</span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <span className="truncate text-sm font-bold text-slate-900">{i.name}</span>
                                        <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{inr(i.revenue)}</span>
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-3">
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                            <div className="h-full rounded-full bg-slate-900" style={{ width: `${((itemSort === "qty" ? i.qty : i.revenue) / topItem) * 100}%` }} />
                                        </div>
                                        <span className="w-16 shrink-0 text-right text-xs text-slate-500">{i.qty} sold</span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            ) : tab === "hours" ? (
                <Card title="Bills by hour" desc={A.peak >= 0 ? `Busiest hour: ${hourLabel(A.peak)} with ${A.hours[A.peak]} bills` : undefined}>
                    {A.hourChart.length ? <BarChart data={A.hourChart} /> : <Empty icon="chart" title="No completed bills" />}
                    <p className="mt-4 text-xs text-slate-500">Counts completed bills across the whole range, in Indian Standard Time.</p>
                </Card>
            ) : tab === "staff" ? (
                <Card title="Staff performance" desc="Voids are counted against the person who made the bill" pad={false}>
                    <Table
                        head={["Staff", "Bills", "Revenue", "Average", "Voided", "Void rate"]}
                        right={[1, 2, 3, 4, 5]}
                        rows={A.staff.map((s) => [
                            s.name,
                            s.count,
                            inr(s.revenue),
                            inr(s.count ? s.revenue / s.count : 0),
                            s.voids,
                            <Badge key="r" tone={s.voids / Math.max(1, s.count + s.voids) > 0.1 ? "red" : "slate"}>{pct(s.voids, s.count + s.voids)}</Badge>,
                        ])}
                    />
                </Card>
            ) : (
                <Card title="Daily summary" pad={false}>
                    <Table
                        head={["Date", "Bills", "Revenue", "Average", "Voided"]}
                        right={[1, 2, 3, 4]}
                        rows={[...A.days].reverse().map((d) => [
                            fmtDay(d.day, { year: true }),
                            d.count,
                            inr(d.revenue),
                            inr(d.count ? d.revenue / d.count : 0),
                            d.voids,
                        ])}
                    />
                </Card>
            )}
        </>
    );
}