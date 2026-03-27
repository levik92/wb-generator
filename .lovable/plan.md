

## Problem

UTM clicks are not being recorded for logged-in users.

**Root cause**: When a logged-in user visits `https://wbgen.ru/?utm_source=ls-promo`, the `AuthRedirect` component immediately redirects to `/dashboard` via React Router's `<Navigate>`, which **strips the query parameters from the URL before** `UtmTracker`'s `useEffect` fires. By the time `window.location.search` is read, the `utm_source` param is gone.

The 3 existing visits were recorded from non-logged-in users where `AuthRedirect` does not redirect.

## Fix

**Capture UTM params at module load time**, before React Router can strip them. This is a single-file change to `src/hooks/useUtmTracking.ts`.

### Technical approach

1. **`src/hooks/useUtmTracking.ts`** -- At the top of the module (outside any component/hook), immediately read `window.location.search` and store the UTM params in module-scope variables. This runs when the JS module is first imported, well before any React rendering or routing.

```text
// Module-scope capture (runs before React Router)
const INITIAL_PARAMS = new URLSearchParams(window.location.search);
const INITIAL_UTM_SOURCE = INITIAL_PARAMS.get("utm_source");
const INITIAL_UTM_MEDIUM = INITIAL_PARAMS.get("utm_medium") || "";
const INITIAL_UTM_CAMPAIGN = INITIAL_PARAMS.get("utm_campaign") || "";
```

Then inside `useUtmTracking()`, use these captured values instead of reading `window.location.search` (which may already be `/dashboard` by the time the effect runs).

This is the only change needed. No database or RLS changes required -- the policies are correct (public INSERT on `utm_visits`, public SELECT on `utm_sources`).

