import { useCallback, useEffect, useRef, useState } from "react";
import { fetchBills } from "../services/bills";

export default function useBills(from, to) {
    const [state, setState] = useState({ bills: [], loading: true, error: null, at: null });
    const req = useRef(0);

    const load = useCallback(
        async (force = false) => {
            const id = ++req.current;
            setState((s) => ({ ...s, loading: true, error: null }));
            try {
                const bills = await fetchBills(from, to, { force });
                if (id === req.current) setState({ bills, loading: false, error: null, at: Date.now() });
            } catch (error) {
                if (id === req.current) setState((s) => ({ ...s, loading: false, error }));
            }
        },
        [from, to],
    );

    useEffect(() => {
        load(false);
    }, [load]);

    return { ...state, reload: () => load(true) };
}