# Task 6-cal - Mood Calendar Component

## Summary
Created the MoodCalendar interactive monthly calendar component for the MoodLog dark-themed app.

## Files Created/Modified

### `/src/components/mood-calendar.tsx`
- Main calendar component with 'use client' directive
- Interactive monthly calendar grid with mood entry indicators
- Russian locale month names via date-fns `ru` locale
- Monday-start week with weekday headers (Пн–Вс)
- Day cell states: default, has-entry, today, other-month, combined states
- Mood dots with color-coded glow shadows based on mood score
- Click behavior: view existing entry or open add modal
- Month navigation with ChevronLeft/ChevronRight buttons
- Auto-fetches entries and stats on month change
- Exports `getMoodColor()` helper for reuse in other components

### `/src/types/global.d.ts`
- TypeScript global declaration for `window.__moodCalendarClickedDate`

## Key Design Decisions
- Used `date-fns` with Russian locale for all date calculations
- Week starts on Monday: `(getDay + 6) % 7` adjustment
- Previous month padding uses `subDays(prevMonthEnd, startDayOfWeek - 1)`
- Next month padding uses `addDays(nextMonthStart, remainingCells - 1)`
- Grid always fills complete weeks (multiples of 7 cells)
- Entry lookup via `Map<string, MoodEntry>` for O(1) access
- Clicked date exposed via `window.__moodCalendarClickedDate` for add modal integration
- `getMoodColor()` exported as standalone function for reuse by other components

## Lint: Passes cleanly
