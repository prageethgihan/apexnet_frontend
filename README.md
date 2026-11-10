# ApexNet LK - VPN Business Management & Client Portal 🛡️⚡

[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**ApexNet LK** is a full-featured commercial VPN management web portal designed for selling, provisioning, and administering secure VPN connection services. It provides a seamless frontend client experience for ordering subscription plans and an administrative control panel for managing VPN credentials, active users, and system metrics.

---

## 🌟 Key Features

- **🌐 Client Portal & Order System:** Intuitive interface for customers to browse VPN subscription tiers and submit automated order requests.
- **📊 Admin Control Panel:** Secure dashboard for administrators to monitor active VPN connections, total bandwidth, and server loads in real time via `useVpnStats`.
- **🔑 Dynamic VPN Account Provisioning:** Generate, assign, and revoke VPN credentials directly from the management modal.
- **🔒 Enterprise-Grade Security:** Role-based access control with Protected and Admin-only routes powered by **Firebase Authentication**.
- **🚀 Production Ready Deployment:** Configured for high-speed edge distribution via **Vercel** with PM2 cluster support (`ecosystem.config.js`).

---

## 🛠️ Tech Stack

- **Frontend Framework:** React 18 & Vite
- **Styling:** Tailwind CSS & Lucide React Icons
- **Authentication & Backend:** Firebase Auth & Node.js / Express microservice
- **State & Routing:** React Router DOM (v6) with custom Auth guards
- **Process Manager & Deployment:** PM2 (`ecosystem.config.js`), Vercel (`vercel.json`)

---

## 📁 Architecture & File Layout

```bash
apexnet_frontend/
├── public/                     # Static brand assets & logos
├── server/                     # Backend API & process configuration
│   ├── .env.example            # Backend environment variables
│   ├── ecosystem.config.js     # PM2 production process configuration
│   ├── index.js                # Express API entry point
│   └── package.json            # Server dependencies
├── src/
│   ├── assets/                 # Graphics & hero banners
│   ├── components/
│   │   ├── AdminRoute.jsx        # Route guard for admin verification
│   │   ├── ProtectedRoute.jsx    # Route guard for authenticated users
│   │   ├── CustomerOrderForm.jsx # Client package ordering form
│   │   ├── CreateVpnModal.jsx    # Admin modal to provision VPN accounts
│   │   └── ManagePlans.jsx       # Pricing tiers and plan manager
│   ├── hooks/
│   │   └── useVpnStats.js        # Real-time VPN connection metrics
│   ├── pages/
│   │   ├── AdminDashboard.jsx    # Admin management & metrics overview
│   │   ├── AdminLogin.jsx        # Secure login for administrators
│   │   └── MyProfile.jsx         # Client account and subscription details
│   ├── services/
│   │   └── vpnApi.js             # API client for VPN backend services
│   ├── firebase.js             # Firebase SDK client initialization
│   ├── App.jsx                 # Main application routes & navigation
│   └── main.jsx                # React app bootstrapping
├── vercel.json                 # Vercel SPA routing and headers
└── package.json                # Project dependencies
```

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/prageethgihan/apexnet_frontend.git
cd apexnet_frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

