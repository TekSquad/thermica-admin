import { useEffect, useState } from "react";
import Icon from "./Icon";
import { Avatar, IconButton, Logo } from "./ui";
import { NAV } from "../config/nav";
import Credit from "./Credit";

function Sidebar({ route, onNavigate, user, onSignOut, nav = NAV }) {
    const groups = [...new Set(nav.map((n) => n.group))];
    return (
        <div className="flex h-full flex-col bg-white">
            <div className="flex items-center gap-3 px-5 py-5">
                <Logo className="h-10 w-10" />
                <div className="min-w-0">
                    <div className="text-sm font-black leading-tight text-slate-900">Thermica</div>
                    <div className="text-[11px] font-semibold text-slate-500">Admin console</div>
                </div>
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
                {groups.map((g) => (
                    <div key={g}>
                        <div className="px-3 pb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{g}</div>
                        <div className="space-y-0.5">
                            {nav.filter((n) => n.group === g).map((n) => {
                                const on = route === n.key;
                                return (
                                    <button
                                        key={n.key}
                                        type="button"
                                        aria-current={on ? "page" : undefined}
                                        onClick={() => onNavigate(n.key)}
                                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${on ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                                        <Icon name={n.icon} className="h-[18px] w-[18px]" />
                                        {n.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="border-t border-slate-100 p-3">
                <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                    <Avatar name={user.name} photo={user.photo} />
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-slate-900">{user.name}</div>
                        <div className="truncate text-[11px] text-slate-500">{user.email}</div>
                    </div>
                    <IconButton name="logout" label="Sign out" onClick={onSignOut} />
                </div>
                <Credit className="mt-2 px-2" />
            </div>
        </div>
    );
}

export default function Shell({ route, onNavigate, user, onSignOut, children, nav = NAV, accessStatus = "active" }) {
    const [open, setOpen] = useState(false);
    const current = nav.find((n) => n.key === route);

    useEffect(() => {
        setOpen(false);
        window.scrollTo({ top: 0 });
    }, [route]);

    return (
        <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="hidden border-r border-slate-200 lg:block">
                <div className="sticky top-0 h-dvh">
                    <Sidebar route={route} onNavigate={onNavigate} user={user} onSignOut={onSignOut} nav={nav} />
                </div>
            </aside>

            <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
                <IconButton name="menu" label="Open menu" onClick={() => setOpen(true)} className="-ml-2 h-10 w-10" />
                <div className="min-w-0 flex-1 truncate text-sm font-extrabold text-slate-900">{current?.label}</div>
                <Avatar name={user.name} photo={user.photo} className="h-8 w-8" />
            </header>

            {open && (
                <div className="animate-fade fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)}>
                    <div className="animate-slide h-full w-72 max-w-[85vw] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <Sidebar route={route} onNavigate={onNavigate} user={user} onSignOut={onSignOut} nav={nav} />
                    </div>
                </div>
            )}

            <main className="min-w-0">
                <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    {accessStatus === "paused" && <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><b>Business paused.</b> You can review past bills and reports. Operational features are unavailable.</div>}
                    {children}
                    <Credit className="mt-12 justify-center" />
                </div>
            </main>
        </div>
    );
}
