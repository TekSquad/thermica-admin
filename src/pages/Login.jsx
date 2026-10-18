import Icon from "../components/Icon";
import { Button, Logo, Spinner } from "../components/ui";
import Credit from "../components/Credit";

const GoogleG = () => (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 rounded-full bg-white p-0.5">
        <path fill="#4285F4" d="M43.6 24.5c0-1.5-.1-2.9-.4-4.3H24v8.1h11c-.5 2.6-2 4.8-4.3 6.3v5.2h7c4-3.7 5.9-9.1 5.9-15.3Z" />
        <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-7-5.2c-1.8 1.2-4 1.9-6.5 1.9-5 0-9.2-3.4-10.7-8H6.1v5.4A20 20 0 0 0 24 44Z" />
        <path fill="#FBBC05" d="M13.3 27.8a12 12 0 0 1 0-7.6v-5.4H6.1a20 20 0 0 0 0 18.4l7.2-5.4Z" />
        <path fill="#EA4335" d="M24 12.2c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 6.1 29.5 4 24 4A20 20 0 0 0 6.1 14.8l7.2 5.4c1.5-4.6 5.7-8 10.7-8Z" />
    </svg>
);

const FEATURES = [
    ["trend", "Live sales and reports", "Revenue, top items and staff performance at a glance."],
    ["grid", "Menu and receipt control", "Change prices and receipt details for every device."],
    ["shield", "Staff access and audit trail", "Know who billed, voided or reprinted, and why."],
];

export function Splash({ text = "Loading…" }) {
    return (
        <main className="grid min-h-dvh place-items-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <Logo className="h-16 w-16 rounded-2xl" />
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Spinner className="h-4 w-4" /> {text}
                </div>
            </div>
        </main>
    );
}

export function Denied({ auth }) {
    const { user, error, signOut, retry } = auth;
    return (
        <main className="grid min-h-dvh place-items-center bg-slate-50 p-6">
            <section className="animate-pop w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600">
                    <Icon name="shield" />
                </div>
                <h1 className="mt-4 text-lg font-black text-slate-900">Owner access required</h1>
                <p className="mt-1 text-sm text-slate-500">
                    This console is only for active owners. Cashiers use the POS app.
                </p>
                <p className="mt-4 truncate rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">{user?.email}</p>
                {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
                <div className="mt-6 flex justify-center gap-2">
                    {error && <Button variant="secondary" onClick={retry}>Retry</Button>}
                    <Button onClick={signOut}>Use a different account</Button>
                </div>
            </section>
        </main>
    );
}

export default function Login({ auth }) {
    const { error, busy, signIn } = auth;
    return (
        <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
            <section className="relative hidden overflow-hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
                <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
                <div className="relative flex items-center gap-3">
                    <Logo className="h-11 w-11 ring-1 ring-white/20" />
                    <div className="text-lg font-black">Thermica Admin</div>
                </div>
                <div className="relative max-w-md">
                    <h2 className="text-4xl font-black leading-tight tracking-tight">Run your counter from anywhere.</h2>
                    <ul className="mt-8 space-y-5">
                        {FEATURES.map(([icon, title, text]) => (
                            <li key={title} className="flex gap-4">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                                    <Icon name={icon} className="h-5 w-5" />
                                </span>
                                <div>
                                    <div className="text-sm font-bold">{title}</div>
                                    <div className="mt-0.5 text-sm text-slate-400">{text}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <Credit dark className="relative" />
            </section>

            <section className="grid place-items-center bg-slate-50 p-6">
                <div className="animate-pop w-full max-w-sm">
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <Logo className="h-11 w-11" />
                        <div className="text-lg font-black text-slate-900">Thermica Admin</div>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Welcome back</h1>
                    <p className="mt-1.5 text-sm text-slate-500">Sign in with the Google account of an owner.</p>

                    {error && (
                        <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                            {error}
                        </p>
                    )}

                    <Button size="lg" className="mt-6 w-full" onClick={signIn} loading={busy}>
                        {!busy && <GoogleG />}
                        {busy ? "Signing in…" : "Continue with Google"}
                    </Button>
                    <p className="mt-6 text-center text-xs text-slate-400">Authorized owners only</p>
                    <Credit className="mt-10 justify-center" />
                </div>
            </section>
        </main>
    );
}