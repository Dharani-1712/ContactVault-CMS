# 📇 ContactVault — Advanced Contact Management System

![ContactVault Banner](https://via.placeholder.com/1200x300/0D0D0D/2563EB?text=ContactVault+CMS)

A full-stack, production-ready **Contact Management System** featuring role-based authentication, smart duplicate detection, digital contact cards, group organisation, favorites, CSV import/export, and real-time activity tracking — built with **HTML/CSS/JS**, **Node.js/Express**, and **Firebase**.

---

## ✨ Features

### 🔐 Authentication & Roles
- Firebase Authentication (email/password + Google OAuth)
- Two roles: **User** and **Admin**
- Secure role-based access control on all routes

### 👥 Contact Management
- Add, view, edit, delete contacts (name, phone, email, address, notes, photo)
- Grid and list (table) view modes
- Sort A→Z, Z→A, newest, oldest

### 🔍 Duplicate Detection
- Auto-detects duplicates by phone or email on creation
- Warns user with conflict details
- Options: Save Anyway, Cancel, or Merge

### 📁 Contact Grouping
- Create unlimited groups (Family, Work, Friends, etc.)
- Assign contacts to multiple groups
- Filter contacts by group
- Contacts-per-group bar chart on dashboard

### 💳 Digital Contact Cards
- Beautiful dark-themed card with avatar, ID, name, phone, email, group
- Generated on-demand from the View Contact modal

### ❤️ Favorites System
- One-click heart toggle on any contact card
- Dedicated Favorites section
- Instant add/remove with Firestore sync

### 🔎 Advanced Search & Filters
- Global search bar (name, phone, email)
- Group filter dropdown
- Sort controls
- Combines all filters simultaneously

### 📋 Activity Tracking
- Every create, update, delete, import, favorite action is logged
- Timestamped logs stored in Firestore
- User sees own logs; Admin sees all logs

### 📊 Dashboard Analytics
- Total contacts, favorites, groups, weekly additions
- Contacts-per-group horizontal bar chart
- Recent contacts list
- Admin: total users, system-wide analytics

### 📥📤 Import / Export
- **Export**: Download all contacts as `.csv`
- **Import**: Upload a `.csv` file with preview before committing
- CSV format: `name, phone, email, address, notes, groups`

### 🎨 UI/UX
- Dark mode toggle (persisted in `localStorage`)
- Responsive design (mobile-friendly)
- Toast notifications for all actions
- Smooth animations and transitions
- Syne + DM Sans typography

### 🛡️ Admin Dashboard
- View all users system-wide
- Promote/demote user roles
- Delete users and their data
- View all contacts across all users
- Full activity log viewer

---

## 🗂️ Project Structure

```
ContactVault/
├── frontend/
│   ├── index.html                  # Redirect to login
│   ├── css/
│   │   └── styles.css              # Full design system
│   ├── js/
│   │   └── app.js                  # Shared utilities & helpers
│   └── pages/
│       ├── login.html              # Login page (User + Admin)
│       ├── register.html           # Registration page
│       ├── user-dashboard.html     # Full user app (single page)
│       └── admin-dashboard.html    # Admin control panel
│
├── backend/
│   ├── server.js                   # Express entry point
│   ├── package.json
│   ├── .env.example                # Environment template
│   ├── config/
│   │   └── firebase.js             # Firebase Admin SDK init
│   ├── middleware/
│   │   ├── auth.js                 # JWT verification + role guard
│   │   └── logger.js               # Activity log writer
│   └── routes/
│       ├── auth.js                 # Register, profile, delete account
│       ├── contacts.js             # CRUD, duplicate detect, CSV import/export
│       ├── groups.js               # Group CRUD
│       ├── favorites.js            # Favorites toggle
│       ├── activityLogs.js         # Log read/delete
│       └── admin.js                # Analytics, user management
│
├── firebase-config/
│   ├── firebase.js                 # Client SDK config template
│   └── firestore.rules             # Security rules
│
├── .gitignore
└── README.md
```

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js ≥ 18
- A Firebase project (free Spark plan works)

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/contactvault-cms.git
cd contactvault-cms
```

---

### Step 2 — Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Create project**
2. Enable **Authentication** → Sign-in methods → Email/Password + Google
3. Create **Firestore Database** in production mode
4. Apply security rules from `firebase-config/firestore.rules`
5. Go to **Project Settings** → General → copy your **Web App config**

#### Update Frontend Config

Replace `YOUR_API_KEY`, `YOUR_PROJECT_ID` etc. in all four frontend files:
- `frontend/pages/login.html`
- `frontend/pages/register.html`
- `frontend/pages/user-dashboard.html`
- `frontend/pages/admin-dashboard.html`

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456:web:abc123"
};
```

---

### Step 3 — Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Get your **Firebase Admin Service Account**:
1. Firebase Console → Project Settings → **Service Accounts**
2. Click **Generate new private key** → download JSON
3. Save as `backend/config/serviceAccountKey.json`  
   *(this file is gitignored — never commit it)*

Or paste the JSON into `.env`:
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

Start the backend:
```bash
npm run dev      # development (nodemon)
npm start        # production
```

Backend runs at: `http://localhost:5000`

---

### Step 4 — Run the Frontend

The frontend is pure HTML/CSS/JS — no build step needed.

**Option A — Open directly:**
```
Open frontend/index.html in your browser
```

**Option B — Serve with a static server:**
```bash
npx serve frontend
# or
python -m http.server 3000 --directory frontend
```

---

## 🗃️ Firestore Data Schema

| Collection | Key Fields |
|---|---|
| `users` | uid, name, email, role, photoURL, createdAt |
| `contacts` | userId, name, phone, email, address, notes, groups[], photoURL, isFavorite, createdAt |
| `groups` | userId, name, createdAt |
| `favorites` | userId, contactId, createdAt |
| `activityLogs` | userId, action, details{}, timestamp, createdAt |

---

## 🔌 REST API Endpoints

> All protected routes require `Authorization: Bearer <idToken>` header.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create user profile |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update name/photo |
| GET | `/api/contacts` | List contacts (search, filter, sort) |
| POST | `/api/contacts` | Create (with duplicate detection) |
| PUT | `/api/contacts/:id` | Update contact |
| DELETE | `/api/contacts/:id` | Delete contact |
| POST | `/api/contacts/merge` | Merge duplicates |
| GET | `/api/contacts/export/csv` | Download CSV |
| POST | `/api/contacts/import/csv` | Bulk import |
| GET | `/api/groups` | List groups |
| POST | `/api/groups` | Create group |
| DELETE | `/api/groups/:id` | Delete group |
| GET | `/api/favorites` | List favorites |
| POST | `/api/favorites/:contactId` | Add to favorites |
| DELETE | `/api/favorites/:contactId` | Remove from favorites |
| GET | `/api/logs` | Activity logs |
| GET | `/api/admin/analytics` | System analytics (admin) |
| GET | `/api/admin/users` | All users (admin) |
| PUT | `/api/admin/users/:uid/role` | Change role (admin) |
| DELETE | `/api/admin/users/:uid` | Delete user (admin) |

---

## 🔒 Security

- Firebase ID tokens verified on every protected API call
- Role-based middleware (`requireAdmin`) on all admin routes
- Firestore security rules enforce per-user data isolation
- Helmet.js for HTTP header security
- Rate limiting: 100 requests / 15 min per IP
- Service account key is gitignored
- Environment variables for all secrets

---

## 🌐 Deployment

### Frontend → Firebase Hosting / Netlify / Vercel
```bash
# Firebase Hosting
firebase init hosting
# set public dir to: frontend
firebase deploy
```

### Backend → Railway / Render / Fly.io
```bash
# Set environment variables in dashboard:
# FIREBASE_SERVICE_ACCOUNT, FIREBASE_STORAGE_BUCKET, FRONTEND_URL, PORT
```

---

## 📸 Screenshots

> _Add screenshots of your deployed app here_

| Login | User Dashboard | Contact Card |
|---|---|---|
| ![login](screenshots/login.png) | ![dashboard](screenshots/dashboard.png) | ![card](screenshots/card.png) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JS, Firebase JS SDK v10 |
| Backend | Node.js, Express.js |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Security | Helmet, express-rate-limit, CORS |
| Deployment | Firebase Hosting + Railway/Render |

---

## 📄 License

MIT © 2024 ContactVault. Free to use and modify.
