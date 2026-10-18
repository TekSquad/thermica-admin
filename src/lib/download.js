export function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** JSON.stringify that turns Firestore Timestamps into ISO strings. */
export function toJson(data) {
    return JSON.stringify(
        data,
        function (key, value) {
            const raw = this[key];
            return raw && typeof raw.toDate === "function" ? raw.toDate().toISOString() : value;
        },
        2,
    );
}