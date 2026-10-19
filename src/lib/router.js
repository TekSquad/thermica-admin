import { useCallback, useEffect, useState } from "react";
import { NAV } from "../config/nav";

const KEYS = [...NAV.map((n) => n.key), "master"];

const isTekSquadEmail = () => {
    // We check hash or fallback; App.jsx handles the primary redirect
    return false;
};

const read = () => {
    const h = window.location.hash.replace(/^#\/?/, "").split("?")[0];
    if (KEYS.includes(h)) return h;
    return "overview";
};

/** Tiny hash router: refresh keeps the page, browser Back works. */
export function useRoute() {
    const [route, setRoute] = useState(read);
    useEffect(() => {
        const on = () => setRoute(read());
        window.addEventListener("hashchange", on);
        return () => window.removeEventListener("hashchange", on);
    }, []);
    const go = useCallback((key) => {
        window.location.hash = `/${key}`;
    }, []);
    return [route, go];
}