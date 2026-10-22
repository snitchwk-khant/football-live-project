# Football Stream Project

## Project Overview

Football Stream is a React + Vite admin-driven web app for managing football live content, match updates, media, banners, settings, and analytics.

## Completed Sprint Status

- ✅ Sprint 1 — Match Management
- ✅ Sprint 2 — Homepage Live Integration
- ✅ Sprint 3 — Banner Management
- ✅ Sprint 4 — Homepage Banner Display
- ✅ Sprint 5 — Stream Manager
- ✅ Sprint 5.5 — Stabilization
- ✅ Sprint 6 — Upcoming Matches + Countdown + Search
- ✅ Sprint 7 — League Pages + League Filter
- ✅ Sprint 8 — Media Library
- ✅ Sprint 9 — Settings CMS
- ✅ Sprint 10 — Analytics
- ✅ Sprint 11 — Authentication + Security

## Current Feature Scope

- Match management
- Live stream management
- Homepage banners
- Media library
- Upcoming matches and countdown UI
- League pages and filters
- Settings CMS
- Analytics dashboard
- Admin authentication flow

## Admin Access

Admin login URL: `/admin/login`.

Supabase email/password → trusted admin membership check → TOTP MFA → confirmed AAL2 → protected Admin Dashboard.

Admin access requires both trusted admin membership and a Supabase session at AAL2. A password-authenticated session alone cannot access the dashboard. Authenticator enrollment must be verified before access is granted; returning users complete an authenticator challenge. Logout uses Supabase Auth.

## Notes

- Supabase provides authentication, MFA, database access, and media storage.
- Matches, streams, and banners allow public reads; database RLS requires an authenticated admin with AAL2 for inserts, updates, and deletes.
- Website settings and viewer tracking remain browser-local features, separate from admin authentication.
