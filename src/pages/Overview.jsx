import { useMemo } from "react";
import BarChart from "../components/BarChart";
import { Badge, Button, Card, Empty, ErrorNote, PageHeader, Stat } from "../components/ui";
import useBills from "../hooks/useBills";
import { billDay, compactInr, eachDay, fmtTime, fmtWeekday, inr, istDateKey, istHour, shiftDay } from "../lib/format";

const greeting = () => {
    const h = istHour();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
const PAY = [["CASH", "Cash", "bg-emerald-500"], ["UPI", "UPI", "bg-sky-500"], ["OTHER", "Other", "bg-slate-400"]];

export default function Overview({ user }) {
    const today = istDateKey();
    const from = shiftDay(today, -6);
    const { bills, loading, error, at, reload } = useBills(from, today);

    const d = useMemo(() => {
        const days = eachDay(from, today);
        const byDay = new Map(days.map((k) => [k, { revenue: 0, count: 0 }]));
        const pay = { CASH: 0, UPI: 0, OTHER: 0 };
        const staff = new Map();
        const items = new Map();
        let voided = 0;

        bills.forEach((b) => {
            const day = billDay(b);
            const isToday = day === today;
            if (b.status === "void") {
                if (isToday) voided += 1;
                return;
            }
            const e = byDay.get(day);
            if (e) {
                e.revenue += b.total;
                e.count += 1;
            }
            b.items.forEach((i) => {
                const x = items.get(i.name) || { name: i.name, qty: 0, revenue: 0 };
                x.qty += i.qty;
                x.revenue += i.price * i.qty;
                items.set(i.name, x);
            });
            if (isToday) {
                pay[b.method in pay ? b.method : "OTHER"] += b.total;
                const k = b.createdByEmail || "unknown";
                const s = staff.get(k) || { name: b.createdByName || k, count: 0, revenue: 0 };
                s.count += 1;
                s.revenue += b.total;
                staff.set(k, s);
            }
        });

        const tod = byDay.get(today);
        const yes = byDay.get(shiftDay(today, -1));
        return {
            tod,
            voided,
            pay,
            avg: tod.count ? tod.revenue / tod.count : 0,
            delta: yes.revenue ? ((tod.revenue - yes.revenue) / yes.revenue) * 100 : null,
            chart: days.map((k) => ({ key: k, label: fmtWeekday(k), value: byDay.get(k).revenue, active: k === today })),
            staff: [...staff.values()].sort((a, b) => b.revenue - a.revenue),
            items: [...items.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
            week: [...byDay.values()].reduce((s, x) => s + x.revenue, 0),
        };
    }, [bills, from, today]);

    const payTotal = d.pay.CASH + d.pay.UPI + d.pay.OTHER;
    const topRevenue = d.items[0]?.revenue || 1;
    const first = user.name.split(" ")[0];

    return (
        <>
            <PageHeader
                title={`${greeting()}, ${first}`}
                desc={at ? `Updated ${fmtTime(new Date(at).toISOString())}` : "Loading today's numbers…"}
                actions={<Button variant="secondary" icon="refresh" loading={loading && !!at} onClick={reload}>Refresh</Button>}
            />
            <ErrorNote error={error} onRetry={reload} />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat
                    label="Today's revenue"
                    icon="trend"
                    loading={loading && !at}
                    value={inr(d.tod.revenue)}
                    sub={
                        d.delta === null ? "No sales yesterday" : (
                            <Badge tone={d.delta >= 0 ? "green" : "red"}>
                                {d.delta >= 0 ? "▲" : "▼"} {Math.abs(d.delta).toFixed(0)}% vs yesterday
                            </Badge>
                        )
                    }
                />
                <Stat label="Bills today" icon="receipt" loading={loading && !at} value={d.tod.count} sub="Completed bills" />
                <Stat label="Average bill" icon="bag" loading={loading && !at} value={inr(d.avg)} sub="Per completed bill" />
                <Stat label="Voided today" icon="alert" loading={loading && !at} value={d.voided} sub="Not counted in revenue" />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <Card title="Last 7 days" desc={`${inr(d.week)} in total`} className="lg:col-span-2">
                    <BarChart data={d.chart} format={compactInr} />
                </Card>

                <Card title="Payment mix" desc="Today">
                    {payTotal === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-500">No sales yet today.</p>
                    ) : (
                        <>
                            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                                {PAY.map(([k, , color]) => (
                                    <div key={k} className={color} style={{ width: `${(d.pay[k] / payTotal) * 100}%` }} />
                                ))}
                            </div>
                            <ul className="mt-4 space-y-3">
                                {PAY.map(([k, label, color]) => (
                                    <li key={k} className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 font-semibold text-slate-600">
                                            <span className={`h-2.5 w-2.5 rounded-full ${color}`} /> {label}
                                        </span>
                                        <span className="font-bold tabular-nums text-slate-900">{inr(d.pay[k])}</span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </Card>

                <Card title="Top items" desc="Last 7 days, by revenue" className="lg:col-span-2" pad={false}>
                    {d.items.length === 0 ? (
                        <Empty icon="receipt" title="No sales in the last 7 days" />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {d.items.map((i, n) => (
                                <li key={i.name} className="flex items-center gap-4 px-5 py-3">
                                    <span className="w-5 text-xs font-extrabold text-slate-400">{n + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <span className="truncate text-sm font-bold text-slate-900">{i.name}</span>
                                            <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{inr(i.revenue)}</span>
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-3">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                                <div className="h-full rounded-full bg-slate-900" style={{ width: `${(i.revenue / topRevenue) * 100}%` }} />
                                            </div>
                                            <span className="w-14 shrink-0 text-right text-xs text-slate-500">{i.qty} sold</span>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card title="Staff today" pad={false}>
                    {d.staff.length === 0 ? (
                        <Empty icon="receipt" title="No bills yet today" />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {d.staff.map((s) => (
                                <li key={s.name} className="flex items-center justify-between gap-3 px-5 py-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-bold text-slate-900">{s.name}</div>
                                        <div className="text-xs text-slate-500">{s.count} bill{s.count === 1 ? "" : "s"}</div>
                                    </div>
                                    <span className="text-sm font-bold tabular-nums text-slate-900">{inr(s.revenue)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </>
    );
}