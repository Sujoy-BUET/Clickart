# Clickart

Clickart is a full-stack e-commerce web application with separate buyer, seller, and admin flows.
It uses a React + Vite frontend and an Express + PostgreSQL backend.

## Features

- Product listing and product details with stock awareness
- Buyer authentication, cart management, checkout, orders, and reviews
- Seller authentication, dashboard, profile management, product and coupon management
- Admin login, profile, seller verification, and seller moderation actions
- Coupon-aware checkout with backend-side validation
- Payment and order status workflows
- Seedable PostgreSQL schema with demo data

## Tech Stack

- Frontend: React 19, Vite, Tailwind CSS, React Router
- Backend: Node.js, Express, dotenv, CORS
- Database: PostgreSQL (Neon serverless client)
- Security/Protection: Arcjet, custom admin token auth

## Project Structure

```text
Clickart/
  backend/
    server.js
    config/
    controllers/
    db/
    lib/
    routes/
  frontend/
    src/
    vite.config.js
  package.json
```

## Prerequisites

- Node.js 18+ (recommended: latest LTS)
- npm 9+
- A PostgreSQL database (Neon is supported out of the box)

## Environment Variables

Create a `.env` file in the project root (`Clickart/.env`).

```env
# Server
PORT=3000
INIT_DB=false
NODE_ENV=development

# PostgreSQL (Neon)
PGHOST=your_host
PGDATABASE=your_database
PGUSER=your_user
PGPASSWORD=your_password

# Optional (Arcjet)
ARCJET_KEY=your_arcjet_key

# Optional (Admin defaults)
ADMIN_NAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PHONE=
ADMIN_PASSWORD=123456
ADMIN_TOKEN_SECRET=change_this_secret
```

Notes:

- Frontend dev proxy is configured for `http://localhost:3000`, so keep `PORT=3000` for local development unless you update `frontend/vite.config.js`.
- Set `INIT_DB=true` only when you want to create schema and seed data on startup.

## Installation

Install dependencies for root and frontend:

```bash
npm install
cd frontend
npm install
cd ..
```

## Running the App (Development)

Run backend (from project root):

```bash
npm run dev
```

Run frontend (from `frontend` directory in a second terminal):

```bash
npm run dev
```

Then open:

- Frontend: http://localhost:5173
- Backend API base: http://localhost:3000/api

## Database Initialization and Seed

To initialize schema and seed demo data:

1. Set `INIT_DB=true` in `.env`
2. Start backend once
3. After successful initialization, set `INIT_DB=false` for normal runs

This prevents reseeding on every restart.

## API Modules

The backend exposes these route groups:

- `/api/products`
- `/api/users`
- `/api/sellers`
- `/api/cart`
- `/api/orders`
- `/api/payments`
- `/api/reviews`
- `/api/admin`

## NPM Scripts

Root (`Clickart/package.json`):

- `npm run dev` -> starts backend via nodemon (`backend/server.js`)

Frontend (`Clickart/frontend/package.json`):

- `npm run dev` -> start Vite dev server
- `npm run build` -> production build
- `npm run preview` -> preview production build
- `npm run lint` -> run ESLint

## Troubleshooting

- If frontend API calls fail in dev, confirm backend is running and `PORT` matches Vite proxy target.
- If database connection fails, verify `PGHOST`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD`.
- If admin login/token issues occur, verify `ADMIN_*` variables and keep `ADMIN_TOKEN_SECRET` stable.

## License

ISC
