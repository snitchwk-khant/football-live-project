# Football Stream

## Project Overview

Football Stream is a React + Vite web app for managing football live content, matches, banners, media, settings, and analytics.

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Deployment Notes

This project is ready for static hosting on Vercel or Netlify.

### Recommended deployment targets

- Vercel: use the included [vercel.json](vercel.json)
- Netlify: use the included [public/_redirects](public/_redirects)

### Deploy steps

1. Push the project to GitHub.
2. Import the repository in Vercel or Netlify.
3. Set the build command to:

```bash
npm run build
```

4. Set the output directory to:

```bash
dist
```

## Route Handling

The app uses client-side routing for these routes:

- /
- /admin/login
- /dashboard
- /dashboard/media
- /dashboard/settings
- /dashboard/analytics

SPA fallback is included so refreshes work correctly on hosting platforms.

## Admin Login

Admin login URL: `/admin/login`.

Admin access uses this flow:

Supabase email/password → trusted admin membership check → TOTP MFA → confirmed AAL2 → protected Admin Dashboard.

Only authorized admin accounts may access the dashboard. Password authentication alone does not grant admin access. New authenticator setup must be verified before access is granted; returning users complete an authenticator challenge.

Protected routes recheck the Supabase session, admin membership, and AAL2. Logout signs out through Supabase Auth.

## Authentication and Data Note

Supabase manages authentication and MFA. Database RLS permits public reads of matches, streams, and banners; inserts, updates, and deletes require an authenticated admin with AAL2.

Website settings and viewer tracking still use browser-local storage. They are separate from admin authentication.
