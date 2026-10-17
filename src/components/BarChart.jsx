const H = 140;

export default function BarChart({ data, format = (v) => v }) {
    const max = Math.max(1, ...data.map((d) => d.value));
    return (
        <div className="flex items-end gap-2 sm:gap-3">
            {data.map((d) => {
                const h = d.value ? Math.max(4, Math.round((d.value / max) * H)) : 2;
                return (
                    <div key={d.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${d.label}: ${format(d.value)}`}>
                        <span className="h-4 text-[10px] font-bold tabular-nums text-slate-500">{d.value ? format(d.value) : ""}</span>
                        <div className="flex w-full items-end" style={{ height: H }}>
                            <div
                                className={`w-full rounded-t-lg transition-all ${d.active ? "bg-brand-600" : "bg-slate-300"}`}
                                style={{ height: h }}
                            />
                        </div>
                        <span className={`text-[11px] font-semibold ${d.active ? "text-slate-900" : "text-slate-500"}`}>{d.label}</span>
                    </div>
                );
            })}
        </div>
    );
}