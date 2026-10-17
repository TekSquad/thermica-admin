export const SHARED_KEYS = [
    "name", "tagline", "address", "phone", "header", "footer",
    "showBill", "showDate", "showPayment", "headerMode", "printKitchen", "logo",
];

export const DEFAULT_SETTINGS = {
    name: "The Kaabil Kitchen",
    tagline: "A Tea Place for Employees",
    address: "",
    phone: "",
    header: "",
    footer: "Thank you! Visit again.",
    showBill: true,
    showDate: false,
    showPayment: false,
    headerMode: "text",
    printKitchen: true,
    logo: null,
};

export const pickShared = (value) =>
    Object.fromEntries(SHARED_KEYS.filter((k) => value?.[k] !== undefined).map((k) => [k, value[k]]));