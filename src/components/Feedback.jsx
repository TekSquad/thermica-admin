import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Icon from "./Icon";
import { Button, Modal } from "./ui";
import { uid } from "../lib/format";

const Ctx = createContext(null);
export const useFeedback = () => useContext(Ctx);

export function FeedbackProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const [dialog, setDialog] = useState(null);

    const toast = useCallback((text, kind = "ok") => {
        const id = uid();
        setToasts((t) => [...t.slice(-2), { id, text, kind }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 5000 : 2800);
    }, []);

    // confirm({ title, message, confirmLabel, danger }) -> Promise<boolean>
    const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);
    const settle = (ok) => {
        dialog.resolve(ok);
        setDialog(null);
    };

    const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

    return (
        <Ctx.Provider value={value}>
            {children}

            <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        role="status"
                        className={`animate-rise pointer-events-auto flex max-w-md items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${t.kind === "error" ? "bg-red-600" : "bg-slate-900"}`}>
                        <Icon name={t.kind === "error" ? "alert" : "check"} className="h-4 w-4 shrink-0" />
                        <span>{t.text}</span>
                    </div>
                ))}
            </div>

            {dialog && (
                <Modal
                    size="sm"
                    title={dialog.title}
                    onClose={() => settle(false)}
                    footer={
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => settle(false)}>Cancel</Button>
                            <Button variant={dialog.danger ? "danger" : "primary"} onClick={() => settle(true)}>
                                {dialog.confirmLabel || "Confirm"}
                            </Button>
                        </div>
                    }>
                    <p className="text-sm text-slate-600">{dialog.message}</p>
                </Modal>
            )}
        </Ctx.Provider>
    );
}