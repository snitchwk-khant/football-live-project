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

- Admin login URL: /admin/login
- Default username: admin
- Default password: admin123

## Authentication and Data Note

Current authentication is frontend-only and uses localStorage/sessionStorage for development and testing purposes.

This means:

- the app can run as a frontend-only demo locally
- admin access is not production-safe without a real backend
- production database, auth, and persistence should be added later

## Limitation

This frontend-only setup is suitable for local development and simple static hosting, but it is not a full production backend solution yet.
