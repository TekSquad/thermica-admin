import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

export function Spinner({ className = "h-5 w-5" }) {
    return (
        <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

export const Skeleton = ({ className = "" }) => <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;

const VARIANTS = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950",
    secondary: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100",
    danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200",
    ghost: "text-slate-600 hover:bg-slate-100 active:bg-slate-200",
};
const SIZES = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-sm" };

export function Button({ variant = "primary", size = "md", loading = false, icon, className = "", disabled, children, ...props }) {
    return (
        <button
            type="button"
            disabled={disabled || loading}
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
            {...props}>
            {loading ? <Spinner className="h-4 w-4" /> : icon ? <Icon name={icon} className="h-4 w-4" /> : null}
            {children}
        </button>
    );
}

export function IconButton({ name, label, className = "", ...props }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
            {...props}>
            <Icon name={name} className="h-4 w-4" />
        </button>
    );
}

export function Field({ label, hint, error, children, className = "" }) {
    return (
        <label className={`block min-w-0 ${className}`}>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
            {children}
            {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
            {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
        </label>
    );
}

export function Toggle({ checked, onChange, label, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-slate-900" : "bg-slate-300"}`}>
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
        </button>
    );
}

export function Card({ title, desc, actions, children, className = "", pad = true }) {
    return (
        <section className={`rounded-2xl border border-slate-200 bg-white shadow-xs ${className}`}>
            {(title || actions) && (
                <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                        <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
                        {desc && <p className="mt-0.5 text-xs text-slate-500">{desc}</p>}
                    </div>
                    {actions}
                </header>
            )}
            <div className={pad ? "p-5" : ""}>{children}</div>
        </section>
    );
}

const TONES = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-sky-50 text-sky-700",
};
export const Badge = ({ tone = "slate", children, className = "" }) => (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${TONES[tone]} ${className}`}>{children}</span>
);

export function Segmented({ options, value, onChange, className = "" }) {
    return (
        <div className={`inline-flex rounded-xl bg-slate-100 p-1 ${className}`}>
            {options.map(([v, label]) => (
                <button
                    key={v}
                    type="button"
                    aria-pressed={value === v}
                    onClick={() => onChange(v)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${value === v ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}>
                    {label}
                </button>
            ))}
        </div>
    );
}

export function Stat({ label, value, sub, icon, loading }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
                {icon && (
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500">
                        <Icon name={icon} className="h-4 w-4" />
                    </span>
                )}
            </div>
            {loading ? (
                <Skeleton className="mt-3 h-8 w-24" />
            ) : (
                <div className="mt-2 text-2xl font-black tabular-nums tracking-tight text-slate-900">{value}</div>
            )}
            {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
        </div>
    );
}

export function PageHeader({ title, desc, actions }) {
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
                {desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export function Empty({ icon = "bag", title, hint, action }) {
    return (
        <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <Icon name={icon} className="h-6 w-6" />
            </div>
            <div className="mt-3 text-sm font-bold text-slate-800">{title}</div>
            {hint && <div className="mt-1 max-w-xs text-xs text-slate-500">{hint}</div>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function ErrorNote({ error, onRetry }) {
    if (!error) return null;
    return (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="min-w-0 break-words font-semibold">
                {error.code === "permission-denied" ? "Permission denied. Check the Firestore rules and your owner access." : error.message || String(error)}
            </span>
            {onRetry && (
                <Button variant="danger" size="sm" onClick={onRetry}>
                    Retry
                </Button>
            )}
        </div>
    );
}

export function Avatar({ name = "", photo = "", className = "h-9 w-9" }) {
    const [broken, setBroken] = useState(false);
    const initials = name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?";
    return (
        <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-slate-200 text-xs font-bold text-slate-600 ${className}`}>
            {photo && !broken ? (
                <img src={photo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="h-full w-full object-cover" />
            ) : (
                initials
            )}
        </span>
    );
}

export function Logo({ className = "h-9 w-9" }) {
    const [state, setState] = useState("loading");
    return (
        <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-900 text-white ${className}`}>
            {state === "failed" ? (
                <Icon name="cup" className="h-1/2 w-1/2" />
            ) : (
                <img
                    src="/logo.png"
                    alt=""
                    onLoad={() => setState("ready")}
                    onError={() => setState("failed")}
                    className={`h-full w-full object-cover transition-opacity duration-300 ${state === "ready" ? "opacity-100" : "opacity-0"}`}
                />
            )}
        </span>
    );
}

export function Modal({ title, onClose, footer, children, size = "md" }) {
    const closeRef = useRef(onClose);
    useEffect(() => {
        closeRef.current = onClose;
    });
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && closeRef.current();
        window.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, []);

    const width = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" }[size];
    return createPortal(
        <div className="animate-fade fixed inset-0 z-50 flex items-end justify-center overscroll-none bg-slate-900/50 sm:items-center sm:p-4" onMouseDown={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onMouseDown={(e) => e.stopPropagation()}
                className={`animate-pop flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl ${width}`}>
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <h2 className="min-w-0 truncate text-base font-extrabold text-slate-900">{title}</h2>
                    <IconButton name="x" label="Close" onClick={onClose} />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
                {footer && <div className="border-t border-slate-100 px-5 py-3">{footer}</div>}
            </div>
        </div>,
        document.body,
    );
}