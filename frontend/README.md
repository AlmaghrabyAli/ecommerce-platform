# Bazaaro Frontend

The storefront, customer account portal, and admin management dashboard for **Bazaaro**, built as a standalone Vite + React application that connects to the Bazaaro ASP.NET Core Web API.

## Tech stack

- **React 19** + **Vite 8** (JavaScript, ES modules)
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **React Router** (`react-router-dom`)
- **TanStack React Query** for server state
- **React Hook Form** for form state & validation
- **Axios** with Bearer JWT auth and centralized error handling
- **Lucide React** icons, **React Hot Toast** notifications, **Recharts** dashboard chart
- **Vitest**, **React Testing Library**, **MSW**, and **vitest-axe** for automated testing

## Running locally

```bash
npm install
cp .env.example .env
npm run dev
```

The dev server starts on **`http://localhost:5173`** (`strictPort: true`).

## Connecting to the real backend

1. Start the Bazaaro ASP.NET Core backend API (default dev URL: `http://localhost:5062`).
2. Set `VITE_API_URL` in `.env`:
   ```env
   VITE_API_URL=http://localhost:5062/api
   ```
3. Ensure the backend CORS configuration allows origin `http://localhost:5173`.

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server on `http://localhost:5173` |
| `npm run build` | Build production bundle into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the project |
| `npm test` | Run the full Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run Vitest with v8 code coverage report |

## Folder structure

```
public/
  favicon.svg
src/
  api/            Axios client & endpoint modules (auth, catalog, cart, orders, admin)
  components/     Reusable UI primitives, layout, product, cart, orders, and admin components
  config/         Shared configuration constants (shipping hint thresholds)
  context/        AuthContext session provider
  hooks/          React Query hooks and debounce hook
  pages/          Route pages (storefront, account, cart, admin, Forbidden, NotFound)
  routes/         Route guards (ProtectedRoute, AdminRoute) and router table
  test/           Vitest setup, MSW server/handlers, factories, provider helper, integration flows
  utils/          Pure helpers (money, dates, errors, messages, orderStatus, storage, format)
  App.jsx
  index.css
  main.jsx
```

## Routes

| Route | Access | Page |
|---|---|---|
| `/` | Public | Home |
| `/shop` | Public | Product catalog with URL-synced filters & sorting |
| `/products/:slug` | Public | Product details & related items |
| `/login` | Guest | Sign in |
| `/register` | Guest | Create account |
| `/cart` | Signed in | Shopping cart |
| `/checkout` | Signed in | Checkout (shipping details & payment method) |
| `/order-confirmation/:id` | Signed in | Order confirmation |
| `/orders` | Signed in | My orders |
| `/orders/:id` | Signed in | Order details & cancellation |
| `/admin` | Admin | Dashboard stats, chart, top products & low stock |
| `/admin/products` | Admin | Product catalog table |
| `/admin/products/new` | Admin | Create product |
| `/admin/products/:id/edit` | Admin | Edit product |
| `/admin/categories` | Admin | Categories management |
| `/admin/orders` | Admin | Orders list with status tabs |
| `/admin/orders/:id` | Admin | Admin order details & status transitions |
| `/forbidden` | Public | Access denied (403) |
| `*` | Public | Page not found (404) |

## Running tests and coverage

```bash
npm test
npm run test:coverage
```
