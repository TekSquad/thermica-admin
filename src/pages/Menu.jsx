import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import { useFeedback } from "../components/Feedback";
import { Badge, Button, Card, Empty, ErrorNote, Field, IconButton, Modal, PageHeader, Segmented, Skeleton, Toggle } from "../components/ui";
import useWatch from "../hooks/useWatch";
import { inr, uid } from "../lib/format";
import {
    deleteProduct, renameCategory, saveCategories, saveProduct, setAvailable, watchCategories, watchProducts,
} from "../services/menu";

function ProductModal({ product, categories, onClose, onSaved }) {
    const { toast } = useFeedback();
    const [d, setD] = useState({
        name: product.name ?? "",
        price: product.price ?? "",
        category: product.category ?? categories[0] ?? "",
        description: product.description ?? "",
        available: product.available !== false,
    });
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setD((c) => ({ ...c, [k]: e.target.value }));

    const save = async () => {
        const price = Number(d.price);
        if (!d.name.trim()) return setErr("Enter a product name.");
        if (d.price === "" || !Number.isFinite(price) || price < 0) return setErr("Enter a valid price.");
        setBusy(true);
        try {
            await saveProduct({
                ...(product.id ? {} : { createdAt: Date.now() }),
                id: product.id ?? uid(),
                name: d.name.trim(),
                price: Math.round(price * 100) / 100,
                category: d.category,
                description: d.description.trim(),
                available: d.available,
            });
            toast(product.id ? "Product updated" : "Product added");
            onSaved();
        } catch (e) {
            setErr(e.message);
            setBusy(false);
        }
    };

    return (
        <Modal
            title={product.id ? "Edit product" : "Add product"}
            onClose={onClose}
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button loading={busy} onClick={save}>Save product</Button>
                </div>
            }>
            <div className="space-y-4">
                <Field label="Name"><input autoFocus className="input" value={d.name} onChange={set("name")} placeholder="e.g. Masala Dosa" /></Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Price (₹)"><input className="input" type="number" inputMode="decimal" min="0" step="0.01" value={d.price} onChange={set("price")} placeholder="0" /></Field>
                    <Field label="Category">
                        <select className="input" value={d.category} onChange={set("category")}>
                            {categories.length === 0 && <option value="">None</option>}
                            {categories.map((c) => <option key={c}>{c}</option>)}
                        </select>
                    </Field>
                </div>
                <Field label="Description (optional)"><input className="input" value={d.description} onChange={set("description")} placeholder="Shown under the item name" /></Field>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div>
                        <div className="text-sm font-bold text-slate-900">Available</div>
                        <div className="text-xs text-slate-500">Turn off when sold out</div>
                    </div>
                    <Toggle label="Available" checked={d.available} onChange={(v) => setD((c) => ({ ...c, available: v }))} />
                </div>
                {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
            </div>
        </Modal>
    );
}

function CategoryModal({ initial, existing, onClose, onSave }) {
    const [name, setName] = useState(initial ?? "");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const save = async () => {
        const n = name.trim();
        if (!n) return setErr("Enter a category name.");
        if (existing.some((c) => c.toLowerCase() === n.toLowerCase() && c !== initial)) return setErr("That category already exists.");
        setBusy(true);
        try {
            await onSave(n);
        } catch (e) {
            setErr(e.message);
            setBusy(false);
        }
    };

    return (
        <Modal
            size="sm"
            title={initial ? "Rename category" : "Add category"}
            onClose={onClose}
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button loading={busy} onClick={save}>Save</Button>
                </div>
            }>
            <Field label="Name" error={err}>
                <input autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} placeholder="e.g. Beverages" />
            </Field>
        </Modal>
    );
}

export default function Menu() {
    const { toast, confirm } = useFeedback();
    const products = useWatch(watchProducts, [], []);
    const cats = useWatch(watchCategories, [], []);
    const [tab, setTab] = useState("products");
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("all");
    const [pEdit, setPEdit] = useState(null);
    const [cEdit, setCEdit] = useState(null);

    const list = products.data;
    const categories = cats.data;
    const loading = products.loading || cats.loading;

    const counts = useMemo(() => {
        const m = {};
        list.forEach((p) => (m[p.category] = (m[p.category] || 0) + 1));
        return m;
    }, [list]);

    const shown = useMemo(() => {
        const query = q.trim().toLowerCase();
        return list.filter(
            (p) =>
                (filter === "all" || p.category === filter) &&
                (!query || `${p.name} ${p.description ?? ""}`.toLowerCase().includes(query)),
        );
    }, [list, q, filter]);

    const run = (promise, ok) => promise.then(() => ok && toast(ok)).catch((e) => toast(e.message, "error"));

    const removeProduct = async (p) => {
        if (await confirm({ title: "Delete product", message: `Delete "${p.name}"? Past bills keep their item names.`, confirmLabel: "Delete", danger: true }))
            run(deleteProduct(p.id), "Product deleted");
    };

    const removeCategory = async (c) => {
        if (counts[c]) return toast(`"${c}" still has ${counts[c]} product(s). Move or delete them first.`, "error");
        if (await confirm({ title: "Delete category", message: `Delete "${c}"?`, confirmLabel: "Delete", danger: true }))
            run(saveCategories(categories.filter((x) => x !== c)), "Category deleted");
    };

    return (
        <>
            <PageHeader
                title="Menu"
                desc={`${list.length} item${list.length === 1 ? "" : "s"} in ${categories.length} categor${categories.length === 1 ? "y" : "ies"}`}
                actions={
                    tab === "products" ? (
                        <Button icon="plus" onClick={() => setPEdit({})}>Add product</Button>
                    ) : (
                        <Button icon="plus" onClick={() => setCEdit({})}>Add category</Button>
                    )
                }
            />
            <ErrorNote error={products.error || cats.error} />

            <Segmented className="mb-4" value={tab} onChange={setTab} options={[["products", "Products"], ["categories", "Categories"]]} />

            {tab === "products" ? (
                <Card pad={false}>
                    <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-[1fr_14rem]">
                        <div className="relative">
                            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input className="input !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" />
                        </div>
                        <select aria-label="Category" className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="all">All categories</option>
                            {categories.map((c) => <option key={c}>{c}</option>)}
                        </select>
                    </div>

                    {loading ? (
                        <div className="space-y-px p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="mb-2 h-14" />)}</div>
                    ) : shown.length === 0 ? (
                        <Empty icon="grid" title={list.length ? "No products match" : "No products yet"} hint={list.length ? "Try a different search or category." : "Add your first menu item to start billing."} />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {shown.map((p) => (
                                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                                    <div className="min-w-0 flex-1 basis-48">
                                        <div className="truncate text-sm font-bold text-slate-900">{p.name}</div>
                                        <div className="truncate text-xs text-slate-500">{p.description || "No description"}</div>
                                    </div>
                                    <Badge className="hidden sm:inline-flex">{p.category || "Uncategorised"}</Badge>
                                    <span className="w-20 text-right text-sm font-extrabold tabular-nums text-slate-900">{inr(p.price)}</span>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                        <Toggle label={`${p.name} in stock`} checked={p.available !== false} onChange={(v) => run(setAvailable(p.id, v))} />
                                        <span className="hidden w-14 sm:inline">{p.available === false ? "Sold out" : "In stock"}</span>
                                    </label>
                                    <div className="flex">
                                        <IconButton name="pencil" label={`Edit ${p.name}`} onClick={() => setPEdit(p)} />
                                        <IconButton name="trash" label={`Delete ${p.name}`} onClick={() => removeProduct(p)} className="hover:!bg-red-50 hover:!text-red-600" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            ) : (
                <Card pad={false}>
                    {loading ? (
                        <div className="p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="mb-2 h-14" />)}</div>
                    ) : categories.length === 0 ? (
                        <Empty icon="grid" title="No categories yet" hint="Categories organise the menu on the POS screen." />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {categories.map((c) => (
                                <li key={c} className="flex items-center gap-3 px-4 py-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-bold text-slate-900">{c}</div>
                                        <div className="text-xs text-slate-500">{counts[c] || 0} product{counts[c] === 1 ? "" : "s"}</div>
                                    </div>
                                    <IconButton name="pencil" label={`Rename ${c}`} onClick={() => setCEdit({ name: c })} />
                                    <IconButton name="trash" label={`Delete ${c}`} onClick={() => removeCategory(c)} className="hover:!bg-red-50 hover:!text-red-600" />
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            )}

            {pEdit && (
                <ProductModal key={pEdit.id ?? "new"} product={pEdit} categories={categories} onClose={() => setPEdit(null)} onSaved={() => setPEdit(null)} />
            )}
            {cEdit && (
                <CategoryModal
                    initial={cEdit.name}
                    existing={categories}
                    onClose={() => setCEdit(null)}
                    onSave={async (name) => {
                        if (!cEdit.name) await saveCategories([...categories, name]);
                        else
                            await renameCategory(
                                categories.map((c) => (c === cEdit.name ? name : c)),
                                list.filter((p) => p.category === cEdit.name).map((p) => p.id),
                                name,
                            );
                        toast(cEdit.name ? "Category renamed" : "Category added");
                        setCEdit(null);
                    }}
                />
            )}
        </>
    );
}