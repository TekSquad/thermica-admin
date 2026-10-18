import Icon from "./Icon";
import { Card, Segmented } from "./ui";
import { daysBetween, istDateKey, shiftDay } from "../lib/format";

export const MAX_DAYS = 62;

/** value: { from, to } (IST day keys). Keeps the range valid and at most 62 days. */
export default function RangePicker({ value, onChange }) {
    const today = istDateKey();

    const apply = (from, to, changed) => {
        if (!from || !to) return;
        if (from > today) from = today;
        if (to > today) to = today;
        if (from > to) changed === "from" ? (to = from) : (from = to);
        if (daysBetween(from, to) > MAX_DAYS) {
            changed === "from" ? (to = shiftDay(from, MAX_DAYS)) : (from = shiftDay(to, -MAX_DAYS));
            if (to > today) to = today;
        }
        onChange({ from, to });
    };

    const presets = [
        ["Today", today, today],
        ["Yesterday", shiftDay(today, -1), shiftDay(today, -1)],
        ["Last 7 days", shiftDay(today, -6), today],
        ["Last 30 days", shiftDay(today, -29), today],
        ["This month", `${today.slice(0, 7)}-01`, today],
    ];
    const current = presets.find(([, a, b]) => a === value.from && b === value.to)?.[0] ?? "";

    return (
        <Card className="mb-4">
            <div className="flex flex-wrap items-center gap-3">
                <Segmented
                    value={current}
                    onChange={(label) => {
                        const p = presets.find(([l]) => l === label);
                        apply(p[1], p[2], "from");
                    }}
                    options={presets.map(([l]) => [l, l])}
                />
                <div className="flex items-center gap-2 text-sm">
                    <Icon name="calendar" className="h-4 w-4 text-slate-400" />
                    <input type="date" aria-label="From" value={value.from} max={today} onChange={(e) => apply(e.target.value, value.to, "from")} className="input !w-auto !py-1.5" />
                    <span className="text-slate-400">to</span>
                    <input type="date" aria-label="To" value={value.to} max={today} onChange={(e) => apply(value.from, e.target.value, "to")} className="input !w-auto !py-1.5" />
                </div>
                <span className="text-xs text-slate-400">Up to {MAX_DAYS} days at a time</span>
            </div>
        </Card>
    );
}