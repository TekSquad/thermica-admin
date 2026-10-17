import { Component } from "react";
import { Button } from "./ui";

export default class ErrorBoundary extends Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error("[THERMICA ADMIN] crash", error, info?.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div className="grid place-items-center py-24 text-center">
                <div>
                    <div className="text-base font-extrabold text-slate-900">Something went wrong on this page</div>
                    <p className="mt-1 text-sm text-slate-500">Your data is safe. Try again or reload.</p>
                    <div className="mt-4 flex justify-center gap-2">
                        <Button variant="secondary" onClick={() => this.setState({ error: null })}>Try again</Button>
                        <Button onClick={() => window.location.reload()}>Reload</Button>
                    </div>
                </div>
            </div>
        );
    }
}