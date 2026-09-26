# Skin Diary

Log how your skin is doing each day with a 1–5 star rating (red for bad, green for great), add notes, see every day coloured on a calendar, and track the trend on a graph.

## Features

- Email + 4-digit passcode accounts (passcodes are hashed with bcrypt, never stored in plain text)
- Log in / log out, with sessions kept in a secure httpOnly cookie for 7 days
- Daily star rating with colour scale from red (1) to green (5)
- Notes for each day
- Calendar view coloured by rating, tap any day to view or edit it
- Graph of ratings over the last 7, 30 or 90 days with averages
- Rate limiting on login to stop passcode guessing

## Tech stack

- **Back end:** Node.js, Express, SQLite (better-sqlite3), bcryptjs, JSON Web Tokens
- **Front end:** Plain HTML, CSS and JavaScript (no build step), in `public/index.html`

## Getting started

You need [Node.js](https://nodejs.org) 18.11 or newer.

```bash
git clone <your-repo-url>
cd skin-diary
npm install
cp .env.example .env      # then set JWT_SECRET to a long random string
npm start
```

Open http://localhost:3000.

Use `npm run dev` instead of `npm start` to restart the server automatically when you change a file.

The database is created automatically at `data/skin-diary.db` the first time the server starts. It's ignored by Git so nobody's diary gets uploaded.

## Project structure

```
skin-diary/
├── server.js            Starts Express, serves the API and the front end
├── db.js                Opens the SQLite database and creates the tables
├── middleware/
│   └── auth.js          Session cookie helpers and the requireAuth check
├── routes/
│   ├── auth.js          Check email, register, log in, log out, current user
│   └── entries.js       Read and save daily ratings and notes
├── public/
│   └── index.html       The whole front end
├── .env.example         Settings template
└── package.json
```

## API

All routes return JSON. Routes marked 🔒 need you to be logged in (the session cookie is sent automatically by the browser).

| Method | Route | Body | What it does |
|---|---|---|---|
| POST | `/api/auth/check-email` | `{ email }` | Returns `{ exists }` so the app knows whether to log in or sign up |
| POST | `/api/auth/register` | `{ email, passcode }` | Creates an account and logs in |
| POST | `/api/auth/login` | `{ email, passcode }` | Logs in |
| POST | `/api/auth/logout` | | Logs out |
| GET 🔒 | `/api/auth/me` | | Returns the logged-in user |
| GET 🔒 | `/api/entries` | | All your entries, as `{ entries: { "2026-09-26": { rating, note } } }` |
| GET 🔒 | `/api/entries?from=YYYY-MM-DD&to=YYYY-MM-DD` | | Entries in a date range |
| PUT 🔒 | `/api/entries/:date` | `{ rating?, note? }` | Saves a day. Leave a field out to keep it. `rating: null` clears the stars |
| DELETE 🔒 | `/api/entries/:date` | | Deletes a day |

## Database

**users**: `id`, `email` (unique), `passcode_hash`, `created_at`

**entries**: `user_id`, `date` (YYYY-MM-DD), `rating` (1–5 or empty), `note`, `updated_at`. One row per user per day.

## Deploying

Any host that runs Node.js with a persistent disk works (Render, Railway, Fly.io, a VPS). Set these environment variables on the host:

- `JWT_SECRET` to a long random string
- `NODE_ENV=production` (makes the cookie HTTPS-only, so the site must be served over HTTPS)
- `DB_PATH` to a location on the persistent disk, if the host needs one

## Ideas for next steps

- Swap the 4-digit passcode for a full password, or add "forgot passcode" with an email reset link
- Tag days with products used, food or sleep, and look for patterns in the graph
- Photo uploads to track changes visually
