# CollabCanvas — Backend

The Node.js + Express backend for CollabCanvas. Handles authentication, real-time collaboration, chat, and everything that isn't the UI.

If you're looking for the frontend, it's in the `/frontend` folder.

---

## What this handles

- REST API for auth, boards, and chat
- Socket.io server for real-time drawing sync, cursors, chat, and presence
- JWT authentication with proper logout support
- OTP-based password reset via email
- Rate limiting on both API and WebSocket events
- MongoDB for persistent data, Redis for OTPs and rate limit counters

---

## Tech Stack

- Node.js 18+
- Express
- MongoDB (via Mongoose)
- Redis
- Socket.io
- JWT for auth
- bcrypt for password hashing
- Nodemailer (Gmail SMTP) for OTP emails

---

## Project Structure

I organized this by concern — each folder has a specific job:

- `config/` — Database and Redis connections
- `controllers/` — Business logic (auth, board, chat)
- `middleware/` — Auth check, validation, rate limiting
- `models/` — Mongoose schemas
- `rateLimiter/` — Sliding window algorithm + configs
- `routes/` — REST API endpoints
- `services/` — Email service
- `sockets/` — Socket.io event handlers
- `utils/` — OTP generator, JWT helpers
- `validators/` — Input validation rules
- `server.js` — Entry point

Keeping things separated made debugging way easier when stuff broke (and it broke a lot).

---

## Getting Started

### You'll need

- Node.js 18+ and npm
- MongoDB Atlas account (free tier works) — https://cloud.mongodb.com
- Redis running locally (or Upstash / Redis Cloud)
- Gmail account with App Password enabled — for OTP emails

### Setup

1. Install dependencies:

   `npm install`

2. Copy the env file:

   `cp .env.example .env`

3. Fill in your `.env` with real values:
   - `MONGO_URI` — MongoDB Atlas connection string
   - `JWT_SECRET` — any random string, minimum 32 characters
   - `EMAIL_USER` and `EMAIL_PASS` — Gmail credentials (use App Password, not your regular password)
   - `REDIS_URL` — usually `redis://localhost:6379` for local

4. Start Redis (macOS):

   `brew services start redis`

   Verify with `redis-cli ping` — should return PONG.

5. Run the dev server:

   `npm run dev`

If everything's working you'll see the server running on port 8000, MongoDB connected, Redis connected, and Socket.io ready.

---

## API Endpoints

### Auth
- `POST /api/auth/signup` — Register
- `POST /api/auth/login` — Login and get JWT
- `POST /api/auth/logout` — Invalidate current session
- `POST /api/auth/forgot-password` — Request OTP
- `POST /api/auth/reset-password` — Reset password with OTP

### Boards
- `GET /api/boards` — List user's boards
- `POST /api/boards` — Create board
- `GET /api/boards/:id` — Get board (auto-joins as collaborator)
- `PUT /api/boards/:id` — Update board
- `DELETE /api/boards/:id` — Delete board
- `DELETE /api/boards/:id/leave` — Leave a shared board
- `DELETE /api/boards/:id/end-session` — Owner ends session for all

### Chat
- `GET /api/chats/:boardId` — Fetch chat history

### Socket Events
- `board:join`, `board:leave`
- `stroke:add`, `stroke:update`, `stroke:delete`
- `cursor:move`
- `chat:send`, `chat:typing:start`, `chat:typing:stop`
- `session:end`

---

## Some Things I Learned Building This

### Custom Sliding Window Rate Limiter

I could've used `express-rate-limit` and been done in 5 minutes. But I wanted to actually understand rate limiting, so I built my own using Redis sorted sets.

The algorithm:
- Each request adds an entry (timestamp as score)
- Before adding, remove entries older than the window
- If count exceeds limit, reject
- Otherwise, add and let through
- Set an expiry so keys don't linger forever

This gives accurate sliding window behavior — no boundary burst problem you'd get with fixed windows.

Applied to login, signup, forgot password, reset password, board updates, and socket events. Different limits for different endpoints. Socket abuse gets an extra layer — 3 violations and the socket auto-disconnects.

### tokenVersion Pattern for Logout

JWT is stateless. Great for scaling, terrible for logout — because there's no way to invalidate a token server-side.

Solution: each user has a `tokenVersion` counter in MongoDB. The JWT embeds this at issue time. On every protected request, I verify the token's version matches the current DB version.

- Logout → increment version → all old tokens invalid
- Password reset → increment version → same effect
- Stolen token? User just clicks logout, done.

Costs one DB read per protected request. Worth it.

### OTP Security Layers

Password reset flow has 6 layers of protection:

1. API rate limit (IP-based) — 5 requests / 15 min
2. Per-email cooldown — 1 OTP / 60 seconds
3. OTP hashed with SHA-256 before Redis storage
4. TTL expiry — auto-deleted after 5 minutes
5. Wrong attempts capped — 5 tries then blocked
6. Successful reset increments tokenVersion — kills old sessions

Each layer targets a different attack vector — brute force, spam, replay, session persistence.

### Why Redis for OTPs

- Native TTL — set expiry, forget about cleanup
- MongoDB would need TTL indexes or cron jobs (more moving parts)
- In-memory read/write is way faster
- OTPs are throwaway data, they don't need to survive server restarts

------------------------------------------------------------------

## Deployment Plan

Planning to deploy on Render (or Railway). Env variables to set in the deployment dashboard:

- Same as `.env.example`, but production values
- `MONGO_URI` → production cluster
- `REDIS_URL` → Upstash or similar cloud Redis
- `NODE_ENV=production`

Frontend will point at the deployed backend URL.

-------------------------------------------------------


## Contact

Built by **Samman Jaiswal**
Open to bug reports, suggestions, or just chatting about the code.

---------------------------------------------------------------

## License

MIT
