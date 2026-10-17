import { useEffect, useMemo, useState } from "react";
import { useFeedback } from "../components/Feedback";
import ReceiptPreview from "../components/ReceiptPreview";
import { Button, Card, ErrorNote, Field, PageHeader, Segmented, Skeleton, Toggle } from "../components/ui";
import useWatch from "../hooks/useWatch";
import { processLogo } from "../lib/logo";
import { DEFAULT_SETTINGS } from "../lib/settings";
import { saveSettings, watchSettings } from "../services/settings";

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function ToggleRow({ label, hint, checked, onChange }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
                <div className="text-sm font-bold text-slate-800">{label}</div>
                {hint && <div className="text-xs text-slate-500">{hint}</div>}
            </div>
            <Toggle label={label} checked={checked} onChange={onChange} />
        </div>
    );
}

export default function Receipt() {
    const { toast } = useFeedback();
    const { data: remote, loading, error } = useWatch(watchSettings, [], null);
    const [draft, setDraft] = useState({});
    const [saving, setSaving] = useState(false);
    const [logoPaper, setLogoPaper] = useState(58);

    const base = useMemo(() => ({ ...DEFAULT_SETTINGS, ...(remote || {}) }), [remote]);
    const values = useMemo(() => ({ ...base, ...draft }), [base, draft]);
    const dirty = Object.keys(draft).length > 0;

    // Only keep fields that actually differ from what is saved.
    const set = (k, v) =>
        setDraft((d) => {
            const next = { ...d, [k]: v };
            if (same(base[k], v)) delete next[k];
            return next;
        });
    const bind = (k) => ({ value: values[k] ?? "", onChange: (e) => set(k, e.target.value) });

    useEffect(() => {
        if (!dirty) return;
        const warn = (e) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const save = async () => {
        setSaving(true);
        try {
            await saveSettings(draft);
            setDraft({});
            toast("Saved. POS devices update automatically.");
        } catch (e) {
            toast(e.code === "permission-denied" ? "Permission denied." : e.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const upload = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        try {
            set("logo", await processLogo(file, logoPaper));
            toast("Logo processed. Save to publish it.");
        } catch (err) {
            toast(err.message, "error");
        }
    };

    return (
        <>
            <PageHeader title="Receipt" desc="Shared by every POS device. Paper width and printer are set on each device." />
            <ErrorNote error={error} />

            {loading ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
                    <Skeleton className="h-96" />
                    <Skeleton className="h-96" />
                </div>
            ) : (
                <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
                    <div className="min-w-0 space-y-4">
                        <Card title="Header" desc="The top of every customer receipt">
                            <div className="space-y-4">
                                <Field label="Show">
                                    <Segmented value={values.headerMode} onChange={(v) => set("headerMode", v)} options={[["text", "Business name"], ["logo", "Logo image"]]} />
                                </Field>

                                {values.headerMode === "logo" ? (
                                    <div className="space-y-3">
                                        <Field label="Logo width" hint="Wider paper allows a larger logo.">
                                            <Segmented value={logoPaper} onChange={setLogoPaper} options={[[58, "50 / 58 mm"], [80, "80 mm"]]} />
                                        </Field>
                                        <Field label="Logo image" hint="Cropped, scaled and converted to black and white automatically.">
                                            <input type="file" accept="image/*" onChange={upload} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white" />
                                        </Field>
                                        {values.logo && (
                                            <div className="flex items-center gap-3">
                                                <img src={values.logo} alt="" className="h-14 max-w-48 rounded-lg border border-slate-200 bg-white object-contain p-1" />
                                                <Button variant="danger" size="sm" onClick={() => set("logo", null)}>Remove</Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Field label="Business name"><input className="input" {...bind("name")} /></Field>
                                )}

                                <Field label="Tagline" hint="Clipped to the paper width when printing (28 / 30 / 48 characters).">
                                    <input className="input" maxLength={48} {...bind("tagline")} />
                                </Field>
                            </div>
                        </Card>

                        <Card title="Contact and messages">
                            <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Address"><textarea className="input min-h-20 resize-y" {...bind("address")} /></Field>
                                    <Field label="Phone"><input className="input" inputMode="tel" {...bind("phone")} /></Field>
                                </div>
                                <Field label="Header note"><input className="input" placeholder="e.g. Welcome!" {...bind("header")} /></Field>
                                <Field label="Footer note"><textarea className="input min-h-20 resize-y" {...bind("footer")} /></Field>
                            </div>
                        </Card>

                        <Card title="Options">
                            <div className="divide-y divide-slate-100">
                                <ToggleRow label="Print kitchen copy (KOT)" hint="Ask to print a kitchen ticket after each bill" checked={values.printKitchen !== false} onChange={(v) => set("printKitchen", v)} />
                                <ToggleRow label="Show bill number" checked={values.showBill !== false} onChange={(v) => set("showBill", v)} />
                                <ToggleRow label="Show date and time" checked={!!values.showDate} onChange={(v) => set("showDate", v)} />
                                <ToggleRow label="Show payment method" checked={!!values.showPayment} onChange={(v) => set("showPayment", v)} />
                            </div>
                        </Card>

                        {dirty && (
                            <div className="animate-rise sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 pl-5 shadow-xl">
                                <span className="text-sm font-bold text-slate-700">Unsaved changes</span>
                                <div className="flex gap-2">
                                    <Button variant="secondary" onClick={() => setDraft({})} disabled={saving}>Discard</Button>
                                    <Button loading={saving} onClick={save}>Save changes</Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <ReceiptPreview settings={values} />
                </div>
            )}
        </>
    );
}