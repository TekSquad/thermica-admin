import { useMemo, useState } from "react";
import { Card, Segmented } from "./ui";
import { PAPER, SAMPLE_BILL, buildReceipt } from "../lib/receipt";

export default function ReceiptPreview({ settings }) {
    const [paper, setPaper] = useState(58);
    const [copy, setCopy] = useState("customer");
    const lines = useMemo(() => buildReceipt(settings, SAMPLE_BILL, { copy, paper }), [settings, copy, paper]);
    const chars = PAPER[paper].chars;

    return (
        <Card
            title="Live preview"
            desc={`${paper}mm · ${chars} characters per line`}
            className="lg:sticky lg:top-6"
            actions={
                <Segmented
                    value={copy}
                    onChange={setCopy}
                    options={[["customer", "Customer"], ["kitchen", "Kitchen"]]}
                />
            }>
            <Segmented
                className="mb-4"
                value={paper}
                onChange={setPaper}
                options={Object.keys(PAPER).map((w) => [Number(w), `${w}mm`])}
            />
            <div className="max-h-[34rem] overflow-auto rounded-xl bg-slate-100 p-4">
                <div
                    className="mx-auto border border-slate-300 bg-[#fbfaf5] px-3 py-3 font-mono text-[11px] leading-[1.4] text-slate-800 shadow-sm"
                    style={{ width: `calc(${chars}ch + 1.5rem)` }}>
                    {lines.map((l, i) => (
                        <div
                            key={i}
                            className={`whitespace-pre ${l.align === "center" ? "text-center" : "text-left"} ${l.bold ? "font-bold" : ""} ${l.tall ? "mb-1.5 origin-top scale-y-[1.5] transform-gpu" : ""}`}>
                            {l.type === "image" ? <img src={l.data} alt="" className="mx-auto max-h-16 object-contain" /> : l.t || " "}
                        </div>
                    ))}
                    <div className="mt-2 border-t border-dashed border-slate-300 pt-1 text-center text-[10px] text-slate-400">
                        - - - end of copy - - -
                    </div>
                </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
                Layout matches what the POS prints. Paper width is set per device in the POS app.
            </p>
        </Card>
    );
}