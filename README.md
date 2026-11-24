# 🎨 CollabCanvas — Real-Time Collaborative Infinite Whiteboard

**CollabCanvas** is a full-stack, real-time collaborative whiteboard built with **React 19**, **Excalidraw**, **Node.js**, **Express**, **MongoDB**, **Socket.IO**, and **Redis**. Multiple users can draw, edit, move, group, erase, export, and chat together on an infinite canvas with low latency and conflict-free synchronization.

---

## ✨ Key Features

- **Infinite Vector Whiteboard (`@excalidraw/excalidraw`)**: Full suite of shapes, arrows, freehand drawing, text, copy/paste, grouping, snapping, undo/redo, dark/light theme, and high-resolution **PNG / PDF export**.
- **Conflict-Free Real-Time Sync (CRDT LWW)**: Deterministic per-element `(version, versionNonce)` reconciliation guarantees identical board state across all collaborators with zero echo loops.
- **Zero-Lag Multi-User Performance**:
  - **60fps `requestAnimationFrame` Cursor Coalescing** batches incoming remote cursors into at most one repaint per frame.
  - **100ms Delta Batching & 400 KB Chunking** with Socket.IO acknowledgments and automatic retry backoff.
  - **`React.memo` Render Isolation** prevents live drawing from re-rendering the chat sidebar or presence bar.
- **Live Presence & Team Chat**: Real-time online user avatars, join/leave notifications, persistent board chat history, emoji quick-picker, and per-user typing indicators.
- **Role-Based Session Controls**: Share-by-link toggle, owner-only board clear and session termination (auto-removes collaborators and clears chat history), plus collaborator leave-board flow.
- **Production-Grade Auth & Security**:
  - JWT authentication with **`tokenVersion`** instant session revocation on logout and password reset.
  - **HTTPS OTP Password Reset (Brevo REST API)**: Works on cloud free tiers (like Render) that block outbound SMTP ports (`25/465/587`), with a local terminal OTP fallback for development.
  - **Constant-Time OTP Verification** (`crypto.timingSafeEqual`) with SHA-256 hashing, 5-minute TTL, 30-second cooldown, and 5-attempt lockout.
  - **Atomic Redis Lua Sliding-Window Rate Limiter** across HTTP routes and WebSocket events, with automatic in-memory fallback for local development.
- **Modular Component-Folder CSS (Zero Tailwind)**: Every component and page lives in its own dedicated `ComponentName/ComponentName.jsx` + `ComponentName/ComponentName.css` folder powered by shared CSS custom properties (`src/styles/variables.css`).

## 🏗️ System Architecture

| Layer | Technology & Pattern | Purpose |
| :--- | :--- | :--- |
| **Frontend Canvas** | React 19, Vite, `@excalidraw/excalidraw`, `jsPDF` | Infinite vector canvas, 60fps cursor coalescing, PNG/PDF export |
| **Styling** | Modular Vanilla CSS + CSS Variables | Clean per-component stylesheets with zero utility-class clutter |
| **Real-Time Sync** | Socket.IO + CRDT LWW (`version`, `versionNonce`) | Conflict-free delta sync, live cursors, presence, and board chat |
| **Persistence Cache** | Write-Behind `SceneStore` (`debounce` + `maxWait`) | Authoritative in-memory scene merging with batched MongoDB snapshots |
| **Database** | MongoDB + Mongoose | Persistent storage for users, boards (`elements` + `appState`), and chat |
| **Rate Limiting & OTP** | Redis (Atomic Lua ZSET) + In-Memory Fallback | Race-free sliding-window rate limits and TTL-backed OTP storage |
| **Transactional Email** | Brevo HTTPS REST API (Port 443) | Reliable OTP delivery on Render free tier + local console fallback |

> For detailed system-design explanations and interview talking points, see `INTERVIEW_ARCHITECTURE.md`.

## 📁 Project Structure

```text
CollabCanvas/
├── README.md
├── INTERVIEW_ARCHITECTURE.md
├── backend/
│   ├── config/                # MongoDB & Redis connection setup
│   ├── controllers/           # Auth, Board, and Chat REST handlers
│   ├── middleware/            # JWT protect, validation, HTTP & Socket rate limiters
│   ├── models/                # User, Board (Excalidraw elements/appState), Chat schemas
│   ├── rateLimiter/           # Atomic Redis Lua sliding-window limiter & thresholds
│   ├── routes/                # /api/auth, /api/boards, /api/chats
│   ├── services/              # Write-behind sceneStore, cacheStore, Brevo emailService
│   ├── sockets/               # Socket.IO auth, boardHandlers, chatHandlers
│   ├── test/                  # 27 built-in Node.js unit tests (node --test)
│   ├── utils/                 # CRDT sceneMerge, payload sceneValidation, JWT, OTP
│   ├── validators/            # express-validator request rules
│   ├── .env.example
│   └── server.js
└── frontend/
    ├── public/
    └── src/
        ├── components/        # Dedicated ComponentName/ folders (.jsx + .css)
        │   ├── ChatPanel/
        │   ├── ExcalidrawBoard/
        │   ├── NavBar/
        │   ├── PresenceBar/
        │   └── PrivateRoute/
        ├── context/           # AuthContext & SocketContext
        ├── hooks/             # useCollab, useChat, usePresence
        ├── pages/             # Dedicated PageName/ folders (.jsx + .css)
        │   ├── BoardPage/
        │   ├── Dashboard/
        │   ├── ForgotPasswordPage/
        │   ├── LandingPage/
        │   ├── LoginPage/
        │   ├── ResetPasswordPage/
        │   └── SignupPage/
        ├── services/          # Axios instance & REST API modules
        ├── styles/            # Global CSS variables (variables.css)
        └── utils/             # Constants & cancelable throttle helper
```

## 🔌 API & WebSocket Reference

### REST Endpoints

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Server readiness and Redis/fallback status |
| `POST` | `/api/auth/signup` | Public | Register a new user and return JWT |
| `POST` | `/api/auth/login` | Public | Authenticate user and return JWT |
| `POST` | `/api/auth/forgot-password` | Public | Send 6-digit password reset OTP via Brevo HTTPS API |
| `POST` | `/api/auth/reset-password` | Public | Verify OTP (constant-time) and reset password |
| `POST` | `/api/auth/logout` | Bearer JWT | Increment `tokenVersion` to revoke all active sessions |
| `GET` | `/api/boards` | Bearer JWT | List owned and shared boards |
| `POST` | `/api/boards` | Bearer JWT | Create a new whiteboard |
| `GET` | `/api/boards/:id` | Bearer JWT | Fetch board metadata and live scene elements |
| `PUT` | `/api/boards/:id` | Bearer JWT | Save board name, `appState`, and CRDT-merged elements |
| `DELETE` | `/api/boards/:id` | Owner | Delete board, evict scene cache, and remove chat history |
| `PATCH` | `/api/boards/:id/share` | Owner | Toggle public share-by-link access |
| `DELETE` | `/api/boards/:id/leave` | Collaborator | Leave a shared board |
| `DELETE` | `/api/boards/:id/end-session` | Owner | Remove collaborators, disable sharing, and clear chat |
| `GET` | `/api/chats/:boardId` | Bearer JWT | Retrieve chronological chat history |

### Socket.IO Events

| Direction | Event | Purpose |
| :--- | :--- | :--- |
| Client → Server | `board:join`, `board:leave` | Join/leave board room and receive initial `scene:sync` |
| Client ↔ Server | `scene:update` / `scene:updated` | Batched, chunked CRDT element deltas with ack callback |
| Client ↔ Server | `cursor:move` / `cursor:moved` | Throttled collaborator pointer coordinates |
| Client ↔ Server | `board:clear` / `board:cleared` | Owner-only canvas reset across all peers |
| Client ↔ Server | `session:end` / `session:ended` | Owner-only session termination broadcast |
| Client ↔ Server | `chat:send` / `chat:message` | Persistent real-time room chat messages |
| Client ↔ Server | `chat:typing:start`, `chat:typing:stop` / `chat:typing` | Live per-user typing indicators |

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js** 18+
- **MongoDB** (local instance or MongoDB Atlas cluster)
- **Redis** *(optional locally — automatically falls back to an in-memory TTL store in development)*

### 1. Clone the Repository
```bash
git clone https://github.com/jais-samman14/collabcanvas.git
cd collabcanvas
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
```

Configure `backend/.env`:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `PORT` | No | Server port (default `8000`) |
| `NODE_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | Yes | Allowed CORS origin (e.g. `http://localhost:5173`) |
| `MONGO_URL` | Yes | MongoDB connection URI |
| `JWT_SECRET` | Yes | Random secret key (32+ characters) |
| `REDIS_URL` | Prod | Redis URL (optional in dev; falls back to memory) |
| `BREVO_API_KEY` | Prod | Brevo API key (`Transactional email: All`). Leave blank in dev to log OTPs in terminal |
| `EMAIL_FROM` | Prod | Verified sender email in Brevo |
| `EMAIL_FROM_NAME` | No | Display name (default `CollabCanvas Team`) |

Run tests and start the backend:
```bash
npm test      # Runs 27 unit tests (CRDT merge, validation, sceneStore, emailService)
npm run dev   # Starts backend at http://localhost:8000
```

### 3. Frontend Setup
```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev   # Starts frontend at http://localhost:5173
```

Configure `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000/api
VITE_SOCKET_URL=http://localhost:8000
```

## ☁️ Deploying on Render (Free Tier)

1. **Backend Web Service**: Set root directory to `backend`, build command `npm install`, start command `npm start`.
2. Add all production environment variables (`MONGO_URL`, `JWT_SECRET`, `FRONTEND_URL`, `REDIS_URL`, `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `NODE_ENV=production`).
3. **Frontend Static Site**: Set root directory to `frontend`, build command `npm install && npm run build`, publish directory `dist`, and set `VITE_API_URL` and `VITE_SOCKET_URL` to your deployed backend URL.

## 🧪 Testing

The backend ships with a zero-dependency Node.js test suite (`node --test`) covering:
- CRDT merge commutativity, tie-breaking, and tombstone handling (`test/sceneMerge.test.js`)
- Payload sanitization, size limits, and MongoDB/prototype-pollution protection (`test/sceneValidation.test.js`)
- Debounced write-behind persistence, retry on DB failure, and tombstone pruning (`test/sceneStore.test.js`)
- Brevo HTTPS API request formatting and secret-safe error handling (`test/emailService.test.js`)

## 👤 Author

**Samman Jaiswal** — [GitHub (@jais-samman14)](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fjais-samman14)
