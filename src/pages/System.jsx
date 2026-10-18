import { useEffect, useState } from "react";
import pkg from "../../package.json";
import Credit from "../components/Credit";
import { useFeedback } from "../components/Feedback";
import { Badge, Button, Card, ErrorNote, Field, PageHeader, Skeleton, Toggle } from "../components/ui";
import { BIZ } from "../config/firebase";
import useWatch from "../hooks/useWatch";
import { downloadFile, toJson } from "../lib/download";
import { istDateKey } from "../lib/format";
import { getTodayCounter, saveApp, watchApp } from "../services/app";
import { buildBackup } from "../services/backup";

const SEMVER = /^\d+\.\d+\.\d+$/;

function AppControl({ user }) {
    const { toast } = useFeedback();
    const { data, loading, error } = useWatch(watchApp, [], {});
    const [draft, setDraft] = useState({});
    const [saving, setSaving] = useState(false);

    const v = { maintenance: false, message: "", minVersion: "", ...data, ...draft };
    const dirty = Object.keys(draft).length > 0;
    const set = (k, val) => setDraft((d) => ({ ...d, [k]: val }));
    const versionBad = v.minVersion && !SEMVER.test(v.minVersion.trim());

    const save = async () => {
        if (versionBad) return toast("Use a version like 1.2.0", "error");
        setSaving(true);
        try {
            const patch = { ...draft };
            if (typeof patch.minVersion === "string") patch.minVersion = patch.minVersion.trim();
            if (typeof patch.message === "string") patch.message = patch.message.trim();
            await saveApp(patch, user.email);
            setDraft({});
            toast("App control saved");
        } catch (e) {
            toast(e.code === "permission-denied" ? "Permission denied." : e.message, "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card title="App control" desc="Messages and requirements for every POS device">
            <ErrorNote error={error} />
            {loading ? (
                <Skeleton className="h-40" />
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                        <div>
                            <div className="text-sm font-bold text-slate-900">Show a notice on all devices</div>
                            <div className="text-xs text-slate-500">Use for closures, downtime or announcements.</div>
                        </div>
                        <Toggle label="Show a notice" checked={!!v.maintenance} onChange={(x) => set("maintenance", x)} />
                    </div>
                    <Field label="Notice text">
                        <input className="input" maxLength={140} placeholder="e.g. Kitchen closes at 4 PM today" value={v.message} onChange={(e) => set("message", e.target.value)} />
                    </Field>
                    <Field label="Minimum app version" hint="Older apps will be asked to update. Leave empty for no limit." error={versionBad ? "Use a version like 1.2.0" : ""}>
                        <input className="input" placeholder="1.0.0" value={v.minVersion} onChange={(e) => set("minVersion", e.target.value)} />
                    </Field>
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                        These values are stored now, but the POS app only acts on them once it is updated to read <code>config/app</code>.
                    </p>
                    {dirty && (
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setDraft({})} disabled={saving}>Discard</Button>
                            <Button loading={saving} onClick={save}>Save</Button>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}

function Backup() {
    const { toast, confirm } = useFeedback();
    const [busy, setBusy] = useState(false);
    const [last, setLast] = useState(null);

    const run = async (full) => {
        const ok = await confirm({
            title: full ? "Download full backup" : "Download menu and settings",
            message: full
                ? "This reads every bill and audit entry once, which counts towards your Firestore daily read quota. The file contains staff emails and sales, so store it somewhere private."
                : "This downloads the menu, categories, receipt settings and staff list.",
            confirmLabel: "Download",
        });
        if (!ok) return;
        setBusy(true);
        try {
            const { data, counts } = await buildBackup({ includeBills: full, includeAudit: full });
            const stamp = istDateKey();
            downloadFile(`thermica-backup-${BIZ}-${stamp}${full ? "" : "-menu"}.json`, toJson(data), "application/json");
            setLast({ at: new Date(), counts });
            toast("Backup downloaded");
        } catch (e) {
            toast(e.code === "permission-denied" ? "Permission denied." : e.message, "error");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card title="Backup" desc="Firestore is the only copy of your data, so download one regularly">
            <div className="flex flex-wrap gap-2">
                <Button icon="download" loading={busy} onClick={() => run(true)}>Full backup</Button>
                <Button variant="secondary" icon="download" disabled={busy} onClick={() => run(false)}>Menu and settings only</Button>
            </div>
            {last && (
                <p className="mt-3 text-xs text-slate-500">
                    Last download: {last.counts.products} products, {last.counts.staff} staff, {last.counts.bills} bills, {last.counts.audit} audit entries.
                </p>
            )}
            <p className="mt-3 text-xs text-slate-500">
                Restoring is a manual process for now. Keep the file safe, and ask TekSquad if you ever need to restore it.
            </p>
        </Card>
    );
}

function Counter() {
    const [state, setState] = useState({ seq: null, error: "" });
    const load = () => {
        setState((s) => ({ ...s, error: "" }));
        getTodayCounter()
            .then((seq) => setState({ seq, error: "" }))
            .catch((e) => setState({ seq: null, error: e.message }));
    };
    useEffect(load, []);

    return (
        <Card
            title="Today's bill numbers"
            desc="Numbers reserved by all devices today. Unused numbers cause gaps in tokens, which is normal."
            actions={<Button variant="secondary" size="sm" icon="refresh" onClick={load}>Refresh</Button>}>
            {state.error ? (
                <p className="text-sm font-semibold text-red-600">{state.error}</p>
            ) : state.seq === null ? (
                <Skeleton className="h-9 w-24" />
            ) : (
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tabular-nums text-slate-900">{state.seq}</span>
                    <span className="text-xs text-slate-500">reserved on {istDateKey()}</span>
                </div>
            )}
        </Card>
    );
}

function About() {
    return (
        <Card title="About">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                    ["Console version", `v${pkg.version}`],
                    ["Business", BIZ],
                    ["Firebase project", import.meta.env.VITE_FIREBASE_PROJECT_ID || "—"],
                    ["Timezone", "Asia/Kolkata (IST)"],
                ].map(([k, val]) => (
                    <div key={k} className="rounded-xl bg-slate-50 px-4 py-3">
                        <dt className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{k}</dt>
                        <dd className="mt-0.5 truncate font-bold text-slate-900">{val}</dd>
                    </div>
                ))}
            </dl>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div>
                    <div className="text-sm font-extrabold text-slate-900">Thermica POS</div>
                    <Credit className="mt-0.5" />
                </div>
                <Badge tone="green">Cloud connected</Badge>
            </div>
        </Card>
    );
}

export default function System({ user }) {
    return (
        <>
            <PageHeader title="System" desc="Backup, app control and information" />
            <div className="grid gap-4 lg:grid-cols-2">
                <AppControl user={user} />
                <div className="space-y-4">
                    <Backup />
                    <Counter />
                </div>
                <div className="lg:col-span-2">
                    <About />
                </div>
            </div>
        </>
    );
}