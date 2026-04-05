# Clickart

A full-stack e-commerce web application built with **React** (frontend) and **Node.js/Express** (backend), backed by a **Neon PostgreSQL** database.

## Tech Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Frontend | React 19, React Router, Tailwind CSS, Vite      |
| Backend  | Node.js, Express 5, Arcjet (rate-limiting)      |
| Database | PostgreSQL via Neon serverless                  |

## Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)
- An [Arcjet](https://arcjet.com) API key (optional – used for rate-limiting)

## Environment Setup

Create a `.env` file in the project root (next to `package.json`) with the following variables:

```env
PORT=3000

# Neon PostgreSQL connection details
PGUSER=your_pg_user
PGPASSWORD=your_pg_password
PGHOST=your_pg_host
PGDATABASE=your_pg_database

# Arcjet (rate-limiting / security)
ARCJET_KEY=your_arcjet_key
ARCJET_ENV=development   # set to "production" in prod

# Set to "true" only on first run to initialize the database schema
INIT_DB=false
```

## Installation

Install dependencies for both the backend (root) and the frontend:

```bash
# Backend dependencies (from project root)
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

## Database Initialization

On the very first run, set `INIT_DB=true` in `.env` to create the database schema automatically. After the server starts successfully, set it back to `false` to skip initialization on subsequent runs.

## Running the Application

Open **two terminal windows** and run each command in its own window:

```bash
# Terminal 1 – Backend (runs on http://localhost:3000)
npm run dev

# Terminal 2 – Frontend (runs on http://localhost:5173)
cd frontend
npm run dev
```

The frontend dev server proxies all `/api` requests to the backend at `http://localhost:3000`, so no extra CORS configuration is needed during development.

Open your browser and navigate to **http://localhost:5173**.

## Available Scripts

### Backend (project root)

| Command       | Description                          |
|---------------|--------------------------------------|
| `npm run dev` | Start backend with hot-reload (nodemon) |

### Frontend (`frontend/` directory)

| Command           | Description                        |
|-------------------|------------------------------------|
| `npm run dev`     | Start Vite dev server              |
| `npm run build`   | Build for production               |
| `npm run preview` | Preview the production build       |
| `npm run lint`    | Run ESLint                         |

## API Routes

| Prefix            | Resource   |
|-------------------|------------|
| `/api/products`   | Products   |
| `/api/users`      | Users      |
| `/api/sellers`    | Sellers    |
| `/api/cart`       | Cart       |
| `/api/orders`     | Orders     |
| `/api/payments`   | Payments   |
| `/api/reviews`    | Reviews    |
| `/api/admin`      | Admin      |
