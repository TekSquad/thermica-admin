import { useCallback, useEffect, useState } from "react";
import { useFeedback } from "../components/Feedback";
import { Badge, Button, Card, Empty, ErrorNote, Field, Modal, PageHeader, Skeleton } from "../components/ui";
import { fetchMasterBusinesses, provisionBusiness } from "../services/platform";

const SLUG_REGEX = /^[a-z0-9-_]+\$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+\$/;

function ProvisionModal({ adminEmail, onClose, onCreated }) {
    const { toast } = useFeedback();
    const [bizId, setBizId] = useState("");
    const [name, setName] = useState("");
    const [ownerEmail, setOwnerEmail] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        const slug = bizId.trim().toLowerCase();
        const email = ownerEmail.trim().toLowerCase();

        if (!SLUG_REGEX.test(slug)) return setErr("Business ID slug can only contain lowercase letters, numbers, hyphens, and underscores.");
        if (!name.trim()) return setErr("Enter a business display name.");
        if (!EMAIL_REGEX.test(email)) return setErr("Enter a valid owner email address.");

        setBusy(true);
        setErr("");
        try {
            await provisionBusiness({ bizId: slug, name, ownerEmail: email, ownerName }, adminEmail);
            toast(`Successfully provisioned business: ${slug}`);
            onCreated();
        } catch (e) {
            setErr(e.message || "Failed to provision business.");
            setBusy(false);
        }
    };

    return (
        <Modal
            title="Provision New Business"
            onClose={onClose}
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button loading={busy} onClick={submit}>Create Business</Button>
                </div>
            }>
            <div className="space-y-4">
                <Field label="Business ID Slug" hint="Unique URL-safe identifier (e.g. cafe-bliss, spice-route)">
                    <input
                        autoFocus
                        className="input font-mono"
                        placeholder="cafe-bliss"
                        value={bizId}
                        onChange={(e) => setBizId(e.target.value.toLowerCase())}
                    />
                </Field>

                <Field label="Business Display Name">
                    <input
                        className="input"
                        placeholder="Cafe Bliss & Kitchen"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </Field>

                <Field label="Primary Owner Email" hint="Google account email that will manage this tenant">
                    <input
                        type="email"
                        className="input"
                        placeholder="owner@cafebliss.com"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                    />
                </Field>

                <Field label="Owner Name (Optional)">
                    <input
                        className="input"
                        placeholder="Rahul Sharma"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                    />
                </Field>

                {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
            </div>
        </Modal>
    );
}

export default function MasterConsole({ user }) {
    const [state, setState] = useState({ businesses: [], loading: true, error: null });
    const [modalOpen, setModalOpen] = useState(false);

    const load = useCallback(async () => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const businesses = await fetchMasterBusinesses();
            setState({ businesses: businesses.sort((a, b) => b.createdAt - a.createdAt), loading: false, error: null });
        } catch (error) {
            setState((s) => ({ ...s, loading: false, error }));
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <>
            <PageHeader
                title="TekSquad Master Console"
                desc="Platform management for all provisioned client businesses"
                actions={
                    <>
                        <Button variant="secondary" icon="refresh" onClick={load}>Refresh</Button>
                        <Button icon="plus" onClick={() => setModalOpen(true)}>New Business</Button>
                    </>
                }
            />
            <ErrorNote error={state.error} onRetry={load} />

            <Card title={`Active Businesses (${state.businesses.length})`} pad={false}>
                {state.loading && !state.businesses.length ? (
                    <div className="p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="mb-2 h-16" />)}</div>
                ) : state.businesses.length === 0 ? (
                    <Empty icon="database" title="No businesses provisioned yet" hint="Click 'New Business' to set up your first client tenant." />
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {state.businesses.map((b) => (
                            <li key={b.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                                <div className="min-w-0 flex-1 basis-64">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-slate-900">{b.name}</span>
                                        <Badge tone="green">{b.status || "active"}</Badge>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 font-mono text-xs text-slate-500">
                                        <span>ID: {b.bizId}</span>
                                        <span>·</span>
                                        <span>Owner: {b.ownerEmail}</span>
                                    </div>
                                </div>
                                <div className="text-right text-xs text-slate-400">
                                    Created {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            {modalOpen && (
                <ProvisionModal
                    adminEmail={user.email}
                    onClose={() => setModalOpen(false)}
                    onCreated={() => {
                        setModalOpen(false);
                        load();
                    }}
                />
            )}
        </>
    );
}