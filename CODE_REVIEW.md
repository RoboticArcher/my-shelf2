# my-shelf — Code Review
**Reviewed:** 2026-03-16
**Files reviewed:** `src/App.jsx`, `api/anthropic.js`, `api/import-csv.js`, `package.json`, `vercel.json`

---

## Summary
A well-architected React + Vite bookshelf app with Vercel serverless API routes. The server-side proxy pattern for Claude API calls (`api/anthropic.js`) is the right approach. The CSV import pipeline (server-side + client-side fallback) is solid. A handful of bugs and security gaps need attention before this handles real user data at scale.

---

## 🐛 Bugs

### 1. `setAddingAll` never resets to `false` after series import *(medium)*
In `AddModal.addSelectedBooks()`, `setAddingAll(true)` is set before the async work begins, but there is no corresponding `setAddingAll(false)` after `onAddMultiple(fresh)` is called. If the user closes the modal or if the operation completes, the button remains stuck showing "Fetching covers…" indefinitely on the next open (since the modal re-mounts, this is only a problem if the same modal instance is reused — confirm behavior, but worth fixing defensively).

**Fix:** Add `setAddingAll(false)` after `onAddMultiple(fresh)` in the `addSelectedBooks` function.

### 2. Stale timer refs in search `useEffect` hooks *(low)*
In `AddModal` and `AddToReadModal`, `timer.current = setTimeout(...)` is set inside a `useEffect`, and `clearTimeout(timer.current)` is called at the top of the next effect run. However, there is no cleanup returned from the effect for the *final* invocation — if the component unmounts mid-debounce, the timeout fires and calls `setResults`/`setLoading` on an unmounted component. React 18 suppresses the warning but it's still a logic error.

**Fix:** Return `() => clearTimeout(timer.current)` from the `useEffect` cleanup function.

### 3. `fetchCover` / `fetchBookMeta` calls in series mode swallow errors silently *(low)*
In `addSelectedBooks`, errors from `fetchBookMeta` are caught with an empty `catch {}`. This means a network outage silently results in books being added with no covers or metadata, with no indication to the user.

**Fix:** After the `Promise.all` resolves, count how many items have no cover and surface a brief toast if >50% had fetch failures.

### 4. `showToast` timer is not tracked — rapid calls clobber each other *(low)*
The `showToast` helper in `App` calls `setTimeout(() => setToast(null), 2500)` without storing the timer ID. If `showToast` is called again before 2500ms, two competing timeouts race to clear the toast.

**Fix:** Use a `useRef` to track the toast timer and clear it before setting a new one.

### 5. `recsCache` is module-level, not component-level *(low)*
The `recsCache` variable is declared at module scope (`let recsCache = null`), meaning it persists across hot-reloads and potentially across different users in SSR-like environments. It's also invisible to React DevTools. It works fine in practice for a single-user SPA, but it's architecturally fragile.

**Fix:** Move `recsCache` into the `App` component as a `useRef`, or pass it down as a prop/context.

### 6. `exportCSV` uses `a.click()` without DOM attachment *(very low)*
The export function creates an `<a>` element and calls `.click()` directly without appending it to the document. This works in all major browsers but is technically non-standard. Safari specifically has had issues with this pattern in the past.

**Fix:** Append `a` to `document.body`, call `.click()`, then immediately remove it.

---

## 🔒 Security Issues

### 1. `api/anthropic.js` — No model or parameter allowlist *(high)*
The proxy passes `req.body` directly to the Anthropic API with no validation:
```js
body: JSON.stringify(req.body),
```
A malicious user could send a crafted request body specifying an expensive model (`claude-opus-4-20250514`), an extremely high `max_tokens`, inject a `system` prompt, or set `stream: true`. This could lead to unexpected API costs.

**Fix:** Validate and sanitize `req.body` before forwarding. At minimum:
- Enforce an allowlist of permitted `model` values (e.g., only `claude-sonnet-*`)
- Cap `max_tokens` at a reasonable ceiling (e.g., 2000)
- Strip or ignore unknown top-level fields

### 2. `api/anthropic.js` — Rate limiting is per serverless instance only *(medium)*
The `rateLimitMap` is in-memory within a single serverless function instance. Under concurrent load, Vercel may spin up multiple instances, each with their own independent rate limit state. Effective per-IP rate limit could be 10× or more the intended value.

**Fix:** Use a Redis-based rate limiter (Upstash Redis is already a dependency in the Chore Manager — bring it in here too) for shared, persistent rate limiting.

### 3. No security headers in `vercel.json` *(medium)*
There are no `Content-Security-Policy`, `X-Frame-Options`, or `X-Content-Type-Options` headers configured. An attacker who injects content into the page could steal localStorage data (shelf books, quiz preferences).

**Fix:** Add a `headers` block to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; ..." }
      ]
    }
  ]
}
```

### 4. `api/import-csv.js` — No CSRF protection *(low)*
The import endpoint has no CSRF token or `Origin` header check. A malicious third-party site could trigger a CSV parse request on behalf of a logged-in user. Low severity since there's no authentication and the endpoint only reads/parses data without side effects.

---

## 💡 Improvements

### 1. Duplicate CSV parsing logic
`parseCSV()` in `App.jsx` and `parseCSVServer()` in `api/import-csv.js` are nearly identical (both handle GoodReads and Amazon formats with the same field normalization logic). The server-side version is more robust (better ISBN cleaning, author normalization). The client-side version is only kept as a fallback for when the server is unreachable.

**Suggestion:** Consider consolidating — the client-side fallback could simply show an error message asking the user to retry, removing the duplicated logic entirely.

### 2. No `AbortController` on debounced searches
All three debounced search `useEffect` hooks (`AddModal`, `AddToReadModal`, `BookSearchInput`) fire multiple async fetch calls. If the user types fast, stale responses from earlier queries could arrive after a newer one and overwrite correct results.

**Fix:** Use `AbortController` to cancel in-flight requests when a newer request supersedes them.

### 3. Missing `useCallback` on stable function references
`showToast`, `onAdd`, `onDelete`, `onRate` are re-created on every render of `App`. This causes all child components that receive them as props to re-render unnecessarily.

**Suggestion:** Wrap them in `useCallback` with appropriate dependencies.

### 4. `currently-reading` shelf status silently treated as `read`
In `import-csv.js` (line 139): `else if (shelfRaw === "currently-reading") status = "read";` — books the user is actively reading are imported as finished. A `status: "reading"` state or a warning to the user would be more accurate.

### 5. Dependency hygiene
`package.json` specifies `"react": "^19.2.4"` and `"vite": "^8.0.0"` — both very recent major versions. React 19 and Vite 8 were released recently and may have breaking changes with some dev dependencies. Consider pinning to a specific minor version and regularly auditing with `npm audit`.

### 6. No 404 / error boundary handling
There is no React Error Boundary wrapping the app. If any component throws (e.g., bad localStorage data, malformed book record), the entire app goes blank with no recovery mechanism.

**Fix:** Add a top-level `<ErrorBoundary>` that catches render errors and shows a recovery UI.

---

## ✅ What's Done Well
- Server-side API proxy correctly hides the Anthropic key from the browser
- Rate limiting is implemented (even if not distributed)
- `import-csv.js` has a proper 5MB guard
- CSRF escaping in `exportCSV` with `replace(/"/g, '""')`
- Graceful fallback to client-side CSV parsing when server is unreachable
- `timingSafeEqual` is used for HMAC comparison in the Chore Manager (same codebase style)
- ISBN-based deduplication in CSV import is thorough
- `QuotaExceededError` handling on localStorage writes (in Chore Manager) — same pattern should be adopted here
