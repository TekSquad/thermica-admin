# Thermica POS Admin Panel

A secure, high-density web-based administration panel built for **Thermica POS**. Designed exclusively for business owners to remotely configure shared receipt metadata, preview thermal formats in real time, and manage staff access control.

---

## Features

- **Owner Authentication:** Secure Google Sign-In with strict Firestore role-based access verification (`owner` only).
- **Shared Receipt Configuration:** Remotely update business names, taglines, contact details, custom headers, footers, and receipt feature toggles.
- **Thermal Logo Processing:** Built-in HTML5 canvas image pipeline that automatically crops whitespace, scales to thermal width (`58mm` / `80mm`), and converts logos to 1-bit monochrome.
- **Live Thermal Receipt Preview:** Toggleable live preview rendered in exact monospace character widths (`30` or `48 chars`) to inspect layouts before publishing.
- **Staff & Cashier Management:** Authorize new Google accounts, toggle active login permissions, and assign owner/cashier roles on the fly.

---

## Tech Stack

- **Framework:** React 19, Vite
- **Styling:** Tailwind CSS (v4)
- **Backend & Auth:** Firebase Firestore & Authentication

---

## Getting Started

### 1. Clone & Install

```bash
git clone [https://github.com/your-username/thermica-admin.git](https://github.com/your-username/thermica-admin.git)
cd thermica-admin
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory and add your Firebase credentials:

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_BUSINESS_ID=kaabil
```

### 3. Run Development Server

```bash
npm run build
```

## License

Private & Commercial. Built for TekSquad.

---

### Repository Metadata Summary (for GitHub Settings)

- **Repository Name:** `thermica-admin`
- **Description:** Secure web-based admin panel for Thermica POS to manage shared receipt settings, thermal logos, and staff access control.
- **Topics:** `pos`, `admin-panel`, `react`, `tailwind`, `firebase`, `thermal-printer`
