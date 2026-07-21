# CollabCanvas — Frontend

The React frontend for CollabCanvas — a real-time collaborative whiteboard I built to learn full-stack development beyond simple CRUD apps.

You draw, your friends draw, and everyone sees it live. Like Miro or Excalidraw, but built from scratch to figure out how it actually works under the hood.

--------------------------------------------

## Why I built this

Honestly, I got tired of building normal CRUD apps.

I wanted something that would force me to deal with things like WebSocket connections, real-time state syncing, canvas rendering, and multi-user coordination. Miro and Figma always felt like magic to me — how do they keep everything in sync? How do cursors move so smoothly? How does infinite canvas even work?

So I decided to just build my own version and figure it out along the way. This project ended up taking way more time than I expected, but I learned a ton.

-----------------------------------------------

## What it does

- **Real-time drawing** — multiple users on the same board, drawing at the same time, seeing each other's strokes appear instantly
- **11 drawing tools** — pen, line, arrow, rectangle, circle, triangle, star, text, sticky notes, and eraser
- **Live cursors** — see exactly where teammates are working, with their name floating next to their cursor
- **Built-in chat** — no need to switch to another app, chat directly on the board
- **Presence tracking** — see who's currently online in the top-right avatars
- **Infinite canvas** — starts at 4000x2500, auto-extends when you draw near edges
- **Export options** — download your board as PNG or PDF
- **Copy, paste, move, delete** — standard editing you'd expect
- **Undo / Redo** — with Cmd+Z / Cmd+Shift+Z
- **Auto-save** — every 3 seconds after the last change (silently, no annoying popups)

----------------------------------------------------------

## Tech Stack

- **React 18** with Vite (Vite is genuinely amazing after CRA)
- **Tailwind CSS** for styling
- **Socket.io Client** for real-time features
- **Axios** for API calls (with global interceptors for auth + rate limit handling)
- **React Router v6** for navigation
- **jsPDF** for PDF exports
- **HTML5 Canvas API** for drawing (pure canvas, no external libraries like fabric.js — wanted to understand it deeply)

------------------------------------------------------------

## Project Structure

I spent time thinking about how to organize this because I hate debugging messy projects:

src/
├── components/
│   ├── canvas/           → Canvas-related UI (toolbar, cursors, color picker)
│   └── chat/             → Chat panel components
├── context/              → Global state (AuthContext, SocketContext)
├── hooks/                → Custom hooks (useCanvas, useCollab, useChat, usePresence)
├── pages/                → Route-level pages
├── services/             → API layer (axios calls + interceptors)
├── utils/                → Helpers (drawing math, throttle, constants)
├── App.jsx               → Route setup + global providers
├── main.jsx              → Entry point
└── index.css             → Tailwind + custom animations


The rule I followed: **each folder has one job**.
Made debugging way easier when things went wrong (and they did, a lot).

---------------------------------------------------------------

## Getting Started

### Prerequisites

Before running the frontend, you'll need:
- **Node.js 18+** and npm
- The **backend** running on port 8000 (see backend folder)
- **Redis** running (backend needs it for rate limiting and OTPs)
- **MongoDB Atlas** account (backend needs it)

### Setup

1. Clone the repo:
   bash
   git clone https://github.com/YOUR_USERNAME/CollabCanvas.git
   cd CollabCanvas/frontend
   

2. Install dependencies:
   bash
   npm install

3. Set up your environment file:
   bash
   cp .env.example .env

   The defaults should work for local development:
   env
   VITE_API_URL=http://localhost:8000/api
   VITE_SOCKET_URL=http://localhost:8000
   

4. Start the dev server:
   bash
   npm run dev
   

   The app will run on \`http://localhost:5173\`.

Make sure the backend is also running on port 8000 before you try to log in.

---------------------------

## Available Scripts

- npm run dev — Start Vite dev server
- npm run build — Build for production (outputs to \`dist/\`)
- npm run preview — Preview the production build locally

-------------------------------------------

## Stuff I Learned (The Hard Way)

### Real-time sync sounds simple until it isn't

My first attempt: "just emit socket events on both sides, easy." Nope.

With multiple users drawing at once, I had to think about:
- **Throttled cursor events** — 60fps mousemove floods the network. I throttle to 50ms (about 20fps) and it feels smooth enough.
- **Debounced auto-save** — saving to MongoDB on every stroke would kill the server. I save 3 seconds after the last change.
- **Optimistic updates** — showing your own drawings instantly instead of waiting for server confirmation.

I also had to figure out how to prevent race conditions when the board data loads while sockets are already syncing changes. That one took a while to get right.

### Canvas coordinates are confusing

The canvas is a fixed 4000x2500 pixel grid internally, but it displays at whatever size fits the screen. So a click at "screen x: 500" isn't the same as "canvas x: 500". You have to convert.

This got even more painful when I added an inline text input — the input HTML element needed to sit exactly where the canvas would render the text later. Getting fonts, line-heights, and positioning to match pixel-perfect took me an entire afternoon.

### Session management with JWT is trickier than tutorials suggest

Tutorials say "JWT is stateless, just verify the signature." But then what happens on logout? The token is still valid. What if someone steals it?

I implemented a **tokenVersion pattern** — each user has a version counter stored in MongoDB. The JWT embeds this version at issue time. On logout or password reset, I increment the version, which instantly invalidates all previously issued tokens for that user.

It's elegant but I broke it a few times figuring out the right way to check it.

------------------------------------------------------------

## Known Issues / TODO

- Mobile touch support is basic (would need proper touch event handling)
- No dark/light mode toggle yet
- Chat doesn't support markdown or file attachments
- No board version history / undo across sessions
- Could definitely use a proper design system

I'll get to these when I have time.

---------------------------------------------------------------

## Contact

Built by **Samman Jaiswal**

If you spot a bug, want to talk about the code, or have suggestions — feel free to open an issue or reach out.

-------------------------------------------------------------

## License

MIT — use it, learn from it, fork it, whatever helps you.