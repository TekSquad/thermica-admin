import { useEffect, useState } from "react";

/** Subscribe to a service watcher: useWatch(watchProducts, [], []) -> { data, loading, error } */
export default function useWatch(subscribe, deps = [], initial = null) {
    const [state, setState] = useState({ data: initial, loading: true, error: null });

    useEffect(() => {
        setState((s) => ({ ...s, loading: true, error: null }));
        return subscribe(
            (data) => setState({ data, loading: false, error: null }),
            (error) => setState((s) => ({ ...s, loading: false, error })),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return state;
}