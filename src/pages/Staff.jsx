import { useState } from "react";
import { useFeedback } from "../components/Feedback";
import { Avatar, Badge, Button, Card, Empty, ErrorNote, Field, Modal, PageHeader, Skeleton } from "../components/ui";
import useWatch from "../hooks/useWatch";
import { fmtStamp } from "../lib/format";
import { removeStaff, saveStaff, watchStaff } from "../services/staff";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+\$/;

function AddModal({ existing, by, onClose }) {
    const { toast } = useFeedback();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("cashier");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const save = async () => {
        const clean = email.trim().toLowerCase();
        if (!EMAIL.test(clean)) return setErr("Enter a valid Google email address.");
        const target = existing.find((m) => m.email.toLowerCase() === clean);
        if (target?.root) return setErr("The primary owner account cannot be modified.");
        setBusy(true);
        try {
            await saveStaff(clean, { name: name.trim(), role, active: true }, by);
            toast(target ? `Updated ${clean}` : `Added ${clean} as ${role}`);
            onClose();
        } catch (e) {
            setErr(e.message);
            setBusy(false);
        }
    };

    return (
        <Modal
            title="Add staff"
            onClose={onClose}
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button loading={busy} onClick={save}>Authorize</Button>
                </div>
            }>
            <div className="space-y-4">
                <Field label="Google email" hint="They sign in to the POS with this Google account.">
                    <input autoFocus type="email" className="input" placeholder="cashier@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="Name (optional)">
                    <input className="input" placeholder="e.g. Rahul Sharma" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Role">
                    <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="cashier">Cashier: billing, own voids, sold-out toggle</option>
                        <option value="owner">Owner: everything, including this console</option>
                    </select>
                </Field>
                {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
            </div>
        </Modal>
    );
}

export default function Staff({ user }) {
    const { toast, confirm } = useFeedback();
    const { data: list, loading, error } = useWatch(watchStaff, [], []);
    const [adding, setAdding] = useState(false);

    const activeOwners = list.filter((m) => m.role === "owner" && m.active).length;
    // Never allow locking out the primary root owner, yourself, or the last active owner.
    const locked = (m) =>
        m.root ||
        m.email.toLowerCase() === user.email ||
        (m.role === "owner" && m.active && activeOwners <= 1);

    const update = (m, patch) =>
        saveStaff(m.email, { name: m.name, role: m.role, active: m.active, ...patch }, user.email).catch((e) =>
            toast(e.code === "permission-denied" ? "Permission denied." : e.message, "error"),
        );

    const remove = async (m) => {
        if (await confirm({ title: "Remove staff", message: `Remove ${m.email}? They can no longer sign in to the POS.`, confirmLabel: "Remove", danger: true }))
            removeStaff(m.email).then(() => toast(`Removed ${m.email}`)).catch((e) => toast(e.message, "error"));
    };

    return (
        <>
            <PageHeader
                title="Staff"
                desc="Only people on this list can use the POS app."
                actions={<Button icon="plus" onClick={() => setAdding(true)}>Add staff</Button>}
            />
            <ErrorNote error={error} />

            <Card title={`Authorized accounts (${list.length})`} pad={false}>
                {loading ? (
                    <div className="p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="mb-2 h-16" />)}</div>
                ) : list.length === 0 ? (
                    <Empty icon="users" title="No staff yet" />
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {list.map((m) => {
                            const lock = locked(m);
                            const self = m.email.toLowerCase() === user.email;
                            return (
                                <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5">
                                    <Avatar name={m.name || m.email} />
                                    <div className="min-w-0 flex-1 basis-52">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="truncate text-sm font-bold text-slate-900">{m.name || m.email}</span>
                                            {self && <Badge>You</Badge>}
                                            {m.root && <Badge tone="amber">Primary</Badge>}
                                            <Badge tone={m.role === "owner" ? "blue" : "slate"}>{m.role === "owner" ? "Manager" : "Staff"}</Badge>
                                            {!m.active && <Badge tone="red">Disabled</Badge>}
                                        </div>
                                        <div className="truncate text-xs text-slate-500">
                                            {m.email}{m.updatedAt ? ` · updated ${fmtStamp(m.updatedAt)}` : ""}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            aria-label={`Role for ${m.email}`}
                                            disabled={lock}
                                            value={m.role}
                                            onChange={(e) => update(m, { role: e.target.value })}
                                            className="input !w-auto !py-1.5 !text-xs font-bold">
                                            <option value="cashier">Staff</option>
                                            <option value="owner">Manager</option>
                                        </select>
                                        <Button variant="secondary" size="sm" disabled={lock} onClick={() => update(m, { active: !m.active })}>
                                            {m.active ? "Disable" : "Enable"}
                                        </Button>
                                        <Button variant="danger" size="sm" disabled={lock} onClick={() => remove(m)}>Remove</Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Card>

            <Card className="mt-4" title="How access works">
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
                    <li>Anyone can attempt a Google sign-in, but accounts not on this list are refused by the POS and by the database.</li>
                    <li>To stop accepting new staff, simply don't add new emails. Disable someone to revoke access instantly.</li>
                    <li>A disabled phone that is offline keeps its cached role until it next reaches the server, then its pending bills are rejected.</li>
                    <li>The primary owner, your own account, and the last active owner are protected from being disabled or removed.</li>
                </ul>
            </Card>

            {adding && <AddModal existing={list} by={user.email} onClose={() => setAdding(false)} />}
        </>
    );
}