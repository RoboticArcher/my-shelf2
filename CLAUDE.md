# my-shelf — Claude Code Briefing

## What This Project Is
A personal reading tracker web app. Users log books they've read, rate them, leave notes, and get AI-powered recommendations based on their actual taste. Has a "To Read" list and stats view.

**Started as:** A personal tool for Trey and people he knows.
**Market potential:** Reading tracker + AI recs is a real product category.
Competitors like Goodreads are bloated and old. A clean, fast, AI-native
alternative with a strong design could have genuine commercial appeal.
Potential monetization paths: premium tier (unlimited books, advanced stats,
priority AI), family plan, or a one-time purchase model.

**Live URL:** Deployed on Vercel via GitHub (auto-deploys on push to `main`)
**Repo:** https://github.com/RoboticArcher/my-shelf2

---

## Architecture — Critical to Understand

**Everything lives in one file: `src/App.jsx`**
This is intentional. Do not split into separate component files unless explicitly asked.

- **CSS** is a single template literal string called `CSS` at the very top of the file, injected via `<style>{CSS}</style>`. All new styles go in this string.
- **All components** are defined in App.jsx as named functions.
- **No TypeScript.** Plain JS only.
- **Build tool:** Vite + React 19

### Running / Deploying
```bash
npm run build     # verify before every commit
git push origin main  # triggers Vercel auto-deploy
```
Always run `npm run build` before committing to catch errors.

---

## Tech Stack
| Layer | Tool |
|---|---|
| Frontend | React 19 + Vite |
| Styling | CSS-in-JS (template literal), no Tailwind |
| AI | Anthropic API via `/api/anthropic` serverless endpoint (Vercel) |
| Book data | OpenLibrary API (covers, pages, author lookup) |
| Persistence | localStorage (no backend database) |
| Hosting | Vercel |

---

## localStorage Keys
| Key | Contents |
|---|---|
| `shelf-books` | Array of logged books |
| `shelf-toread` | Array of to-read list items |
| `shelf-quiz` | User's Reading DNA quiz answers |
| `shelf-goal` | Annual reading goal (integer) |

---

## CSS Variables (use these, never hardcode colors)
```css
--bg, --surface, --border, --border2
--cyan, --cyan-dim, --cyan-mid
--amber, --red
--ink, --ink2, --ink3, --ink4   /* darkest to lightest text */
--grid-col
```
**Fonts:** `'JetBrains Mono', monospace` (UI/code) · `'DM Serif Display', serif` (titles/headings)

---

## Components (all in App.jsx)
| Component | Purpose |
|---|---|
| `Stars` | 1–5 star rating display + interactive. Supports touch (swipe to rate on mobile). |
| `BookCard` | Grid card for a logged book. Shows DNF badge + reduced opacity for DNF books. |
| `AddModal` | Log a new book (supports `prefill` prop for Mark as Read flow). Has status toggle (Read / DNF). Duplicate detection warns if title already on shelf. |
| `DetailModal` | View/edit a logged book's notes, rating, and status (Read / DNF). |
| `RecsModal` | AI recommendations panel — fetches 4 recs, replaces individually when marked read or saved to To Read. Results cached in module-level `recsCache`. |
| `ScanModal` | Photo scan a bookshelf via Claude vision API |
| `ImportCSVModal` | Import Goodreads CSV or Amazon Order History CSV |
| `AddToReadModal` | Search OpenLibrary and save to To Read list |
| `BookSearchInput` | Autocomplete book search input (used in QuizModal) |
| `QuizModal` | Reading DNA quiz — 5 fave books + top 3 genres |

---

## Module-Level Helpers & Variables
```js
fetchCover(title, author)        // returns cover URL or null
fetchBookMeta(title, author)     // returns { cover, pages, author } from OpenLibrary
parseCSV(text)                   // returns { format, rows } — detects goodreads/amazon/generic
pickGenre(subjects[])            // maps OpenLibrary subjects → app genre string
let recsCache = null             // { tasteProfile, recs, bookCount } — persists while tab open
```

---

## App State (main App component)
```js
books        // logged books array
toRead       // to-read list array
view         // "shelf" | "stats" | "to-read"
modal        // string key or object (book, markAsRead flow)
search       // shelf search string
sortBy       // "date-added" | "date-read" | "rating" | "title" | "author"
filterGenre  // genre string, "" for all, "__dnf__" sentinel for DNF filter
statsYear    // "all" or "YYYY" — filters stats view
readingGoal  // integer, 0 = not set
editingGoal  // bool — controls goal input visibility
quizData     // Reading DNA preferences
```

---

## Navigation Layout
```
[ Shelf | To Read ]   [ Stats ]        ← two separate nav pills, 8px gap
```
Shelf and To Read are in one connected pill. Stats is a separate pill to the right.

## Header Buttons (right side)
```
◈ Reading DNA  |  Import CSV  |  📸 Scan Shelf
```
"+ Log Book" lives in the shelf search row, not the header.

## Shelf View Search Row
```
[ Search bar (max 280px) ]  [ + Log Book ]  [ ✦ Get AI Recs ]
```

## Shelf Filter Row (below search row, only shown when books exist)
```
[ Sort dropdown ]  [ All ]  [ Genre chips... ]  [ DNF ]  ← DNF chip only appears if any DNF books exist
```

---

## Modal Routing Pattern
```js
modal === "quiz"        → QuizModal
modal === "add"         → AddModal
modal === "add-toread"  → AddToReadModal
modal === "scan"        → ScanModal
modal === "import-csv"  → ImportCSVModal
modal === "rec"         → RecsModal
modal?.id && !modal?.addedAt  → DetailModal (logged book)
modal?.markAsRead       → AddModal with prefill (from To Read)
```
To-read items have `addedAt` field. Logged books do not. Use this to distinguish them.

---

## AI Recommendations (RecsModal)
- Fetches 4 recs on open via `/api/anthropic`
- Results cached in module-level `recsCache` — reopening doesn't re-fetch unless books count changed
- **"Already Read"** → adds to shelf, replaces that slot with a new AI rec
- **"＋ To Read"** → saves to toRead list, replaces that slot with a new AI rec (same flow)
- Both use `replaceRec(idx, currentRecs)` internally
- Uses `quizData` (Reading DNA) to weight recommendations heavily toward stated preferences
- Regenerate button clears cache and re-fetches

---

## CSV Import (ImportCSVModal)
`parseCSV` auto-detects format:
- **Goodreads** — identified by `exclusive_shelf` / `my_rating` headers
- **Amazon Order History** — identified by `asin` / `order_id` headers; filters to Kindle-category rows only; uses order date as read date proxy; looks up author via OpenLibrary
- **Generic** — fallback

Review stage shows a coloured format badge (amber = Amazon, cyan = Goodreads).

---

## Book Data Shape
```js
// Logged book (shelf-books)
{ id, title, author, cover, rating, notes, genre, pages, dateRead, status }
// status: "read" (default) | "dnf" (Did Not Finish)
// rating: 0 = unrated (allowed), 1–5 = rated

// To-read item (shelf-toread)
{ id, title, author, cover, addedAt }
```

---

## Stats View — Key Logic
- `statBooks` = all books filtered by `statsYear`
- `readBooks` = `statBooks.filter(b => b.status !== "dnf")` — used for all stat calculations
- DNF books are excluded from: Books Read count, Pages Read, Avg Rating, Rating Distribution, Genre Breakdown, Top Authors, Books by Month
- DNF books ARE still in `statBooks` (used only for the raw year-filtered pool)
- Reading goal bar shows progress toward annual target using `thisYearBooks` (also excludes DNF)

---

## Mobile / Responsive
- Header wraps on small screens (`max-width: 640px`)
- Search input goes full-width on mobile
- Filter chip row scrolls horizontally (`overflow-x: auto`, `flex-wrap: nowrap`) on mobile
- Modal padding tightens on mobile
- Stars support touch events — swipe left/right to set rating

---

## Things to Always Do
1. Run `npm run build` before every commit
2. Keep all CSS in the `CSS` template literal at the top of App.jsx
3. Keep all components in App.jsx (single-file pattern)
4. Use CSS variables for all colors
5. Commit with descriptive messages, then `git push origin main`

---

## Session History — Major Features Built
- **Stats year filter** — filter all stat calculations by year extracted from `dateRead`
- **CSV import** — Goodreads + Amazon Order History detection, cover/author fetch on import
- **Pages accuracy** — `fetchBookMeta` gets pages + cover + author in one OpenLibrary call
- **To Read list** — separate tab, grid view, Mark as Read flow, save from RecsModal
- **Rec replacement** — saving/reading a rec immediately fetches a replacement
- **Nav split** — Shelf+To Read connected pill, Stats separate
- **Log Book in search row** — moved from header into shelf view alongside Get AI Recs
- **Unrated books** — rating is optional; avg only counts books with rating > 0
- **Sort + genre filter** — sort dropdown + genre chips + DNF filter chip on shelf view
- **Reading goal** — annual goal bar with progress, stored in `shelf-goal` localStorage key
- **Books by month chart** — bar chart of reading pace for selected year
- **Export CSV** — download all shelf data as a CSV file
- **Duplicate detection** — warns in AddModal if a title already exists on the shelf
- **AI recs caching** — recs persist across modal opens; Regenerate button forces refresh
- **Top Authors stat** — bar chart of most-read authors in stats view
- **DNF status** — "Did Not Finish" toggle on AddModal + DetailModal; badge on BookCard; filter chip; excluded from all stats
- **Mobile responsive** — wrapping header, full-width search, scrollable filter row, touch stars
- **Series import** — Log an entire book series at once via AI lookup; dedup against existing shelf
- **Scan shelf** — Photo → Claude vision → books identified from spines → review + bulk add

---

## Deep Code Review — 2026-03-15

### Bugs Fixed This Session
1. **ImportCSVModal N re-renders** — `onAdd` was called once per book in a loop, triggering N localStorage writes and N re-renders. Fixed: now uses `onAddMultiple` (batch state update). Also now passes `existingBooks` to deduplicate on import.
2. **CSV import genre always "General"** — `fetchBookMeta` returns a `genre` from OpenLibrary subjects, but the import modal discarded it and hardcoded "General". Fixed: now uses `meta.genre` when available.
3. **Export CSV missing `status`** — Exporting then reimporting a CSV lost all DNF information. Fixed: `status` column ("read" / "dnf") now included in export.
4. **Series mode re-adds all books on full duplicate** — When every book in a series was already on the shelf, `fresh.length ? fresh : newBooks` fell back to `newBooks`, silently adding all duplicates. Fixed: only adds `fresh`; does nothing if all already exist.
5. **Series books had `dateRead: null`** — Books added via the Series mode had `dateRead: null`, which excluded them from all stats (genre breakdown, books by month, reading goal progress). Fixed: now defaults to current month, same as single-book add.
6. **Dead code: `StackModal`** — Component defined at line ~901 was never rendered anywhere in the app. Removed component and its 4 CSS classes.

### Remaining Issues / Technical Debt
7. **`recsCache` invalidates on count, not content** — If you delete one book and add a different one (same total count), the recs cache won't invalidate. Low priority, but could serve stale recs.
   Fix: store a hash or timestamp in the cache instead of just `bookCount`.
8. **No date picker when logging a book** — Every book logs with today's date (`new Date().toISOString().slice(0,7)`). No way to say "I read this in January 2023." This hurts stats accuracy for backcatalog logging.
   Fix: Add a month/year input field to AddModal and DetailModal.
9. **Genre not editable after add** — `DetailModal` shows genre as a read-only tag. If OpenLibrary assigns the wrong genre, there's no way to fix it.
   Fix: Make genre a dropdown in `DetailModal` (same genre list as `GENRES` constant).
10. **Notes not searched** — `searched` filter only searches `title` and `author`. A user who writes notes won't find a book by searching a word from their notes.
    Fix: Add `|| b.notes?.toLowerCase().includes(search.toLowerCase())` to the search filter.
11. **`AddModal` `onAddMultiple` edge case** — After series add closes modal, the `setAddingAll(true)` state is never reset to false. If the modal stays open (which can't currently happen since `onAddMultiple` triggers close), this would be a problem. Low risk but worth noting.
12. **No "Currently Reading" status** — Only "Read" and "DNF". No in-progress state. This limits usefulness for active readers.
13. **`Free Tier` bar has no enforcement** — Stats view shows a "50 books / Free Tier Usage" progress bar, but there's no cap in the code. Either enforce it (if monetizing) or remove the bar (if keeping it free).
14. **Escape key doesn't close modals** — All modals support click-outside to dismiss but not the Escape key. Standard UX expectation.

### Feature Improvement Ideas
**High impact, low effort:**
- **Date picker in AddModal** — Month + year input (type="month") lets users accurately log past reads. Critical for stats.
- **Genre edit in DetailModal** — Replace the genre tag with a `<select>` dropdown using `GENRES`.
- **Notes search** — One-line fix to the filter function.
- **Escape key to close modals** — Add `useEffect` with `keydown` listener to each modal.

**Medium effort:**
- **"Currently Reading" status** — Third status option between To Read and Read. Show a separate "In Progress" section or count on the shelf.
- **Sort/filter on To Read tab** — As the list grows beyond 20 items, navigation gets hard.
- **Read date range in DetailModal** — Show the full `dateRead` and let the user edit it (currently read-only).
- **Recs cache by content hash** — Use a lightweight hash of book titles instead of just count for smarter cache invalidation.

**Bigger additions:**
- **Friends / shared shelves** — Allow generating a shareable URL or export link to show your shelf to others (read-only). No backend needed — could encode shelf as compressed URL hash.
- **Book club mode** — Mark a book as "currently in book club" and generate discussion questions via AI.
- **Currently Reading shelf section** — If "Currently Reading" status added, show a dedicated in-progress strip at the top of the shelf view.

### Monetization Note
The **Free Tier bar** in stats (currently decorative) is the natural lever. The scaffolding for a paid tier is already there conceptually. The cleanest path:
- Free: 50 books, 3 AI rec sessions/month
- Paid ($5/mo or $40/yr): Unlimited books, unlimited recs, priority AI
- Gate by counting `books.length >= 50` before allowing AddModal to save; show upgrade prompt
- Add Supabase auth + Stripe when ready to actually charge — the StackModal (now removed) had the full blueprint

