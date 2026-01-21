# MTG Desktop Companion — Web Hosting (GitHub Pages + Supabase Auth)

This project was originally packaged as a *desktop* companion with a bundled web UI that expects a local REST server.
This repo now includes a ready-to-host static site under `/docs` (for GitHub Pages), with optional Supabase Auth.

## 1) What you host where

- **GitHub Pages**: `/docs` folder (static HTML/CSS/JS)
- **Backend REST server**: run the existing Java server somewhere reachable (Docker)
- **Auth (optional but recommended)**: Supabase Email/Password auth

> Note: Auth in this version gates UI access (front-end). The backend is not yet multi-tenant;
> if you expose the backend publicly, all users share the same backend datastore.

## 2) Enable GitHub Pages

1. Push this repo to GitHub.
2. In GitHub: **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: `main` (or your default), Folder: `/docs`
5. Save. Your site will appear at:
   - Project site: `https://<username>.github.io/<repo>/`
   - User site: `https://<username>.github.io/` (if you use a special repo name)

## 3) Configure `/docs/config.js`

Open: `docs/config.js`

Set:
- `BASE_PATH`
  - If using a *project* site: `'/<repo>'` (example: `'/MtgDesktopCompanion'`)
  - If using a user site: `''`
- `REST_SERVER` to your deployed backend URL (no trailing slash)
- Supabase:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

## 4) Supabase setup (Auth)

1. Create a project in Supabase.
2. Authentication → Providers → **Email** enabled.
3. Add redirect URLs (Authentication → URL Configuration):
   - `https://<username>.github.io/<repo>/auth/update-password.html`
   - (and optionally) `https://<username>.github.io/<repo>/auth/login.html`

Then copy **Project URL** and **anon public key** into `docs/config.js`.

## 5) Run / Deploy the backend REST server

### Run locally
```bash
docker build -t mtgdc .
docker run -p 8080:8080 mtgdc
```
Then in `docs/config.js`: `REST_SERVER: 'http://localhost:8080'`

### Deploy (Render/Fly/other)
Deploy the Docker container. Then set `REST_SERVER` to the public URL.

### CORS
The backend already has a setting for `Access-Control-Allow-Origin` (default `*`) in `JSONHttpServer`.
If you lock it down, set it to your GitHub Pages origin.

## 6) Where the pages are

- Main entry: `docs/index.html`
- Auth pages:
  - `docs/auth/login.html`
  - `docs/auth/register.html`
  - `docs/auth/reset.html`
  - `docs/auth/update-password.html`
- Module UIs:
  - `docs/web-ui/`
  - `docs/collection-ui/`
  - `docs/prices-ui/`
  - `docs/trades-ui/`
  - `docs/shop-ui/`
  - `docs/admin-ui/`

## 7) Next upgrade (if you want real per-user data)
To properly isolate user data:
- Require `Authorization: Bearer <supabase_jwt>` on backend endpoints
- Verify JWT using Supabase JWKS
- Add `user_id` scoping to persisted entities
