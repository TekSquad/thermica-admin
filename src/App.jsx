import { Suspense, lazy } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import Shell from "./components/Shell";
import { Skeleton } from "./components/ui";
import useAuth from "./hooks/useAuth";
import { useRoute } from "./lib/router";
import Login, { Denied, Splash } from "./pages/Login";

// Each page is its own chunk, so the first load stays small.
const PAGES = {
    overview: lazy(() => import("./pages/Overview")),
    sales: lazy(() => import("./pages/Sales")),
    audit: lazy(() => import("./pages/Audit")),
    menu: lazy(() => import("./pages/Menu")),
    receipt: lazy(() => import("./pages/Receipt")),
    staff: lazy(() => import("./pages/Staff")),
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

    if (auth.status === "loading") return <Splash />;
    if (auth.status === "checking") return <Splash text="Checking access…" />;
    if (auth.status === "signedOut") return <Login auth={auth} />;
    if (auth.status === "denied") return <Denied auth={auth} />;

    const Page = PAGES[route];
    return (
        <Shell route={route} onNavigate={go} user={auth.user} onSignOut={auth.signOut}>
            <ErrorBoundary key={route}>
                <Suspense fallback={<PageSkeleton />}>
                    <Page user={auth.user} />
                </Suspense>
            </ErrorBoundary>
        </Shell>
    );
}