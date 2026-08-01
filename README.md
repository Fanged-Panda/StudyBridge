<div align="center">

# 🎓 StudyBridge

**Your Academic Journey, Redefined**

Navigate your academic journey with confidence. Discover world-class institutions, prepare for entrance exams, find scholarships, and get AI-powered guidance — all in one place.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🏛️ **University Discovery** | Browse and filter universities by country, ranking, tuition fees, and admission requirements (IELTS/GRE). Save favorites for later. |
| 📝 **Exam Preparation** | Take mock tests with timers, track your progress, and identify areas for improvement. |
| 💰 **Scholarship Hub** | Discover scholarships that match your profile and academic interests. |
| 🤖 **AI Chatbot** | Get instant answers about universities, applications, deadlines, and academic guidance. |
| 👤 **Personal Dashboard** | Track your shortlisted universities, saved scholarships, application readiness, and personalized recommendations. |

## 🧰 Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 7** | Build tool & dev server |
| **Tailwind CSS 3** | Utility-first styling |
| **React Router 7** | Client-side routing |
| **Axios** | HTTP client for API calls |
| **Lucide React** | Icon library |

### Backend

| Technology | Purpose |
|---|---|
| **Node.js** | Runtime |
| **Express 4** | Web framework |
| **Prisma 6** | ORM & database client |
| **PostgreSQL** | Database |
| **JWT** | Authentication (JSON Web Tokens) |
| **bcryptjs** | Password hashing |

## 🏗️ Architecture

```
StudyBridge/
│
├── frontend/          # React SPA (Vite + Tailwind)
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── features/      # Feature-specific components
│       ├── layouts/       # Page layouts
│       ├── pages/         # Route pages
│       └── services/      # API client (axios)
│
├── backend/           # Node + Express API
│   └── src/
│       ├── config/        # Environment & database config
│       ├── middleware/     # Auth & error middleware
│       ├── modules/       # Feature modules
│       └── routes/        # API route aggregation
│
└── docs/              # Architecture & database docs
```

### Request Flow

```
Client
  ↓ HTTP
Route (backend/src/routes/index.js)
  ↓
Controller (backend/src/modules/*/controller.js)
  ↓
Service (backend/src/modules/*/service.js)
  ↓
Prisma ORM
  ↓
PostgreSQL
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18
- **PostgreSQL** >= 14
- **npm**

### Environment Setup

Create a `.env` file in `backend/`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/studybridge"
JWT_SECRET="your-secret-key"
PORT=5001
```

> **Note:** The backend defaults to port **5000** if `PORT` is not set. The root `npm run dev` command explicitly sets `PORT=5001` to avoid conflicts.

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/studybridge.git
cd studybridge

# Install all dependencies
npm install                          # Root — concurrently for dev
npm install --prefix frontend        # React + Vite
npm install --prefix backend         # Express + Prisma

# Set up the database
cd backend
npx prisma generate
npx prisma migrate dev --name init
cd ..

# (Optional) Seed sample data
cd backend && npx prisma db seed
```

> **Before seeding:** Make sure `backend/package.json` has a `"prisma": { "seed": "node prisma/seed.js" }` entry. If not, add it.

### Development

```bash
# Run both frontend & backend concurrently
npm run dev
```

This starts:
- **Frontend** → `http://localhost:5173` (Vite dev server)
- **Backend** → `http://localhost:5001` (Express API)

Or run them separately:

```bash
# Backend only (defaults to port 5000)
npm run dev --prefix backend

# Frontend only
npm run dev --prefix frontend
```

### Production Build

```bash
npm run build --prefix frontend
npm start --prefix backend
```

## 📁 Project Structure

```
frontend/src/
├── components/
│   ├── ui/           # Base UI (Button, Card, Input, Badge)
│   ├── navbar/       # Top navigation bar
│   └── common/       # TypewriterHero, Footer, ScrollPlaneProgress
├── features/
│   ├── auth/         # Login form, score match card
│   ├── universities/ # Filter sidebar, uni cards, featured section
│   ├── tests/        # Timer, quick quiz section
│   ├── ai/           # Chat widget, banner, notification bell
│   └── scholarships/ # Scholarship components
├── layouts/          # MainLayout, DashboardLayout, AdminLayout
├── pages/            # Route page components
└── services/         # API client (axios)

backend/src/
├── config/           # Database & environment config
├── middleware/        # Auth, admin, error middleware
├── modules/
│   ├── auth/         # Registration, login, JWT
│   ├── universities/ # CRUD + saved universities
│   ├── tests/        # Quiz questions & attempts
│   ├── ai/           # Chatbot endpoints
│   ├── scholarships/ # Scholarship management
│   ├── applications/ # University applications
│   ├── notifications/# User notifications
│   ├── matching/     # University matching engine
│   ├── admin/        # Admin panel
│   └── users/        # User management
└── routes/           # Combined API routes
```

## 🌐 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/auth/register` | POST | Create a new account |
| `/api/auth/login` | POST | Sign in and receive JWT |
| `/api/universities` | GET | List all universities |
| `/api/universities/:id` | GET | Get university details |
| `/api/universities/saved` | GET | Get saved universities |
| `/api/universities/saved` | POST | Save a university |
| `/api/quiz` | GET | Get quiz questions |
| `/api/quiz/submit` | POST | Submit quiz attempt |
| `/api/chatbot` | POST | Send message to AI chatbot |

## 🗄️ Database

PostgreSQL managed via Prisma ORM. Key models:

- **User** — Authentication & profile (name, email, role, IELTS/GRE scores)
- **University** — Institution details (rankings, tuition, requirements)
- **UserSavedUni** — Many-to-many bookmark relationship
- **StudentProfile** — Extended student data
- **TestScore** — Standardized test results
- **Application** — University application tracking
- **AIConversation** — Chat history

Full schema: [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)

## 📄 License

MIT

## 📱 Progressive Web App (PWA)

StudyBridge ships as an installable PWA built with `vite-plugin-pwa` (Workbox, `injectManifest` mode).

### Features

- **Installable** — Chrome/Edge/Android show an install prompt (custom `InstallButton` in the top nav, driven by `usePwaInstall`); `appinstalled` hides it afterwards.
- **Standalone window** — `display: standalone` in the manifest; splash screen + theme color from `#1a2b48` / `#f8f9ff`.
- **Offline support** — the app shell and static assets are precached. Online navigations fetch fresh HTML (`NetworkFirst`); offline, cached pages keep working; uncached routes fall back to the branded [`offline.html`](frontend/public/offline.html). An in-app banner (`OfflineBanner`) appears when the connection drops.
- **Auto-updates** — `registerType: 'autoUpdate'` + `skipWaiting`/`clientsClaim`: a new deployment's service worker takes over on the next load; old precaches are cleaned automatically.
- **API never cached** — all `/api/*` requests (login, register, profile, authenticated calls) run `NetworkOnly`. Only safe static assets are cached: hashed JS/CSS, images (`CacheFirst`), and Google Fonts (`StaleWhileRevalidate`).
- **Routing** — client-side `BrowserRouter` is untouched; the Vercel SPA rewrite already serves `index.html` for all routes, and `sw.js`/`manifest.webmanifest`/`offline.html` are served with no-cache headers.

### Icons & assets

`frontend/scripts/generate-icons.mjs` rasterizes `public/logo.svg` + `public/logo-maskable.svg` (via `sharp`) into every required size (72–512, maskable 192/512, apple-touch 180, favicons, manifest screenshots). Regenerate after brand changes:

```bash
cd frontend && npm run icons
```

### Push notifications (prepared, not live)

The service worker (`frontend/src/pwa/sw.js`) already handles `push` + `notificationclick`. Client helpers live in `frontend/src/pwa/notifications.js` (`requestNotificationPermission`, `subscribeToPush`, VAPID key conversion). To go live: add a web-push endpoint on the Render backend, expose a VAPID public key, and call `subscribeToPush(vapidKey)` from the UI.

### Testing the PWA locally

```bash
cd frontend
npm run build          # emits dist/, sw.js, manifest.webmanifest
npm run preview        # served at http://localhost:4173
```

Then open the preview URL in Chrome → DevTools → Application → Manifest / Service Worker, or run Lighthouse (`npx lighthouse http://localhost:4173 --view`) to check installability and scores.
