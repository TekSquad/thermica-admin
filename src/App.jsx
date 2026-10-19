import { Suspense, lazy, useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import Shell from "./components/Shell";
import { Skeleton } from "./components/ui";
import useAuth from "./hooks/useAuth";
import { useRoute } from "./lib/router";
import { NAV } from "./config/nav";
import Login, { Denied, Splash } from "./pages/Login";

// Each page is its own chunk, so the first load stays small.
const PAGES = {
    overview: lazy(() => import("./pages/Overview")),
    sales: lazy(() => import("./pages/Sales")),
    closings: lazy(() => import("./pages/Closings")),
    audit: lazy(() => import("./pages/Audit")),
    menu: lazy(() => import("./pages/Menu")),
    receipt: lazy(() => import("./pages/Receipt")),
    staff: lazy(() => import("./pages/Staff")),
    reports: lazy(() => import("./pages/Reports")),
    system: lazy(() => import("./pages/System")),
};

const PageSkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
    </div>
);

export default function App() {
    const auth = useAuth();
    const [route, go] = useRoute();
    const [online, setOnline] = useState(() => navigator.onLine);

    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        return () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
        };
    }, []);

    if (auth.status === "loading") return <Splash />;
    if (auth.status === "checking") return <Splash text="Checking access…" />;
    if (auth.status === "signedOut") return <Login auth={auth} />;
    if (auth.status === "denied") return <Denied auth={auth} />;
    if (!online) return (
        <main className="grid min-h-dvh place-items-center bg-slate-50 p-6">
            <section className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
                <div className="text-xs font-black uppercase tracking-widest text-amber-700">Connection required</div>
                <h1 className="mt-2 text-2xl font-black text-slate-900">Reconnect to verify access</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">Thermica Admin needs a live connection to confirm the current business status before showing tenant data or actions.</p>
            </section>
        </main>
    );

    if (auth.tenantStatus === "suspended") return (
        <main className="grid min-h-dvh place-items-center bg-slate-50 p-6">
            <section className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
                <div className="text-xs font-black uppercase tracking-widest text-red-700">Access suspended</div>
                <h1 className="mt-2 text-2xl font-black text-slate-900">This business is suspended</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">Tenant access has been disabled by the Thermica platform administrator. Contact support if you believe this is a mistake.</p>
                <button className="mt-6 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white" onClick={auth.signOut}>Sign out</button>
            </section>
        </main>
    );

    const paused = auth.tenantStatus === "paused";
    const allowedNav = paused ? NAV.filter((item) => ["sales", "reports"].includes(item.key)) : NAV;
    const pageRoute = paused && !["sales", "reports"].includes(route) ? "sales" : route;
    const Page = PAGES[pageRoute] || PAGES.overview;
    return (
        <Shell route={pageRoute} onNavigate={go} user={auth.user} onSignOut={auth.signOut} nav={allowedNav} accessStatus={auth.tenantStatus}>
            <ErrorBoundary key={pageRoute}>
                <Suspense fallback={<PageSkeleton />}>
                    <Page user={auth.user} readOnly={paused} />
                </Suspense>
            </ErrorBoundary>
        </Shell>
    );
}
