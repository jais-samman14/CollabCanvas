# CollabCanvas 

A real-time collaborative whiteboard I built to learn full-stack development beyond simple CRUD apps.

Think Miro or Excalidraw, but built from scratch to actually understand how real-time collaboration works.

---------------------------------------

## What it does

- Multiple users can draw on the same board at the same time
- You can see everyone's cursor moving in real-time
- Built-in chat while you work
- 11 drawing tools (pen, shapes, arrows, text, sticky notes, eraser)
- Auto-saves your work
- Export as PNG or PDF
- OTP-based password reset

----------------------------------------

## Repo Structure

This is a monorepo with two folders:
CollabCanvas/
├── frontend/     → React + Vite + Tailwind + Socket.io client
└── backend/      → Node.js + Express + MongoDB + Redis + Socket.io


Each folder has its own README with setup steps.

------------------------------------------------------

## Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, Socket.io client, HTML5 Canvas

**Backend:** Node.js, Express, MongoDB, Redis, Socket.io, JWT

**Why these?** MongoDB for flexible schemas (canvas strokes vary a lot). Redis for OTPs and rate limiting (fast + native TTL). Socket.io because raw WebSockets need way more code.

-------------------------------------------------------------

## Quick Start

You'll need Node.js 18+, MongoDB Atlas, Redis, and a Gmail App Password.

git clone https://github.com/YOUR_USERNAME/CollabCanvas.git
cd CollabCanvas

Backend:
cd backend 
npm install
cp .env.example .env    
npm run dev

Frontend:
cd frontend
npm install
cp .env.example .env
npm run dev


Why I built this
Honestly, got tired of building simple CRUD apps. Wanted something that would force me to deal with WebSockets, canvas rendering, multi-user syncing, and real production concerns like rate limiting and session management.
Took way longer than I expected. Ran into a lot of bugs. Learned a ton.

Contact
Built by Samman Jaiswal
Feel free to open an issue if you find bugs or want to chat about the code.

License
MIT