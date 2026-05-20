# Task 2 - Backend API Routes

## Summary
Created all API routes for the MoodLog mood diary application.

## Files Created

### Auth Helper Library
- `/src/lib/auth.ts` - Password hashing (SHA-256 + salt), verification, cookie management, and `getAuthUser()` helper

### Auth Routes
- `/src/app/api/auth/register/route.ts` - POST: User registration with validation (username ≥3 chars, password ≥6 chars, unique username), password hashing, and auth cookie setting
- `/src/app/api/auth/login/route.ts` - POST: User login with password verification and auth cookie setting
- `/src/app/api/auth/me/route.ts` - GET: Get current authenticated user from cookie
- `/src/app/api/auth/logout/route.ts` - POST: Clear auth cookie

### Entries Routes
- `/src/app/api/entries/route.ts` - GET: List all entries for authenticated user (ordered by date desc); POST: Create new entry with validation (date format, moodScore 1-10, no duplicate date)
- `/src/app/api/entries/[id]/route.ts` - GET: Single entry (ownership check); PUT: Update entry (ownership check, duplicate date check); DELETE: Delete entry (ownership check)
- `/src/app/api/entries/stats/route.ts` - GET: Aggregated stats (totalEntries, avgMood, bestDay, worstDay, currentStreak, moodDistribution)

## Key Design Decisions
- All error messages in Russian (matching the app's locale based on moodLabel values)
- Auth via HttpOnly cookie `moodlog_user_id` (30-day max age)
- Password hashing uses Web Crypto API (SHA-256 with UUID salt)
- All routes enforce ownership: entries can only be accessed/modified by their owner
- Stats route calculates current streak by checking consecutive days backwards from today
- Next.js 16 App Router style with `params` as Promise (per Next.js 16 conventions)
- Lint passes cleanly with zero errors
