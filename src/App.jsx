import { useEffect, useMemo, useState } from "react";
import {
    auth,
    deleteDoc,
    getDoc,
    onAuthStateChanged,
    onSnapshot,
    setDoc,
    settingsRef,
    signInWithGoogle,
    signOut,
    staffColRef,
    staffRef,
} from "./firebase";
import { DEFAULT_SETTINGS, SHARED_KEYS } from "./settings";
import { processLogo } from "./logo";
import { buildReceipt, PAPER } from "./receipt";

function Button({ children, variant = "primary", className = "", ...props }) {
    const styles =
        variant === "secondary"
            ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100"
            : variant === "danger"
                ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200"
                : "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950";
    return (
        <button
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

function Field({ label, hint, children }) {
    return (
        <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
        </label>
    );
}

function Toggle({ label, checked, onChange }) {
    return (
        <label className="flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-3 transition hover:bg-slate-50">
            <span className="text-sm font-semibold text-slate-700">{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 shrink-0 accent-slate-900"
            />
        </label>
    );
}

function SignIn({ error, busy, onSignIn }) {
    return (
        <main className="grid min-h-dvh place-items-center bg-slate-100 p-4 sm:p-6">
            <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 sm:mb-8">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Thermica POS</p>
                    <h1 className="mt-1.5 text-xl font-black text-slate-900 sm:text-2xl">Admin Panel</h1>
                    <p className="mt-1.5 text-sm text-slate-600">Manage shared receipt settings and staff access.</p>
                </div>
                {error && (
                    <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 sm:text-sm">
                        {error}
                    </p>
                )}
                <Button className="w-full" onClick={onSignIn} disabled={busy}>
                    {busy ? "Signing in…" : "Continue with Google"}
                </Button>
            </section>
        </main>
    );
}

function Denied({ user, onSignOut }) {
    return (
        <main className="grid min-h-dvh place-items-center bg-slate-100 p-4 sm:p-6">
            <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
                <h1 className="text-lg font-black text-slate-900 sm:text-xl">Access Denied</h1>
                <p className="mt-2 text-sm text-slate-600">Owner privileges required.</p>
                <p className="mt-3 truncate font-mono text-xs text-slate-500">{user?.email}</p>
                <Button variant="secondary" className="mt-6 w-full sm:w-auto" onClick={onSignOut}>
                    Sign out
                </Button>
            </section>
        </main>
    );
}

function Preview({ settings, paper }) {
    const lines = useMemo(() => buildReceipt(settings, paper), [settings, paper]);
    const chars = PAPER[paper];
    return (
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-20 lg:self-start">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-sm font-extrabold text-slate-900 sm:text-base">Live receipt preview</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{paper}mm thermal layout ({chars} chars/line)</p>
                </div>
                <div className="flex rounded-lg bg-slate-100 p-1">
                    {[58, 80].map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => settings.onPaper(value)}
                            className={`rounded-md px-3 py-1 text-xs font-bold transition ${paper === value ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                                }`}
                        >
                            {value}mm
                        </button>
                    ))}
                </div>
            </div>
            <div className="mt-4 max-h-[28rem] overflow-auto rounded-lg bg-slate-100 p-3 sm:max-h-[36rem] sm:p-4">
                <div
                    className="mx-auto border border-slate-300 bg-[#fbfaf5] p-3 font-mono text-[11px] leading-[1.45] text-slate-800 shadow-xs"
                    style={{ width: `calc(${chars}ch + 1.5rem)` }}
                >
                    {lines.map((line, index) => (
                        <div
                            key={index}
                            className={`${line.align === "center" ? "text-center" : "text-left"} ${line.bold ? "font-bold" : ""
                                } whitespace-pre`}
                        >
                            {line.image ? (
                                <img src={line.image} alt="" className="mx-auto max-h-28 max-w-full object-contain" />
                            ) : (
                                line.text || " "
                            )}
                        </div>
                    ))}
                    <div className="mt-3 border-t border-dashed border-slate-300 pt-1 text-center text-[10px] text-slate-400">
                        - - - end of copy - - -
                    </div>
                </div>
            </div>
        </section>
    );
}

function StaffManager({ currentUserEmail }) {
    const [staffList, setStaffList] = useState([]);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("cashier");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const selfEmail = (currentUserEmail || "").toLowerCase();

    useEffect(
        () =>
            onSnapshot(
                staffColRef(),
                (snap) => {
                    const rows = snap.docs.map((d) => ({
                        id: d.id.toLowerCase(),
                        email: d.data().email || d.id.toLowerCase(),
                        name: d.data().name || "",
                        role: d.data().role || "cashier",
                        active: d.data().active !== false,
                    }));
                    rows.sort((a, b) => (a.role === "owner" ? -1 : 1) - (b.role === "owner" ? -1 : 1) || a.id.localeCompare(b.id));
                    setStaffList(rows);
                },
                (e) => setError(e.message),
            ),
        [],
    );

    const addStaff = async (e) => {
        e.preventDefault();
        const cleanEmail = email.trim().toLowerCase();

        // Simple, foolproof email validation check
        if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
            setError("Enter a valid Google email address.");
            return;
        }

        setBusy(true);
        setError("");
        setMessage("");
        try {
            await setDoc(
                staffRef(cleanEmail),
                {
                    email: cleanEmail,
                    name: name.trim(),
                    role,
                    active: true,
                    updatedAt: Date.now(),
                },
                { merge: true },
            );
            setEmail("");
            setName("");
            setRole("cashier");
            setMessage(`Added ${cleanEmail} as ${role}.`);
        } catch (err) {
            setError(err.message || "Could not save staff account.");
        } finally {
            setBusy(false);
        }
    };

    const updateStaff = async (member, patch) => {
        setError("");
        setMessage("");
        try {
            await setDoc(
                staffRef(member.id),
                {
                    email: member.email,
                    name: member.name,
                    role: member.role,
                    active: member.active,
                    ...patch,
                    updatedAt: Date.now(),
                },
                { merge: true },
            );
        } catch (err) {
            setError(err.message || "Could not update staff member.");
        }
    };

    const removeStaff = async (member) => {
        if (member.id === selfEmail) return;
        if (!window.confirm(`Remove ${member.email} from staff access?`)) return;
        setError("");
        setMessage("");
        try {
            await deleteDoc(staffRef(member.id));
            setMessage(`Removed ${member.email}.`);
        } catch (err) {
            setError(err.message || "Could not remove staff member.");
        }
    };

    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)] lg:gap-6">
            <form onSubmit={addStaff} className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-20 lg:self-start">
                <div>
                    <h2 className="text-sm font-extrabold text-slate-900 sm:text-base">Add Staff Account</h2>
                    <p className="mt-1 text-xs text-slate-500">
                        Staff sign in on the POS app using their Google account.
                    </p>
                </div>

                <Field label="Google Email">
                    <input
                        type="email"
                        required
                        placeholder="cashier@gmail.com"
                        className="input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </Field>

                <Field label="Staff Name (Optional)">
                    <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        className="input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </Field>

                <Field label="Role">
                    <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="cashier">Cashier (Billing & Sold-out toggle)</option>
                        <option value="owner">Owner (Full menu, settings & admin access)</option>
                    </select>
                </Field>

                {error && (
                    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                        {error}
                    </p>
                )}
                {message && (
                    <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
                        {message}
                    </p>
                )}

                <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Saving…" : "Authorize Account"}
                </Button>
            </form>

            <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4">
                    <h2 className="text-sm font-extrabold text-slate-900 sm:text-base">Authorized Staff ({staffList.length})</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Manage roles and active login permissions.</p>
                </div>

                <div className="divide-y divide-slate-200 border-t border-slate-200">
                    {staffList.map((member) => {
                        const isSelf = member.id === selfEmail;
                        return (
                            <div key={member.id} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="truncate text-sm font-bold text-slate-900">
                                            {member.name || member.email}
                                        </span>
                                        {isSelf && (
                                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                                                You
                                            </span>
                                        )}
                                        {!member.active && (
                                            <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                                                Disabled
                                            </span>
                                        )}
                                    </div>
                                    <div className="truncate text-xs text-slate-500">{member.email}</div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
                                    <select
                                        aria-label={`Role for ${member.email}`}
                                        disabled={isSelf}
                                        value={member.role}
                                        onChange={(e) => updateStaff(member, { role: e.target.value })}
                                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-800 disabled:opacity-50 sm:py-1.5"
                                    >
                                        <option value="cashier">Cashier</option>
                                        <option value="owner">Owner</option>
                                    </select>

                                    <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={isSelf}
                                        onClick={() => updateStaff(member, { active: !member.active })}
                                        className="!px-3 !py-2 text-xs sm:!py-1.5"
                                    >
                                        {member.active ? "Disable" : "Enable"}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="danger"
                                        disabled={isSelf}
                                        onClick={() => removeStaff(member)}
                                        className="!px-3 !py-2 text-xs sm:!py-1.5"
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        );
                    })}

                    {staffList.length === 0 && (
                        <p className="py-8 text-center text-sm text-slate-500">No staff accounts found.</p>
                    )}
                </div>
            </section>
        </div>
    );
}

function Admin({ user, onSignOut }) {
    const [tab, setTab] = useState("settings");
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [paper, setPaper] = useState(58);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(
        () =>
            onSnapshot(
                settingsRef(),
                (snap) => setSettings((current) => ({ ...current, ...(snap.exists() ? pickShared(snap.data()) : {}) })),
                (e) => setError(e.message),
            ),
        [],
    );

    const set = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
    const save = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setMessage("");
        try {
            await setDoc(settingsRef(), pickShared(settings), { merge: true });
            setMessage("Settings saved. POS devices will update automatically.");
        } catch (e) {
            setError(e.message || "Could not save settings.");
        } finally {
            setSaving(false);
        }
    };
    const upload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            set("logo", await processLogo(file, paper));
            setMessage("Logo processed. Save settings to publish it.");
        } catch (e) {
            setError(e.message);
        }
    };

    return (
        <div className="min-h-dvh bg-slate-100">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="rounded-md bg-slate-900 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                                POS
                            </span>
                            <div>
                                <h1 className="text-base font-black leading-none text-slate-900 sm:text-lg">Thermica Admin</h1>
                                <p className="mt-0.5 text-[11px] font-medium text-slate-500 sm:hidden">
                                    {user.displayName || user.email}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onSignOut}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 sm:hidden"
                        >
                            Sign out
                        </button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <nav className="grid w-full grid-cols-2 rounded-lg border border-slate-200 bg-slate-100 p-1 sm:flex sm:w-auto">
                            {[
                                ["settings", "Receipt Settings"],
                                ["staff", "Staff & Cashiers"],
                            ].map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setTab(key)}
                                    className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition ${tab === key ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </nav>

                        <div className="hidden items-center gap-3 sm:flex">
                            <span className="max-w-48 truncate text-xs font-semibold text-slate-600">
                                {user.displayName || user.email}
                            </span>
                            <button
                                type="button"
                                onClick={onSignOut}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl p-4 sm:p-6">
                {tab === "staff" ? (
                    <StaffManager currentUserEmail={user.email} />
                ) : (
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)] lg:gap-6">
                        <form onSubmit={save} className="min-w-0 space-y-5">
                            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <h2 className="mb-4 text-sm font-extrabold text-slate-900 sm:text-base">Receipt header</h2>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Header mode">
                                        <select
                                            value={settings.headerMode}
                                            onChange={(e) => set("headerMode", e.target.value)}
                                            className="input"
                                        >
                                            <option value="text">Business name</option>
                                            <option value="logo">Logo</option>
                                        </select>
                                    </Field>
                                    <Field label="Business name">
                                        <input
                                            className="input"
                                            value={settings.name}
                                            onChange={(e) => set("name", e.target.value)}
                                        />
                                    </Field>
                                    <Field
                                        label={`Tagline (max ${PAPER[paper]} chars)`}
                                        hint="Limit follows the selected thermal width."
                                    >
                                        <input
                                            className="input"
                                            maxLength={PAPER[paper]}
                                            value={settings.tagline}
                                            onChange={(e) => set("tagline", e.target.value.slice(0, PAPER[paper]))}
                                        />
                                    </Field>
                                    <Field label="Phone">
                                        <input
                                            className="input"
                                            inputMode="tel"
                                            value={settings.phone}
                                            onChange={(e) => set("phone", e.target.value)}
                                        />
                                    </Field>
                                </div>
                                <div className="mt-4">
                                    <Field label="Address">
                                        <textarea
                                            className="input min-h-20 resize-y"
                                            value={settings.address}
                                            onChange={(e) => set("address", e.target.value)}
                                        />
                                    </Field>
                                </div>
                                {settings.headerMode === "logo" && (
                                    <div className="mt-4">
                                        <Field
                                            label="Receipt logo"
                                            hint="PNG output is cropped, scaled, and converted to 1-bit monochrome before upload."
                                        >
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={upload}
                                                className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white sm:text-sm"
                                            />
                                        </Field>
                                        {settings.logo && (
                                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                                <img
                                                    src={settings.logo}
                                                    alt="Receipt logo"
                                                    className="h-14 max-w-48 rounded border border-slate-200 bg-white object-contain p-1"
                                                />
                                                <button
                                                    type="button"
                                                    className="text-xs font-bold text-red-700 underline sm:text-sm"
                                                    onClick={() => set("logo", null)}
                                                >
                                                    Remove logo
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>

                            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <h2 className="mb-4 text-sm font-extrabold text-slate-900 sm:text-base">Receipt content</h2>
                                <div className="space-y-4">
                                    <Field label="Header note">
                                        <textarea
                                            className="input min-h-20 resize-y"
                                            value={settings.header}
                                            onChange={(e) => set("header", e.target.value)}
                                        />
                                    </Field>
                                    <Field label="Footer note">
                                        <textarea
                                            className="input min-h-20 resize-y"
                                            value={settings.footer}
                                            onChange={(e) => set("footer", e.target.value)}
                                        />
                                    </Field>
                                </div>
                            </section>

                            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <h2 className="mb-4 text-sm font-extrabold text-slate-900 sm:text-base">Receipt toggles</h2>
                                <div className="grid gap-2.5 sm:grid-cols-2">
                                    <Toggle
                                        label="Print kitchen copy (KOT)"
                                        checked={settings.printKitchen}
                                        onChange={(v) => set("printKitchen", v)}
                                    />
                                    <Toggle
                                        label="Show bill number"
                                        checked={settings.showBill}
                                        onChange={(v) => set("showBill", v)}
                                    />
                                    <Toggle
                                        label="Show date & time"
                                        checked={settings.showDate}
                                        onChange={(v) => set("showDate", v)}
                                    />
                                    <Toggle
                                        label="Show payment method"
                                        checked={settings.showPayment}
                                        onChange={(v) => set("showPayment", v)}
                                    />
                                </div>
                            </section>

                            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    {message && (
                                        <span role="status" className="block text-xs font-semibold text-emerald-700 sm:text-sm">
                                            {message}
                                        </span>
                                    )}
                                    {error && (
                                        <span role="alert" className="block text-xs font-semibold text-red-700 sm:text-sm">
                                            {error}
                                        </span>
                                    )}
                                    {!message && !error && (
                                        <span className="block text-xs text-slate-500">
                                            Changes sync immediately to all online POS terminals.
                                        </span>
                                    )}
                                </div>
                                <Button type="submit" disabled={saving} className="w-full shrink-0 sm:w-auto">
                                    {saving ? "Saving…" : "Save shared settings"}
                                </Button>
                            </div>
                        </form>

                        <Preview settings={{ ...settings, onPaper: setPaper }} paper={paper} />
                    </div>
                )}
            </main>
        </div>
    );
}

function pickShared(value) {
    return Object.fromEntries(SHARED_KEYS.filter((key) => value?.[key] !== undefined).map((key) => [key, value[key]]));
}

export default function App() {
    const [state, setState] = useState({ status: "loading", user: null });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(
        () =>
            onAuthStateChanged(auth, async (user) => {
                if (!user) return setState({ status: "signedOut", user: null });
                try {
                    const snap = await getDoc(staffRef(user.email || ""));
                    setState(
                        snap.exists() && snap.data().active === true && snap.data().role === "owner"
                            ? { status: "ready", user }
                            : { status: "denied", user },
                    );
                } catch (e) {
                    setError(e.message || "Could not verify owner access.");
                    setState({ status: "denied", user });
                }
            }),
        [],
    );

    const signIn = async () => {
        setBusy(true);
        setError("");
        try {
            await signInWithGoogle();
        } catch (e) {
            if (!/cancel/i.test(e.message || "")) setError(e.message || "Sign-in failed.");
        } finally {
            setBusy(false);
        }
    };
    const signOutUser = () => signOut(auth);
    if (state.status === "loading")
        return <main className="grid min-h-dvh place-items-center text-sm font-semibold text-slate-600">Checking access…</main>;
    if (state.status === "signedOut") return <SignIn error={error} busy={busy} onSignIn={signIn} />;
    if (state.status === "denied") return <Denied user={state.user} onSignOut={signOutUser} />;
    return <Admin user={state.user} onSignOut={signOutUser} />;
}