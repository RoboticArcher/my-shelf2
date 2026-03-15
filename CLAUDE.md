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
| `Stars` | 1–5 star rating display + interactive |
| `BookCard` | Grid card for a logged book |
| `AddModal` | Log a new book (supports `prefill` prop for Mark as Read flow) |
| `DetailModal` | View/edit a logged book's notes and rating |
| `RecsModal` | AI recommendations panel — fetches 4 recs, replaces individually when marked read or saved to To Read |
| `ScanModal` | Photo scan a bookshelf via Claude vision API |
| `ImportCSVModal` | Import Goodreads CSV or Amazon Order History CSV |
| `AddToReadModal` | Search OpenLibrary and save to To Read list |
| `BookSearchInput` | Autocomplete book search input (used in QuizModal) |
| `QuizModal` | Reading DNA quiz — 5 fave books + top 3 genres |

---

## Module-Level Helpers
```js
fetchCover(title, author)        // returns cover URL or null
fetchBookMeta(title, author)     // returns { cover, pages, author } from OpenLibrary
parseCSV(text)                   // returns { format, rows } — detects goodreads/amazon/generic
pickGenre(subjects[])            // maps OpenLibrary subjects → app genre string
```

---

## App State (main App component)
```js
books        // logged books array
toRead       // to-read list array
view         // "shelf" | "stats" | "to-read"
modal        // string key or object (book, markAsRead flow)
search       // shelf search string
statsYear    // "all" or "YYYY" — filters stats view
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
- **"Already Read"** → adds to shelf, replaces that slot with a new AI rec
- **"＋ To Read"** → saves to toRead list, replaces that slot with a new AI rec (same flow)
- Both use `replaceRec(idx, currentRecs)` internally
- Uses `quizData` (Reading DNA) to weight recommendations heavily toward stated preferences

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
{ id, title, author, cover, rating, notes, genre, pages, dateRead }

// To-read item (shelf-toread)
{ id, title, author, cover, addedAt }
```

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
