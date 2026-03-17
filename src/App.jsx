import { useState, useEffect, useRef } from "react";

// Module-level recs cache — persists while tab is open, auto-invalidates when shelf or To Read list changes
let recsCache = null; // { tasteProfile, recs, bookCount, toReadCount }

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #FAF6F0;
    --surface:  #F4EDE4;
    --border:   #E2D5C8;
    --border2:  #C8B8A8;
    --cyan:     #A47764;
    --cyan-dim: rgba(164,119,100,0.12);
    --cyan-mid: #C49A7A;
    --amber:    #C4714A;
    --red:      #C45B5B;
    --ink:      #1C1410;
    --ink2:     #3D2B1F;
    --ink3:     #6B5744;
    --ink4:     #A47764;
    --linen:    #F0E8DC;
    --forest:   #3D6B4F;
  }

  body { background: var(--bg); color: var(--ink); font-family: 'Inter', system-ui, sans-serif; font-size: 16px; line-height: 1.6; }

  .header {
    position: sticky; top: 0; z-index: 200;
    background: rgba(244,237,228,0.95); backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border); height: 60px;
    display: flex; align-items: center; justify-content: space-between; padding: 0 28px;
  }
  .logo { display: flex; align-items: baseline; gap: 2px; }
  .logo-word { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 700; color: var(--ink); letter-spacing: -0.02em; }
  .logo-word span { color: var(--cyan); }
  .logo-badge { font-size: 9px; font-weight: 600; letter-spacing: 0.16em; color: var(--ink4); padding: 2px 7px; text-transform: uppercase; }
  .nav-pill { display: flex; background: var(--linen); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  .nav-btn { background: none; border: none; padding: 6px 16px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500; cursor: pointer; color: var(--ink3); transition: all 0.15s; white-space: nowrap; }
  .nav-btn:hover { color: var(--ink); background: var(--border); }
  .nav-btn.active { background: var(--ink); color: #F0E8DC; }

  .btn-primary { background: var(--cyan); color: var(--linen); border: none; border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; padding: 9px 20px; cursor: pointer; transition: opacity 0.15s, transform 0.1s; }
  .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
  .btn-ghost { background: none; border: 1.5px solid var(--border2); border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500; padding: 7px 14px; cursor: pointer; color: var(--ink3); transition: all 0.15s; }
  .btn-ghost:hover { border-color: var(--cyan); color: var(--cyan); }

  .stat-bar { display: grid; grid-template-columns: repeat(4, 1fr); background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 28px; box-shadow: 0 1px 4px rgba(28,20,16,0.08); }
  .stat-cell { padding: 18px 22px; border-right: 1px solid var(--border); position: relative; }
  .stat-cell:last-child { border-right: none; }
  .stat-cell::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--cyan), var(--cyan-mid)); opacity: 0; }
  .stat-cell:hover::before { opacity: 1; }
  .stat-label { font-size: 9px; font-weight: 600; color: var(--ink4); letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 6px; font-family: 'Inter', sans-serif; }
  .stat-value { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; color: var(--ink); line-height: 1; }

  .search-row { display: flex; gap: 10px; margin-bottom: 24px; }
  .search-input { flex: 1; padding: 10px 14px; background: var(--surface); border: 1.5px solid var(--border); border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 14px; color: var(--ink); outline: none; transition: border-color 0.15s; }
  .search-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(164,119,100,0.15); }
  .search-input::placeholder { color: var(--ink4); }
  .rec-btn { padding: 9px 22px; border-radius: 8px; border: 1.5px solid var(--forest); background: rgba(61,107,79,0.1); color: var(--forest); font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
  .rec-btn:hover:not(:disabled) { background: var(--forest); color: var(--linen); }
  .rec-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Cover-first vertical book grid */
  .book-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; }
  @media (max-width: 1024px) { .book-grid { grid-template-columns: repeat(4, 1fr); } }
  @media (max-width: 768px) { .book-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; } }
  .book-card { background: transparent; border: none; border-radius: 0; padding: 0; cursor: pointer; display: flex; flex-direction: column; transition: transform 0.2s; position: relative; }
  .book-card:hover { transform: translateY(-4px); }
  .book-card::after { display: none; }
  .book-cover { width: 100%; aspect-ratio: 2/3; flex-shrink: 0; border-radius: 6px; overflow: hidden; background: var(--surface); border: none; display: flex; align-items: center; justify-content: center; font-size: 36px; box-shadow: 0 2px 10px rgba(28,20,16,0.18); }
  .book-cover img { width: 100%; height: 100%; object-fit: cover; }
  .book-title { font-family: 'Playfair Display', Georgia, serif; font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 2px; line-height: 1.3; margin-top: 10px; }
  .book-author { font-size: 11px; color: var(--ink3); margin-bottom: 4px; font-family: 'Inter', sans-serif; }
  .book-notes { font-size: 11px; color: var(--ink4); line-height: 1.6; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-style: italic; }
  .genre-tag { font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--cyan); background: var(--cyan-dim); padding: 2px 8px; border-radius: 10px; font-family: 'Inter', sans-serif; }

  /* Stars: 14px on cards, 22px in .stars-lg context (modals / detail) */
  .stars { display: flex; gap: 2px; }
  .star { font-size: 14px; transition: color 0.1s; cursor: default; line-height: 1; user-select: none; }
  .stars-lg .star { font-size: 22px; }
  .star.interactive { cursor: pointer; }
  .star.lit { color: var(--amber); }
  .star.dim { color: var(--border); }
  /* Half-star: left half terracotta, right half sand — uses background-clip on the ★ glyph */
  .star.half {
    background: linear-gradient(90deg, var(--amber) 50%, var(--border) 50%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .backdrop { position: fixed; inset: 0; background: rgba(28,20,16,0.55); backdrop-filter: blur(6px); z-index: 500; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.18s ease; }
  @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
  .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 32px; width: min(500px, 94vw); max-height: 88vh; overflow-y: auto; box-shadow: 0 24px 60px rgba(28,20,16,0.2); animation: slideUp 0.2s ease; }
  .modal-wide { width: min(620px, 94vw); }
  @keyframes slideUp { from { opacity:0; transform: translateY(16px) } to { opacity:1; transform: translateY(0) } }
  .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 26px; }
  .modal-title { font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600; color: var(--ink); }
  .modal-sub { font-size: 10px; color: var(--ink4); letter-spacing: 0.14em; text-transform: uppercase; margin-top: 3px; font-family: 'Inter', sans-serif; }
  .close-btn { background: none; border: none; font-size: 22px; color: var(--ink4); cursor: pointer; line-height: 1; padding: 0 4px; }
  .close-btn:hover { color: var(--ink); }

  .field { margin-bottom: 18px; }
  .label { display: block; font-size: 10px; font-weight: 600; color: var(--ink3); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 7px; font-family: 'Inter', sans-serif; }
  .input { width: 100%; padding: 10px 13px; background: var(--bg); border: 1.5px solid var(--border); border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 14px; color: var(--ink); outline: none; transition: border-color 0.15s; }
  .input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(164,119,100,0.15); }
  .input::placeholder { color: var(--ink4); }
  textarea.input { resize: vertical; line-height: 1.7; min-height: 90px; }

  .autocomplete { border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 18px; }
  .ac-item { padding: 10px 14px; cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.1s; }
  .ac-item:last-child { border-bottom: none; }
  .ac-item:hover { background: var(--cyan-dim); }
  .ac-title { font-size: 14px; color: var(--ink); font-family: 'Playfair Display', Georgia, serif; }
  .ac-author { font-size: 12px; color: var(--ink3); margin-top: 1px; font-family: 'Inter', sans-serif; }

  .taste-profile { background: linear-gradient(135deg, var(--linen), rgba(61,107,79,0.08)); border: 1.5px solid var(--border2); border-radius: 10px; padding: 18px; margin-bottom: 22px; position: relative; overflow: hidden; }
  .taste-profile::before { content: '📚'; position: absolute; right: 14px; top: 12px; font-size: 24px; opacity: 0.25; }
  .rec-card { background: transparent; border: none; border-top: 1.5px solid var(--border); padding: 16px 0; margin-bottom: 0; transition: none; }
  .rec-card:first-of-type { border-top: none; }
  .rec-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .match-badge { background: var(--forest); color: var(--linen); font-size: 10px; font-weight: 600; padding: 3px 10px; border-radius: 10px; flex-shrink: 0; margin-left: 12px; letter-spacing: 0.04em; font-family: 'Inter', sans-serif; }
  .rec-reason { font-size: 13px; color: var(--ink3); line-height: 1.7; border-top: 1px solid var(--border); padding-top: 10px; margin-top: 6px; font-family: 'Inter', sans-serif; }

  .spinner { width: 36px; height: 36px; border: 2.5px solid var(--border); border-top-color: var(--cyan); border-radius: 50%; animation: spin 0.7s linear infinite; margin: 0 auto 14px; }
  @keyframes spin { to { transform: rotate(360deg) } }

  .bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .bar-track { flex: 1; height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden; border: 1px solid var(--border); }
  .bar-fill { height: 100%; background: var(--forest); border-radius: 4px; transition: width 0.7s cubic-bezier(.4,0,.2,1); }
  .bar-fill.amber { background: var(--amber); }

  .empty { text-align: center; padding: 80px 0; color: var(--ink4); }
  .empty-icon { font-size: 52px; margin-bottom: 16px; }
  .empty-title { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: var(--ink3); margin-bottom: 8px; }

  .onboarding { max-width: 520px; margin: 60px auto; text-align: center; padding: 0 16px; }
  .onboarding-title { font-family: 'Playfair Display', Georgia, serif; font-size: 42px; font-weight: 700; color: var(--ink); line-height: 1.15; margin-bottom: 14px; }
  .onboarding-sub { font-size: 15px; color: var(--ink3); line-height: 1.8; margin-bottom: 36px; max-width: 380px; margin-left: auto; margin-right: auto; font-family: 'Inter', sans-serif; }
  .onboarding-features { display: flex; justify-content: center; gap: 12px; margin-bottom: 36px; flex-wrap: wrap; }
  .onboarding-feature { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; width: 140px; box-shadow: 0 1px 4px rgba(28,20,16,0.08); }
  .onboarding-feature-icon { font-size: 22px; margin-bottom: 8px; }
  .onboarding-feature-label { font-size: 11px; font-weight: 600; color: var(--ink2); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 4px; font-family: 'Inter', sans-serif; }
  .onboarding-feature-desc { font-size: 11px; color: var(--ink4); line-height: 1.6; font-family: 'Inter', sans-serif; }
  .onboarding-actions { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  @media (max-width: 640px) {
    .onboarding-title { font-size: 32px; }
    .onboarding-feature { width: 120px; padding: 14px 12px; }
  }

  .tier-bar-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px 22px; margin-top: 16px; }
  .tier-progress { height: 10px; background: var(--bg); border-radius: 5px; overflow: hidden; border: 1px solid var(--border); margin-top: 10px; }
  .tier-fill { height: 100%; border-radius: 5px; transition: width 0.6s ease; }

  .year-filter { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; align-items: center; }
  .year-btn { background: none; border: 1.5px solid var(--border); border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500; padding: 5px 14px; cursor: pointer; color: var(--ink3); transition: all 0.15s; }
  .year-btn:hover { border-color: var(--cyan); color: var(--cyan); }
  .year-btn.active { background: var(--ink); color: var(--linen); border-color: var(--ink); }

  .toread-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
  .toread-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; position: relative; transition: all 0.18s; box-shadow: 0 1px 4px rgba(28,20,16,0.08); }
  .toread-card:hover { border-color: var(--cyan-mid); box-shadow: 0 4px 16px rgba(164,119,100,0.15); transform: translateY(-2px); }
  .toread-cover { width: 100%; height: 120px; border-radius: 6px; overflow: hidden; background: var(--bg); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 36px; }
  .toread-cover img { width: 100%; height: 100%; object-fit: cover; }
  .toread-remove { position: absolute; top: 8px; right: 8px; background: none; border: none; color: var(--ink4); cursor: pointer; font-size: 14px; line-height: 1; padding: 2px 5px; border-radius: 3px; }
  .toread-remove:hover { color: var(--red); background: rgba(196,91,91,0.1); }

  .import-drop { border: 2px dashed var(--border2); border-radius: 12px; padding: 36px 20px; text-align: center; cursor: pointer; margin-bottom: 16px; transition: border-color 0.15s; }
  .import-drop:hover { border-color: var(--cyan); }

  .filter-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
  .filter-chip { background: none; border: 1.5px solid var(--border); border-radius: 20px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500; padding: 4px 14px; cursor: pointer; color: var(--ink3); transition: all 0.15s; white-space: nowrap; }
  .filter-chip:hover { border-color: var(--cyan); color: var(--cyan); }
  .filter-chip.active { background: var(--ink); color: var(--linen); border-color: var(--ink); }
  .sort-select { background: var(--surface); border: 1.5px solid var(--border); border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500; color: var(--ink3); padding: 6px 12px; cursor: pointer; outline: none; appearance: none; }
  .goal-bar-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 4px rgba(28,20,16,0.06); }
  .goal-track { flex: 1; height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden; border: 1px solid var(--border); }
  .goal-fill { height: 100%; background: var(--forest); border-radius: 4px; transition: width 0.7s cubic-bezier(.4,0,.2,1); }
  .dup-warning { background: rgba(196,113,74,0.1); border: 1.5px solid rgba(196,113,74,0.35); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: var(--ink2); margin-bottom: 14px; font-family: 'Inter', sans-serif; }
  .series-item { padding: 10px 14px; cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.1s; font-family: 'Inter', sans-serif; }
  .series-item:last-child { border-bottom: none; }
  .series-item:hover { background: var(--cyan-dim); }
  .series-item.excluded { opacity: 0.45; }

  .dnf-badge { font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink4); background: var(--bg); border: 1.5px solid var(--border2); padding: 2px 8px; border-radius: 10px; font-family: 'Inter', sans-serif; }
  .status-toggle { display: flex; border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 18px; }
  .status-btn { flex: 1; background: none; border: none; padding: 9px 0; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; color: var(--ink3); transition: all 0.15s; }
  .status-btn.active-read { background: var(--cyan); color: var(--linen); }
  .status-btn.active-dnf { background: var(--ink3); color: #fff; }

  @media (max-width: 640px) {
    .stat-bar { grid-template-columns: repeat(2, 1fr); }
    .stat-cell:nth-child(2) { border-right: none; }
    .stat-cell:nth-child(3) { border-top: 1px solid var(--border); }
    .stat-cell:nth-child(4) { border-top: 1px solid var(--border); border-right: none; }
    .header { height: auto; min-height: 60px; padding: 10px 16px; flex-wrap: wrap; row-gap: 8px; }
    .search-row { flex-wrap: wrap; }
    .search-row .search-input { max-width: none !important; flex: 1 0 100%; }
    .filter-row { overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; padding-bottom: 4px; -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%); mask-image: linear-gradient(to right, black 85%, transparent 100%); }
    .modal { padding: 22px 18px; }
  }

  .toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); background: var(--ink); color: var(--linen); padding: 10px 22px; border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; z-index: 9999; pointer-events: none; animation: toast-in 0.2s ease; }
  @keyframes toast-in { from { opacity: 0; transform: translateX(-50%) translateY(6px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
`;

// ── GENRE HELPER ───────────────────────────────────────────────────
const GENRES = ["Fiction","Non-Fiction","Mystery","Sci-Fi","Fantasy","Biography","History","Romance","Thriller","Self-Help","Science","Philosophy","Poetry","Horror","Children's","Graphic Novel","Classic","General"];

function pickGenre(subjects = []) {
  const s = subjects.map(x => x.toLowerCase()).join(" ");
  if (/science fiction|sci-fi|\bsf\b/.test(s)) return "Sci-Fi";
  if (/fantasy/.test(s)) return "Fantasy";
  if (/mystery|detective|crime fiction/.test(s)) return "Mystery";
  if (/thriller|suspense/.test(s)) return "Thriller";
  if (/horror/.test(s)) return "Horror";
  if (/romance|love story/.test(s)) return "Romance";
  if (/biography|autobiography|memoir/.test(s)) return "Biography";
  if (/history|historical/.test(s)) return "History";
  if (/self.help|personal development/.test(s)) return "Self-Help";
  if (/philosophy/.test(s)) return "Philosophy";
  if (/poetry|poems/.test(s)) return "Poetry";
  if (/graphic novel|comic/.test(s)) return "Graphic Novel";
  if (/children|juvenile/.test(s)) return "Children's";
  if (/classic/.test(s)) return "Classic";
  if (/\bscience\b|scientific/.test(s)) return "Science";
  if (/non-fiction|nonfiction/.test(s)) return "Non-Fiction";
  if (/\bfiction\b/.test(s)) return "Fiction";
  return "General";
}

// ── STARS ──────────────────────────────────────────────────────────
// Supports half-star ratings (0.5 increments). rating is a float or null (unrated).
// Interactive: hover left half of a star → 0.5 preview, right half → full star.
// Click a star: sets that value. Click same value again: clears to null.
function Stars({ rating, interactive = false, onChange }) {
  const [hover, setHover] = useState(null); // null | 0.5 | 1 | 1.5 | … | 5
  const ref = useRef();

  // Determine the star value from mouse X position within a star span
  const valueFromMouse = (e, starIndex) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return x < rect.width / 2 ? starIndex - 0.5 : starIndex;
  };

  // Touch: calculate value from position within the whole stars container
  const valueFromTouch = (e) => {
    const touch = e.touches[0] || e.changedTouches[0];
    const el = ref.current;
    if (!el || !touch) return null;
    const rect = el.getBoundingClientRect();
    const starWidth = rect.width / 5;
    const x = Math.max(0, touch.clientX - rect.left);
    const starIndex = Math.min(5, Math.max(1, Math.ceil(x / starWidth)));
    const xInStar = x - (starIndex - 1) * starWidth;
    return xInStar < starWidth / 2 ? starIndex - 0.5 : starIndex;
  };

  const displayRating = hover ?? rating; // show hover preview, else saved rating

  return (
    <div
      className="stars"
      ref={ref}
      onMouseLeave={interactive ? () => setHover(null) : undefined}
      onTouchMove={interactive ? e => { const v = valueFromTouch(e); if (v !== null) setHover(v); } : undefined}
      onTouchEnd={interactive ? e => {
        const v = valueFromTouch(e);
        if (v !== null) onChange?.(rating === v ? null : v); // tap same value = clear
        setHover(null);
      } : undefined}
    >
      {[1,2,3,4,5].map(i => {
        const full = displayRating != null && displayRating >= i;
        const half = !full && displayRating != null && displayRating >= i - 0.5;
        return (
          <span
            key={i}
            className={`star ${interactive ? "interactive" : ""} ${full ? "lit" : half ? "half" : "dim"}`}
            onMouseMove={interactive ? e => setHover(valueFromMouse(e, i)) : undefined}
            onClick={interactive ? e => {
              const val = valueFromMouse(e, i);
              onChange?.(rating === val ? null : val); // click same value = clear
            } : undefined}
          >★</span>
        );
      })}
    </div>
  );
}

// ── BOOK CARD ──────────────────────────────────────────────────────
function BookCard({ book, onClick, onDelete, onRate }) {
  const [imgErr, setImgErr] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="book-card" style={{ opacity: book.status === "dnf" ? 0.7 : 1 }} onClick={() => onClick(book)}>
      <div className="book-cover">
        {!imgErr && book.cover ? <img src={book.cover} alt="" onError={() => setImgErr(true)} /> : "📖"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="book-title">{book.title}</div>
        <div className="book-author">{book.author}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          <span className="genre-tag">{book.genre}</span>
          {book.status === "dnf" && <span className="dnf-badge">Did Not Finish</span>}
        </div>
        <div onClick={e => e.stopPropagation()}>
          <Stars rating={book.rating} interactive onChange={r => onRate(book.id, r)} />
        </div>
        {book.notes && <div className="book-notes">"{book.notes}"</div>}
      </div>
      <div style={{ position: "absolute", bottom: 10, right: 10 }} onClick={e => e.stopPropagation()}>
        {confirming ? (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => onDelete(book.id)} style={{ fontSize: 10, padding: "3px 8px", background: "var(--red)", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>Yes</button>
            <button onClick={() => setConfirming(false)} style={{ fontSize: 10, padding: "3px 8px", background: "var(--bg)", color: "var(--ink3)", border: "1px solid var(--border)", borderRadius: 3, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>No</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} style={{ fontSize: 13, padding: "2px 7px", background: "none", color: "var(--ink4)", border: "1px solid transparent", borderRadius: 3, cursor: "pointer", lineHeight: 1 }} title="Remove book">✕</button>
        )}
      </div>
    </div>
  );
}

// ── ADD BOOK MODAL ─────────────────────────────────────────────────
function AddModal({ onClose, onAdd, onAddMultiple, prefill, existingBooks = [] }) {
  const [mode, setMode] = useState("book"); // "book" | "series"

  // ── book mode state ──
  const [query, setQuery] = useState(prefill?.title || "");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(prefill ? { title: prefill.title, author_name: [prefill.author], cover_i: null, _prefillCover: prefill.cover } : null);
  const [rating, setRating] = useState(null); // null = unrated
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("read");
  const [loading, setLoading] = useState(false);
  const [dupWarning, setDupWarning] = useState(null);
  const timer = useRef();

  // ── series mode state ──
  const [seriesQuery, setSeriesQuery] = useState("");
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState(null);
  const [seriesInfo, setSeriesInfo] = useState(null);
  const [seriesBooks, setSeriesBooks] = useState([]);
  const [addingAll, setAddingAll] = useState(false);

  useEffect(() => {
    if (prefill) return;
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const hasDigit = /\d/.test(query);
        const fields = "key,title,author_name,cover_i,number_of_pages_median,subject,language";
        const [r1, r2] = await Promise.all([
          fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&sort=editions&limit=7&fields=${fields}`).then(r => r.json()),
          hasDigit ? fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=5&fields=${fields}`).then(r => r.json()) : Promise.resolve({ docs: [] }),
        ]);
        const seen = new Set();
        const qLower = query.toLowerCase();
        const merged = [...(r1.docs || []), ...(r2.docs || [])].filter(doc => {
          if (seen.has(doc.key)) return false;
          seen.add(doc.key);
          return true;
        }).sort((a, b) => {
          // Prefer English editions
          const aEng = (a.language || []).includes("eng") ? 0 : 1;
          const bEng = (b.language || []).includes("eng") ? 0 : 1;
          if (aEng !== bEng) return aEng - bEng;
          // Prefer exact title match, then starts-with
          const aTitle = (a.title || "").toLowerCase();
          const bTitle = (b.title || "").toLowerCase();
          const aExact = aTitle === qLower ? 0 : aTitle.startsWith(qLower) ? 1 : 2;
          const bExact = bTitle === qLower ? 0 : bTitle.startsWith(qLower) ? 1 : 2;
          return aExact - bExact;
        });
        setResults(merged.slice(0, 8));
      } catch { setResults([]); }
      setLoading(false);
    }, 380);
  }, [query]);

  const selectBook = (r) => {
    setSelected(r);
    setQuery(r.title);
    setResults([]);
    const norm = t => t.toLowerCase().trim();
    const dup = existingBooks.find(b => norm(b.title) === norm(r.title));
    setDupWarning(dup ? dup.title : null);
  };

  const findSeries = async () => {
    if (!seriesQuery.trim()) return;
    setSeriesLoading(true); setSeriesError(null); setSeriesInfo(null); setSeriesBooks([]);
    try {
      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 600,
          messages: [{ role: "user", content: `List all books in the "${seriesQuery.trim()}" series in publication order. Include only the main series books, not companion guides or spin-offs. Respond ONLY with valid JSON (no markdown):\n{"series": "...", "author": "...", "books": [{"title": "...", "year": 1954}]}` }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setSeriesInfo({ series: parsed.series, author: parsed.author });
      setSeriesBooks(parsed.books.map(b => ({ ...b, include: true })));
    } catch { setSeriesError("Couldn't find that series. Try a different name or check spelling."); }
    setSeriesLoading(false);
  };

  const addSelectedBooks = async () => {
    const toAdd = seriesBooks.filter(b => b.include);
    if (!toAdd.length) return;
    setAddingAll(true);
    const now = Date.now();
    const newBooks = await Promise.all(toAdd.map(async (b, i) => {
      let meta = { cover: null, pages: null, author: seriesInfo.author, genre: "Fiction" };
      try { meta = await fetchBookMeta(b.title, seriesInfo.author); } catch {}
      return { id: now + i, title: b.title, author: seriesInfo.author || meta.author || "Unknown", cover: meta.cover || null, rating: null, notes: "", genre: meta.genre || "Fiction", pages: meta.pages || null, dateRead: new Date().toISOString().slice(0,7), status: "read" };
    }));
    const existing = new Set(existingBooks.map(b => b.title.toLowerCase()));
    const fresh = newBooks.filter(b => !existing.has(b.title.toLowerCase()));
    if (fresh.length) onAddMultiple(fresh);
  };

  const existingTitles = new Set(existingBooks.map(b => b.title.toLowerCase()));
  const selectedCount = seriesBooks.filter(b => b.include).length;

  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div><div className="modal-title">{prefill ? "Mark as Read" : "Log a Book"}</div><div className="modal-sub">{prefill ? "Rate · Annotate" : mode === "series" ? "Add an entire series at once" : "Search · Rate · Annotate"}</div></div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Mode toggle — only shown when not in prefill (Mark as Read) flow */}
        {!prefill && (
          <div className="status-toggle" style={{ marginBottom: 18 }}>
            <button className={`status-btn ${mode === "book" ? "active-read" : ""}`} onClick={() => setMode("book")}>📖 Single Book</button>
            <button className={`status-btn ${mode === "series" ? "active-read" : ""}`} onClick={() => setMode("series")}>📚 Series</button>
          </div>
        )}

        {/* ── BOOK MODE ── */}
        {mode === "book" && (
          <>
            {!prefill && (
              <>
                <div className="field">
                  <label className="label">Search Open Library</label>
                  <input className="input" value={query} onChange={e => { setQuery(e.target.value); setSelected(null); setDupWarning(null); }} placeholder="Title or author…" autoFocus />
                </div>
                {loading && <div style={{ fontSize: 11, color: "var(--ink4)", marginBottom: 12 }}>searching…</div>}
                {results.length > 0 && !selected && (
                  <div className="autocomplete">
                    {results.map((r, i) => (
                      <div key={i} className="ac-item" onClick={() => selectBook(r)}>
                        <div className="ac-title">{r.title}</div>
                        <div className="ac-author">{r.author_name?.[0] || "Unknown author"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {dupWarning && <div className="dup-warning">⚠ "{dupWarning}" is already on your shelf — you can still add it again.</div>}
            {prefill && selected && (
              <div style={{ display: "flex", gap: 12, marginBottom: 18, padding: "12px 14px", background: "var(--cyan-dim)", border: "1.5px solid var(--cyan-mid)", borderRadius: 8 }}>
                <div style={{ width: 42, height: 60, borderRadius: 4, overflow: "hidden", background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {prefill.cover ? <img src={prefill.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📖"}
                </div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, color: "var(--ink)", lineHeight: 1.3 }}>{prefill.title}</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>{prefill.author}</div>
                </div>
              </div>
            )}
            <div className="field">
              <label className="label">Status</label>
              <div className="status-toggle">
                <button className={`status-btn ${status === "read" ? "active-read" : ""}`} onClick={() => setStatus("read")}>✓ Read it</button>
                <button className={`status-btn ${status === "dnf" ? "active-dnf" : ""}`} onClick={() => setStatus("dnf")}>✕ Did Not Finish</button>
              </div>
            </div>
            <div className="field">
              <label className="label">Your Rating <span style={{ color: "var(--ink4)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
              <div className="stars-lg"><Stars rating={rating} interactive onChange={setRating} /></div>
            </div>
            <div className="field">
              <label className="label">Personal Notes</label>
              <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="What did this book do to you?" rows={4} />
            </div>
            <button className="btn-primary" style={{ width: "100%", padding: "12px 0", fontSize: 12, opacity: selected ? 1 : 0.4, cursor: selected ? "pointer" : "not-allowed" }}
              onClick={() => {
                if (!selected) return;
                const cover = selected._prefillCover ?? (selected.cover_i ? `https://covers.openlibrary.org/b/id/${selected.cover_i}-M.jpg` : null);
                onAdd({ id: Date.now(), title: selected.title, author: selected.author_name?.[0] || "Unknown", cover, rating, notes, genre: pickGenre(selected.subject), pages: selected.number_of_pages_median || null, dateRead: new Date().toISOString().slice(0,7), status });
                onClose();
              }}>
              {prefill ? "Mark as Read" : "Add to Shelf"}
            </button>
          </>
        )}

        {/* ── SERIES MODE ── */}
        {mode === "series" && (
          <>
            <div className="field">
              <label className="label">Series Name</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" value={seriesQuery} onChange={e => setSeriesQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && findSeries()} placeholder="e.g. Lord of the Rings, Dune, Harry Potter…" autoFocus style={{ flex: 1 }} />
                <button className="btn-primary" style={{ padding: "9px 16px", fontSize: 12, whiteSpace: "nowrap" }} onClick={findSeries} disabled={!seriesQuery.trim() || seriesLoading}>
                  {seriesLoading ? "…" : "Find"}
                </button>
              </div>
            </div>
            {seriesError && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 14 }}>{seriesError}</div>}
            {seriesInfo && seriesBooks.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: "var(--ink4)", marginBottom: 10 }}>
                  <span style={{ color: "var(--ink2)", fontWeight: 700 }}>{seriesInfo.series}</span> · {seriesInfo.author} · {seriesBooks.length} books
                </div>
                <div style={{ border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
                  {seriesBooks.map((b, i) => (
                    <div key={i} className={`series-item ${b.include ? "" : "excluded"}`} onClick={() => setSeriesBooks(prev => prev.map((x, j) => j === i ? { ...x, include: !x.include } : x))}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${b.include ? "var(--cyan)" : "var(--border)"}`, background: b.include ? "var(--cyan)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {b.include && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: "var(--ink)", fontFamily: "'Playfair Display', Georgia, serif" }}>{b.title}</div>
                          {b.year && <div style={{ fontSize: 10, color: "var(--ink4)" }}>{b.year}</div>}
                        </div>
                        {existingTitles.has(b.title.toLowerCase()) && (
                          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--ink4)", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 3, padding: "2px 6px", letterSpacing: "0.08em" }}>ON SHELF</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn-primary" style={{ width: "100%", padding: "11px 0", fontSize: 12, opacity: selectedCount === 0 ? 0.4 : 1, cursor: selectedCount === 0 ? "not-allowed" : "pointer" }}
                  onClick={addingAll ? undefined : addSelectedBooks} disabled={addingAll}>
                  {addingAll ? "Fetching covers…" : `Add ${selectedCount} book${selectedCount !== 1 ? "s" : ""} to shelf`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── DETAIL MODAL ───────────────────────────────────────────────────
function DetailModal({ book, onClose, onUpdate }) {
  const [rating, setRating] = useState(book.rating);
  const [notes, setNotes] = useState(book.notes || "");
  const [status, setStatus] = useState(book.status || "read");

  const save = () => { onUpdate({ ...book, rating, notes, status }); onClose(); };

  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: "flex", gap: 20, marginBottom: 22 }}>
          <div className="book-cover" style={{ width: 80, height: 116 }}>
            {book.cover ? <img src={book.cover} alt="" /> : "📖"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: "var(--ink)", marginBottom: 4, lineHeight: 1.3 }}>{book.title}</div>
            <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 12 }}>{book.author}</div>
            <div className="stars-lg"><Stars rating={rating} interactive onChange={setRating} /></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {[book.genre, book.pages && `${book.pages}pp`, book.dateRead].filter(Boolean).map((t,i) => (
                <span key={i} style={{ fontSize: 10, padding: "2px 9px", background: "var(--cyan-dim)", color: "var(--cyan)", borderRadius: 3, fontWeight: 600, letterSpacing: "0.06em" }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="status-toggle" style={{ marginBottom: 14 }}>
          <button className={`status-btn ${status === "read" ? "active-read" : ""}`} onClick={() => setStatus("read")}>✓ Read it</button>
          <button className={`status-btn ${status === "dnf" ? "active-dnf" : ""}`} onClick={() => setStatus("dnf")}>✕ Did Not Finish</button>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add your notes…"
          style={{ width: "100%", minHeight: 90, background: "var(--bg)", border: "1.5px solid var(--border)", borderLeft: "3px solid var(--cyan)", borderRadius: "0 6px 6px 0", padding: 12, fontSize: 13, color: "var(--ink2)", fontFamily: "'Inter', sans-serif", resize: "vertical", outline: "none", lineHeight: 1.8, boxSizing: "border-box" }}
        />
        <button className="btn-primary" style={{ width: "100%", marginTop: 12, padding: "10px 0" }} onClick={save}>Save</button>
        <button className="btn-ghost" style={{ width: "100%", marginTop: 8, padding: "10px 0" }} onClick={onClose}>Close</button>

        {/* ── WHERE TO GET IT ── */}
        {(() => {
          const isbn = book.isbn;
          // Bookshop.org — supports indie bookstores via revenue sharing
          // TODO: Add your affiliate ID here once you sign up at https://bookshop.org/affiliates
          //       Change the URL to: `https://bookshop.org/search?keywords=${...}&affiliate=YOUR_ID`
          const bookshopUrl = isbn
            ? `https://bookshop.org/search?keywords=${encodeURIComponent(isbn)}`
            : `https://bookshop.org/search?keywords=${encodeURIComponent(book.title + " " + book.author)}`;
          // IndieBound — shows local indie store availability
          const indieUrl = isbn
            ? `https://www.indiebound.org/book/${isbn}`
            : `https://www.indiebound.org/search/book?keys=${encodeURIComponent(book.title + " " + book.author)}`;
          return (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "var(--ink4)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10 }}>
                Where to Get It
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <a
                  href={bookshopUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", background: "var(--cyan-dim)", border: "1.5px solid var(--cyan-mid)", borderRadius: 6, color: "var(--cyan)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--cyan)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--cyan)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--cyan-dim)"; e.currentTarget.style.color = "var(--cyan)"; e.currentTarget.style.borderColor = "var(--cyan-mid)"; }}
                >
                  <span>📚</span>
                  <span style={{ flex: 1 }}>Buy from Bookshop.org</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>↗</span>
                </a>
                <a
                  href={indieUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 6, color: "var(--ink3)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cyan)"; e.currentTarget.style.color = "var(--cyan)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--ink3)"; }}
                >
                  <span>🏠</span>
                  <span style={{ flex: 1 }}>Find it at a local indie store</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>↗</span>
                </a>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── RECS MODAL ─────────────────────────────────────────────────────
function RecsModal({ books, onClose, onAdd, quizData, toRead, setToRead, showToast }) {
  const [tasteProfile, setTasteProfile] = useState(null);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const libraryLines = (shelf) => shelf.map(b => `- "${b.title}" by ${b.author} — ${b.rating}/5. Notes: "${b.notes || "none"}"`).join("\n");

  const quizSection = quizData ? (() => {
    const faves = quizData.favBooks.filter(b => b.title.trim());
    const genres = quizData.topGenres.filter(Boolean);
    const favLines = faves.length ? `All-time favorite books (weight these most heavily):\n${faves.map((b, i) => `${i+1}. "${b.title}"${b.author ? ` by ${b.author}` : ""}`).join("\n")}` : "";
    const genreLines = genres.length ? `Preferred genres in ranked order: ${genres.map((g, i) => `${i+1}. ${g}`).join(", ")}` : "";
    return [favLines, genreLines].filter(Boolean).join("\n\n");
  })() : "";

  const toReadTitles = toRead.map(b => `"${b.title}"`).join(", ");

  const prompt = `You are a literary taste analyst. Based on this reader's stated preferences and library, recommend 4 books they haven't read.${quizSection ? `\n\nCORE PREFERENCES — factor these in most heavily:\n${quizSection}` : ""}

Library (use ratings and notes to fine-tune, but never override the core preferences above):
${libraryLines(books)}${toReadTitles ? `\n\nAlready on their To Read list — do NOT recommend these:\n${toReadTitles}` : ""}

Respond ONLY with valid JSON (no markdown):
{
  "taste_profile": "2-sentence synthesis of their reading taste written directly to them using you/your",
  "recommendations": [
    { "title": "...", "author": "...", "match": 90, "reason": "specific reasoning referencing their actual books and notes" }
  ]
}`;

  const callClaude = async (content) => {
    const res = await fetch("/api/anthropic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content }] })
    });
    const data = await res.json();
    return data.content?.[0]?.text || "";
  };

  const generate = async (useCache = false) => {
    if (useCache && recsCache && recsCache.bookCount === books.length && recsCache.toReadCount === toRead.length && recsCache.recs.length > 0) {
      setTasteProfile(recsCache.tasteProfile);
      setRecs(recsCache.recs);
      return;
    }
    setLoading(true); setError(null); setTasteProfile(null); setRecs([]);
    try {
      const text = await callClaude(prompt);
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setTasteProfile(parsed.taste_profile);
      const newRecs = parsed.recommendations.map(r => ({ ...r, replacing: false }));
      setRecs(newRecs);
      recsCache = { tasteProfile: parsed.taste_profile, recs: newRecs, bookCount: books.length, toReadCount: toRead.length };
    } catch {
      setError("Couldn't reach the AI. Check your API key is set correctly.");
    }
    setLoading(false);
  };

  const replaceRec = async (idx, currentRecs) => {
    const exclude = [...books.map(b => b.title), ...toRead.map(b => b.title), ...currentRecs.map(r => r.title)].map(t => `"${t}"`).join(", ");
    const replacePrompt = `You are a literary taste analyst. Recommend exactly 1 book for this reader. Do NOT suggest any of these titles: ${exclude}.

Library:
${libraryLines(books)}

Respond ONLY with valid JSON (no markdown):
{ "title": "...", "author": "...", "match": 90, "reason": "..." }`;
    try {
      const text = await callClaude(replacePrompt);
      const newRec = JSON.parse(text.replace(/```json|```/g, "").trim());
      setRecs(prev => prev.map((r, i) => i === idx ? { ...newRec, replacing: false } : r));
    } catch {
      setRecs(prev => prev.map((r, i) => i === idx ? { ...r, replacing: false } : r));
    }
  };

  const markRead = async (idx) => {
    const rec = recs[idx];
    setRecs(prev => prev.map((r, i) => i === idx ? { ...r, added: true, replacing: true } : r));
    const cover = await fetchCover(rec.title, rec.author).catch(() => null);
    onAdd({ id: Date.now(), title: rec.title, author: rec.author, cover, rating: null, notes: "", genre: "General", pages: null, dateRead: new Date().toISOString().slice(0,7), status: "read" });
    await replaceRec(idx, recs);
  };

  const saveToRead = async (idx) => {
    const rec = recs[idx];
    if (rec.saved) return;
    setRecs(prev => prev.map((r, i) => i === idx ? { ...r, saved: true, replacing: true } : r));
    let cover = null;
    try { ({ cover } = await fetchBookMeta(rec.title, rec.author)); } catch {}
    setToRead(prev => [...prev, { id: Date.now(), title: rec.title, author: rec.author, cover, addedAt: new Date().toISOString() }]);
    showToast?.(`✓ Added "${rec.title}" to your reading list`);
    await replaceRec(idx, recs);
  };

  const copyPrompt = () => { navigator.clipboard.writeText(prompt); setCopied(true); showToast?.("✓ Prompt copied to clipboard"); setTimeout(() => setCopied(false), 2500); };

  useEffect(() => { generate(true); }, []);

  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <div style={{ flex: 1 }}><div className="modal-title">For You</div><div className="modal-sub">AI-Reasoned · Based on Your Actual Taste</div></div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {loading && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div className="spinner" />
            <div style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 4 }}>Analyzing your library…</div>
            <div style={{ fontSize: 11, color: "var(--ink4)" }}>This takes about 10 seconds</div>
          </div>
        )}
        {error && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</div>
            <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.8, marginBottom: 12 }}>
              No API key? Copy the prompt and paste it into <a href="https://claude.ai" target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>claude.ai</a> instead — it's free.
            </div>
            <button className="btn-ghost" style={{ width: "100%", padding: "10px 0" }} onClick={copyPrompt}>{copied ? "✓ Copied!" : "Copy Prompt for Claude.ai"}</button>
          </div>
        )}
        {tasteProfile && recs.length > 0 && (
          <>
            <div className="taste-profile">
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--cyan)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Your Taste Profile</div>
              <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.75 }}>{tasteProfile}</div>
            </div>
            {recs.map((rec, i) => (
              <div key={i} className="rec-card">
                {rec.replacing ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div className="spinner" style={{ margin: "0 auto 8px" }} />
                    <div style={{ fontSize: 11, color: "var(--ink4)" }}>Finding a fresh pick…</div>
                  </div>
                ) : (
                  <>
                    <div className="rec-header">
                      <div>
                        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 17, color: "var(--ink)" }}>{rec.title}</div>
                        <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>{rec.author}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        <div className="match-badge">{rec.match}% match</div>
                        <button
                          onClick={() => !rec.added && markRead(i)}
                          style={{ fontSize: 10, padding: "3px 10px", background: "var(--cyan-dim)", color: "var(--cyan)", border: "1px solid var(--cyan-mid)", borderRadius: 3, cursor: rec.added ? "default" : "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 600, whiteSpace: "nowrap", opacity: rec.added ? 0.6 : 1 }}
                        >{rec.added ? "✓ Added" : "✓ Already Read"}</button>
                        <button
                          onClick={() => saveToRead(i)}
                          style={{ fontSize: 10, padding: "3px 10px", background: rec.saved ? "#f0fdf4" : "var(--bg)", color: rec.saved ? "#16a34a" : "var(--ink3)", border: `1px solid ${rec.saved ? "#86efac" : "var(--border)"}`, borderRadius: 3, cursor: rec.saved ? "default" : "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}
                        >＋ To Read</button>
                      </div>
                    </div>
                    <div className="rec-reason">{rec.reason}</div>
                  </>
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn-ghost" style={{ flex: 1, padding: "10px 0" }} onClick={() => { recsCache = null; generate(false); }}>Regenerate</button>
              <button className="btn-ghost" style={{ flex: 1, padding: "10px 0" }} onClick={copyPrompt}>{copied ? "✓ Copied!" : "Copy Prompt"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── COVER FETCH HELPER ─────────────────────────────────────────────
async function fetchCover(title, author) {
  const search = async (q) => {
    const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5&fields=cover_i`);
    const d = await r.json();
    return d.docs?.find(doc => doc.cover_i)?.cover_i ?? null;
  };
  const cover_i = (await search(`${title} ${author}`)) ?? (await search(title));
  return cover_i ? `https://covers.openlibrary.org/b/id/${cover_i}-M.jpg` : null;
}

// ── BOOK META HELPER (cover + pages + author) ──────────────────────
async function fetchBookMeta(title, author) {
  const search = async (q) => {
    const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5&fields=cover_i,number_of_pages_median,author_name,subject`);
    const d = await r.json();
    const best = d.docs?.find(doc => doc.cover_i) ?? d.docs?.[0] ?? null;
    return best;
  };
  const doc = (await search(`${title} ${author}`)) ?? (await search(title));
  const cover = doc?.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null;
  const pages = doc?.number_of_pages_median || null;
  const foundAuthor = doc?.author_name?.[0] || null;
  const genre = pickGenre(doc?.subject || []);
  return { cover, pages, author: foundAuthor, genre };
}

// ── SCAN MODAL ─────────────────────────────────────────────────────
function ScanModal({ onClose, onAddMultiple, existingBooks = [] }) {
  const [stage, setStage] = useState("upload");
  const [preview, setPreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [found, setFound] = useState([]);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1600;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.85);
        setPreview(compressed);
        setImageData(compressed.split(",")[1]);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const scan = async () => {
    if (!imageData) return;
    setStage("scanning"); setError(null);
    try {
      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageData } },
            { type: "text", text: `Look at this bookshelf photo. Identify every book you can read from the spines. For each book provide the title, author, and genre. If the author isn't visible on the spine, use your knowledge to fill it in. Only use "Unknown" for author if you truly cannot determine it. For genre choose one of: Fiction, Non-Fiction, Mystery, Sci-Fi, Fantasy, Biography, History, Romance, Thriller, Self-Help, Science, Philosophy, Poetry, Horror, Children's, Graphic Novel, Classic, General. Respond ONLY with valid JSON (no markdown):\n{\n  "books": [\n    { "title": "...", "author": "...", "genre": "..." }\n  ]\n}` }
          ]}]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const now = Date.now();
      const existingTitles = new Set(existingBooks.map(b => b.title.toLowerCase()));
      const withCovers = await Promise.all(parsed.books.map(async (b, i) => {
        let cover = null, pages = null;
        try { ({ cover, pages } = await fetchBookMeta(b.title, b.author)); } catch {}
        const onShelf = existingTitles.has(b.title.toLowerCase());
        return { ...b, id: now + i, include: !onShelf, onShelf, cover, pages };
      }));
      setFound(withCovers);
      setStage("review");
    } catch {
      setError("Couldn't scan the photo. Make sure your API key is set and the image is clear.");
      setStage("upload");
    }
  };

  const toggle = (i) => setFound(f => f.map((b, j) => j === i ? { ...b, include: !b.include } : b));

  const addAll = () => {
    const toAdd = found.filter(b => b.include).map(b => ({ id: b.id, title: b.title, author: b.author, cover: b.cover || null, rating: null, notes: "", genre: b.genre || "General", pages: b.pages || null, dateRead: new Date().toISOString().slice(0,7), status: "read" }));
    if (toAdd.length) onAddMultiple(toAdd);
    onClose();
  };

  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <div><div className="modal-title">Scan Bookshelf</div><div className="modal-sub">Photo → AI reads spines → Books added instantly</div></div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {stage === "upload" && (
          <>
            <div
              onClick={() => fileRef.current.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              style={{ border: "2px dashed var(--border2)", borderRadius: 10, padding: "40px 20px", textAlign: "center", cursor: "pointer", marginBottom: 16 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--cyan)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border2)"}
            >
              {preview
                ? <img src={preview} alt="shelf" style={{ maxHeight: 220, maxWidth: "100%", borderRadius: 6, objectFit: "contain" }} />
                : <>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
                    <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 4 }}>Click or drag a photo of your bookshelf</div>
                    <div style={{ fontSize: 11, color: "var(--ink4)" }}>Works best with spines facing forward in good light</div>
                  </>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <button className="btn-primary" style={{ width: "100%", padding: "12px 0", fontSize: 13, opacity: imageData ? 1 : 0.4, cursor: imageData ? "pointer" : "not-allowed" }} onClick={() => imageData && scan()}>
              Scan with AI
            </button>
          </>
        )}
        {stage === "scanning" && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div className="spinner" />
            <div style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 6 }}>Reading your bookshelf…</div>
            <div style={{ fontSize: 11, color: "var(--ink4)" }}>This takes about 10 seconds</div>
          </div>
        )}
        {stage === "review" && (
          <>
            <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 16 }}>Found <strong>{found.length} books</strong>. Books already on your shelf are unchecked. Add the rest at once.</div>
            <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {found.map((b, i) => (
                <div key={i} onClick={() => toggle(i)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: b.include ? "var(--cyan-dim)" : "var(--bg)", border: `1.5px solid ${b.include ? "var(--cyan-mid)" : "var(--border)"}`, borderRadius: 6, cursor: "pointer", transition: "all 0.15s", minHeight: 68 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${b.include ? "var(--cyan)" : "var(--border2)"}`, background: b.include ? "var(--cyan)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {b.include && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                  </div>
                  <div style={{ width: 32, height: 46, flexShrink: 0, borderRadius: 3, overflow: "hidden", background: "var(--border)", border: "1px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                    {b.cover ? <img src={b.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📖"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 14, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>{b.author || "Unknown"}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                      <div style={{ fontSize: 10, color: "var(--cyan)", fontWeight: 600, letterSpacing: "0.06em" }}>{b.genre || "General"}</div>
                      {b.onShelf && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink4)", background: "var(--bg)", border: "1px solid var(--border2)", padding: "1px 6px", borderRadius: 2, textTransform: "uppercase" }}>On Shelf</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{ width: "100%", padding: "12px 0", fontSize: 13 }} onClick={addAll}>Add {found.filter(b => b.include).length} Books to Shelf</button>
            <button className="btn-ghost" style={{ width: "100%", marginTop: 8, padding: "10px 0" }} onClick={() => setStage("upload")}>Try a different photo</button>
          </>
        )}
      </div>
    </div>
  );
}


// ── CSV IMPORT MODAL ───────────────────────────────────────────────
// Client-side parseCSV kept as fallback for Amazon/generic formats.
// GoodReads imports now go through /api/import-csv for server-side parsing.
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, ""); // strip UTF-8 BOM
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { format: "unknown", rows: [], errorCount: 0 };
  const parseRow = (line) => {
    const cols = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
      else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ""; }
      else { cur += c; }
    }
    cols.push(cur.trim());
    return cols;
  };
  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  const get = (row, ...names) => {
    for (const n of names) {
      const i = headers.findIndex(h => h.includes(n));
      if (i >= 0 && i < row.length) return row[i] || "";
    }
    return "";
  };
  const hasAsin = headers.some(h => h.includes("asin"));
  const hasOrderId = headers.some(h => h.includes("order_id") || h === "orderid");
  const hasGoodreads = headers.some(h => h.includes("exclusive_shelf") || h.includes("my_rating"));
  let format = "generic";
  if (hasGoodreads) format = "goodreads";
  else if (hasAsin || hasOrderId) format = "amazon";

  let rows = [], errorCount = 0;
  if (format === "amazon") {
    rows = lines.slice(1).map(line => {
      try {
        const row = parseRow(line);
        const title = get(row, "title", "product_name");
        const category = get(row, "category", "product_category");
        const dateRaw = get(row, "order_date", "orderdate");
        if (!title || !category.toLowerCase().includes("kindle")) return null;
        let dateRead = new Date().toISOString().slice(0, 7);
        if (dateRaw) {
          const mdy = dateRaw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (mdy) dateRead = `${mdy[3]}-${mdy[1].padStart(2, "0")}`;
          else { const ymd = dateRaw.match(/(\d{4})[\/\-](\d{1,2})/); if (ymd) dateRead = `${ymd[1]}-${ymd[2].padStart(2, "0")}`; }
        }
        return { title, author: "Unknown", isbn: null, rating: null, pages: null, dateRead, status: "read", notes: null, include: true };
      } catch { errorCount++; return null; }
    }).filter(Boolean);
  } else {
    rows = lines.slice(1).map(line => {
      try {
        const row = parseRow(line);
        const title = get(row, "title");
        const author = get(row, "author");
        const ratingRaw = get(row, "my_rating", "rating");
        const dateRaw = get(row, "date_read", "dateread");
        const pagesRaw = get(row, "number_of_pages", "pages", "num_pages");
        if (!title) return null;
        const ratingNum = parseInt(ratingRaw) || 0;
        let dateRead = new Date().toISOString().slice(0, 7);
        if (dateRaw) {
          const m = dateRaw.match(/(\d{4})[\/\-](\d{1,2})/);
          if (m) dateRead = `${m[1]}-${m[2].padStart(2, "0")}`;
        }
        return { title, author: author || "Unknown", isbn: null, rating: ratingNum > 0 ? ratingNum : null, pages: parseInt(pagesRaw) || null, dateRead, status: "read", notes: null, include: true };
      } catch { errorCount++; return null; }
    }).filter(Boolean);
  }
  return { format, rows, errorCount };
}

// Normalize title+author for dedup comparison
function normalizeKey(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function ImportCSVModal({ onClose, onAddMultiple, onAddToRead, existingBooks = [], existingToRead = [] }) {
  const [stage, setStage] = useState("upload"); // "upload" | "review" | "importing" | "done"
  const [parsed, setParsed] = useState([]);
  const [csvFormat, setCsvFormat] = useState("generic");
  const [errorCount, setErrorCount] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [summary, setSummary] = useState(null); // { imported, skipped, toRead, errors }
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setUploadError(null);

    // 5MB guard — GoodReads exports are typically < 1MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File is too large (max 5MB). GoodReads exports are usually well under 1MB — make sure you're uploading the right file.");
      return;
    }

    setParsing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target.result;
      try {
        // Try server-side parser first (handles GoodReads + Amazon + generic)
        const res = await fetch("/api/import-csv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv: csvText }),
        });
        const data = await res.json();

        if (data.error) {
          setUploadError(data.error);
          setParsing(false);
          return;
        }

        if (!data.rows || data.rows.length === 0) {
          if (data.format === "amazon") setUploadError("No Kindle books found in this Amazon Order History CSV. Make sure your order report includes Kindle purchases.");
          else setUploadError("No books found. Make sure this is a GoodReads export (GoodReads → My Books → Tools → Export) or Amazon Order History CSV.");
          setParsing(false);
          return;
        }

        setCsvFormat(data.format);
        setErrorCount(data.errorCount || 0);
        setParsed(data.rows);
        setStage("review");
      } catch {
        // Server unavailable — fall back to client-side parser
        const { format, rows, errorCount: ec } = parseCSV(csvText);
        if (rows.length === 0) {
          setUploadError("No books found. Make sure this is a GoodReads export or Amazon Order History CSV.");
          setParsing(false);
          return;
        }
        setCsvFormat(format);
        setErrorCount(ec || 0);
        setParsed(rows);
        setStage("review");
      }
      setParsing(false);
    };
    reader.readAsText(file);
  };

  const toggle = (i) => setParsed(p => p.map((b, j) => j === i ? { ...b, include: !b.include } : b));

  const addAll = async () => {
    setFetching(true);
    setStage("importing");

    const selected = parsed.filter(b => b.include);

    // Separate "to-read" shelf items from read books
    const toReadItems = selected.filter(b => b.status === "to-read");
    const readItems = selected.filter(b => b.status !== "to-read");

    // Build lookup sets for dedup — prefer ISBN match, fall back to title+author
    const existingIsbns = new Set(existingBooks.filter(b => b.isbn).map(b => b.isbn));
    const existingKeys = new Set(existingBooks.map(b => normalizeKey(b.title + b.author)));

    let skipped = 0;
    const freshReadItems = readItems.filter(b => {
      if (b.isbn && existingIsbns.has(b.isbn)) { skipped++; return false; }
      if (existingKeys.has(normalizeKey(b.title + b.author))) { skipped++; return false; }
      return true;
    });

    const now = Date.now();

    // Fetch covers/metadata for fresh read books
    const withMeta = await Promise.all(freshReadItems.map(async (b, i) => {
      let cover = null, pages = b.pages, author = b.author, genre = "General";
      try {
        const meta = await fetchBookMeta(b.title, b.author);
        cover = meta.cover;
        if (!pages) pages = meta.pages;
        if (author === "Unknown" && meta.author) author = meta.author;
        if (meta.genre && meta.genre !== "General") genre = meta.genre;
      } catch {}
      return {
        id: now + i,
        title: b.title,
        author,
        isbn: b.isbn || null,
        cover,
        rating: b.rating,
        notes: b.notes || "",
        genre,
        pages,
        dateRead: b.dateRead,
        status: "read",
      };
    }));

    if (withMeta.length > 0) onAddMultiple(withMeta);

    // Handle to-read items — dedup against existing TBR list, add without fetching covers
    const existingToReadKeys = new Set(existingToRead.map(b => normalizeKey(b.title)));
    const freshToRead = toReadItems.filter(b => !existingToReadKeys.has(normalizeKey(b.title)));
    if (freshToRead.length > 0 && onAddToRead) {
      const toReadObjs = freshToRead.map((b, i) => ({
        id: now + withMeta.length + i,
        title: b.title,
        author: b.author,
        cover: null,
        addedAt: new Date().toISOString(),
      }));
      onAddToRead(toReadObjs);
    }

    setSummary({
      imported: withMeta.length,
      skipped,
      toRead: freshToRead.length,
      errors: errorCount,
    });
    setFetching(false);
    setStage("done");
  };

  const formatLabel = csvFormat === "amazon" ? "Amazon Order History" : csvFormat === "goodreads" ? "GoodReads Export" : "CSV Import";
  const formatColor = csvFormat === "amazon" ? "var(--amber)" : "var(--cyan)";

  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <div><div className="modal-title">Import CSV</div><div className="modal-sub">GoodReads · Amazon Order History · Any compatible export</div></div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* ── UPLOAD ── */}
        {stage === "upload" && (
          <>
            <div className="import-drop"
              onClick={() => fileRef.current.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--cyan)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border2)"}
            >
              {parsing ? (
                <>
                  <div className="spinner" style={{ width: 28, height: 28, margin: "0 auto 10px" }} />
                  <div style={{ fontSize: 13, color: "var(--ink3)" }}>Reading your file…</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
                  <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 4 }}>Click or drag a CSV file here</div>
                  <div style={{ fontSize: 11, color: "var(--ink4)" }}>GoodReads export · Amazon Order History</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            {uploadError && (
              <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 12, padding: "10px 14px", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 6, lineHeight: 1.7 }}>
                {uploadError}
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--ink4)", lineHeight: 1.9 }}>
              <strong style={{ color: "var(--ink3)" }}>GoodReads:</strong> My Books → Tools → Export Library<br />
              <strong style={{ color: "var(--ink3)" }}>Amazon:</strong> amazon.com/gp/b2b/reports → Order History Report → Kindle items auto-detected
            </div>
          </>
        )}

        {/* ── REVIEW ── */}
        {stage === "review" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 4, background: formatColor, color: csvFormat === "amazon" ? "#000" : "#fff", textTransform: "uppercase" }}>{formatLabel}</span>
              <span style={{ fontSize: 12, color: "var(--ink3)" }}>Found <strong>{parsed.length} book{parsed.length !== 1 ? "s" : ""}</strong>. Uncheck any to skip.</span>
            </div>
            {csvFormat === "amazon" && (
              <div style={{ fontSize: 11, color: "var(--ink4)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", marginBottom: 12 }}>
                📅 Dates shown are <strong>purchase dates</strong>. Authors will be looked up from OpenLibrary during import.
              </div>
            )}
            {parsed.some(b => b.status === "to-read") && (
              <div style={{ fontSize: 11, color: "var(--ink4)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", marginBottom: 12 }}>
                📋 Books from your GoodReads "to-read" shelf will be added to your <strong>To Read list</strong>, not your main shelf.
              </div>
            )}
            <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {parsed.map((b, i) => (
                <div key={i} onClick={() => toggle(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: b.include ? "var(--cyan-dim)" : "var(--bg)", border: `1.5px solid ${b.include ? "var(--cyan-mid)" : "var(--border)"}`, borderRadius: 6, cursor: "pointer", transition: "all 0.12s" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${b.include ? "var(--cyan)" : "var(--border2)"}`, background: b.include ? "var(--cyan)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {b.include && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                    <div style={{ fontSize: 10, color: "var(--ink3)" }}>
                      {b.author !== "Unknown" ? b.author : <em style={{ color: "var(--ink4)" }}>author via OpenLibrary</em>}
                      {b.rating ? ` · ${"★".repeat(Math.floor(b.rating))}${b.rating % 1 ? "½" : ""}` : ""}
                      {b.pages ? ` · ${b.pages}pp` : ""}
                      {b.status === "to-read" && <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink4)", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 3, padding: "1px 5px" }}>TO READ</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink4)", flexShrink: 0 }}>{b.dateRead}</div>
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{ width: "100%", padding: "12px 0", fontSize: 12 }} onClick={addAll}>
              Import {parsed.filter(b => b.include).length} Books
            </button>
            <button className="btn-ghost" style={{ width: "100%", marginTop: 8, padding: "10px 0" }} onClick={() => setStage("upload")}>Choose a different file</button>
          </>
        )}

        {/* ── IMPORTING (progress) ── */}
        {stage === "importing" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div className="spinner" />
            <div style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 4 }}>
              {csvFormat === "amazon" ? "Fetching covers & authors…" : "Fetching covers…"}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink4)" }}>This may take a moment for large libraries</div>
          </div>
        )}

        {/* ── DONE (result summary) ── */}
        {stage === "done" && summary && (
          <>
            <div style={{ textAlign: "center", padding: "12px 0 24px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, color: "var(--ink)", marginBottom: 20 }}>Import Complete</div>
              <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 2.2, textAlign: "left", display: "inline-block" }}>
                {summary.imported > 0 && <div>📖 <strong>{summary.imported}</strong> book{summary.imported !== 1 ? "s" : ""} added to your shelf</div>}
                {summary.toRead > 0 && <div>📋 <strong>{summary.toRead}</strong> book{summary.toRead !== 1 ? "s" : ""} added to your To Read list</div>}
                {summary.skipped > 0 && <div style={{ color: "var(--ink4)" }}>⊘ <strong>{summary.skipped}</strong> already on shelf — skipped</div>}
                {summary.errors > 0 && <div style={{ color: "var(--ink4)" }}>⚠ <strong>{summary.errors}</strong> row{summary.errors !== 1 ? "s" : ""} couldn't be imported</div>}
                {summary.imported === 0 && summary.toRead === 0 && <div style={{ color: "var(--ink4)" }}>No new books to add — everything was already on your shelf.</div>}
              </div>
            </div>
            <button className="btn-primary" style={{ width: "100%", padding: "12px 0" }} onClick={onClose}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── ADD TO READ MODAL ──────────────────────────────────────────────
function AddToReadModal({ onClose, onAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef();

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&sort=editions&limit=7&fields=key,title,author_name,cover_i,language`);
        const d = await r.json();
        const qLower = query.toLowerCase();
        const sorted = (d.docs || []).sort((a, b) => {
          const aEng = (a.language || []).includes("eng") ? 0 : 1;
          const bEng = (b.language || []).includes("eng") ? 0 : 1;
          if (aEng !== bEng) return aEng - bEng;
          const aTitle = (a.title || "").toLowerCase();
          const bTitle = (b.title || "").toLowerCase();
          return (aTitle === qLower ? 0 : aTitle.startsWith(qLower) ? 1 : 2) - (bTitle === qLower ? 0 : bTitle.startsWith(qLower) ? 1 : 2);
        });
        setResults(sorted);
      } catch { setResults([]); }
      setLoading(false);
    }, 380);
  }, [query]);

  const select = (r) => {
    const cover = r.cover_i ? `https://covers.openlibrary.org/b/id/${r.cover_i}-M.jpg` : null;
    onAdd({ id: Date.now(), title: r.title, author: r.author_name?.[0] || "Unknown", cover, addedAt: new Date().toISOString() });
    onClose();
  };

  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div><div className="modal-title">Add to To Read</div><div className="modal-sub">Search · Save for later</div></div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="field">
          <label className="label">Search Open Library</label>
          <input className="input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Title or author…" autoFocus />
        </div>
        {loading && <div style={{ fontSize: 11, color: "var(--ink4)", marginBottom: 12 }}>searching…</div>}
        {results.length > 0 && (
          <div className="autocomplete">
            {results.map((r, i) => (
              <div key={i} className="ac-item" onClick={() => select(r)}>
                <div className="ac-title">{r.title}</div>
                <div className="ac-author">{r.author_name?.[0] || "Unknown author"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── BOOK SEARCH INPUT ──────────────────────────────────────────────
function BookSearchInput({ value, onChange }) {
  const [query, setQuery] = useState(value?.title || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  // isSelected: true when a book has been chosen (either saved from before or just picked)
  // In selected state we don't fire live searches — user must clear first
  const [isSelected, setIsSelected] = useState(!!(value?.title));
  const timer = useRef();

  useEffect(() => {
    if (isSelected || !query || query.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5&fields=title,author_name`);
        const d = await r.json();
        // Deduplicate by title+author
        const seen = new Set();
        const deduped = (d.docs || []).filter(doc => {
          const key = (doc.title + "|" + (doc.author_name?.[0] || "")).toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setResults(deduped);
      } catch { setResults([]); }
      setLoading(false);
    }, 380);
  }, [query, isSelected]);

  const select = (result) => {
    const title = result.title;
    const author = result.author_name?.[0] || "";
    setQuery(title);
    setResults([]);
    setIsSelected(true);
    onChange({ title, author });
  };

  const clear = () => { setQuery(""); setResults([]); setIsSelected(false); onChange({ title: "", author: "" }); };

  return (
    <div style={{ flex: 1 }}>
      <div style={{ position: "relative" }}>
        <input
          className="input"
          placeholder="Search a book…"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsSelected(false); if (!e.target.value) clear(); }}
          style={{ width: "100%", paddingRight: value?.title ? 28 : undefined }}
        />
        {value?.title && (
          <button onClick={clear} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ink4)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
        )}
      </div>
      {loading && <div style={{ fontSize: 10, color: "var(--ink4)", padding: "3px 0" }}>searching…</div>}
      {value?.author && !results.length && (
        <div style={{ fontSize: 10, color: "var(--ink3)", padding: "3px 2px" }}>by {value.author}</div>
      )}
      {results.length > 0 && (
        <div className="autocomplete" style={{ marginBottom: 0 }}>
          {results.map((r, i) => (
            <div key={i} className="ac-item" onClick={() => select(r)}>
              <div className="ac-title">{r.title}</div>
              <div className="ac-author">{r.author_name?.[0] || "Unknown author"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── QUIZ MODAL ─────────────────────────────────────────────────────
function QuizModal({ onClose, onSave, initial }) {
  const [favBooks, setFavBooks] = useState(
    initial?.favBooks || Array(5).fill(null).map(() => ({ title: "", author: "" }))
  );
  const [topGenres, setTopGenres] = useState(initial?.topGenres || ["", "", ""]);

  const setBook = (i, book) =>
    setFavBooks(prev => prev.map((b, j) => j === i ? book : b));
  const setGenre = (i, val) =>
    setTopGenres(prev => prev.map((g, j) => j === i ? val : g));

  const save = () => { onSave({ favBooks, topGenres }); onClose(); };
  const hasContent = favBooks.some(b => b.title.trim()) || topGenres.some(Boolean);

  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Your Reading DNA</div>
            <div className="modal-sub">Shapes every AI recommendation you get</div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--cyan)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>5 Favorite Books of All Time</div>
          {favBooks.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "var(--ink4)", width: 18, flexShrink: 0, paddingTop: 10, textAlign: "right" }}>{i + 1}.</div>
              <BookSearchInput value={b} onChange={book => setBook(i, book)} />
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--cyan)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>Top 3 Genres — Ranked</div>
          {["1st", "2nd", "3rd"].map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "var(--ink4)", width: 28, flexShrink: 0 }}>{label}</div>
              <select className="input" style={{ flex: 1 }} value={topGenres[i]} onChange={e => setGenre(i, e.target.value)}>
                <option value="">— Pick a genre —</option>
                {GENRES.filter(g => g !== "General").filter(g => !topGenres.some((tg, j) => j !== i && tg === g) || g === topGenres[i]).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <button className="btn-primary" style={{ width: "100%", padding: "12px 0", opacity: hasContent ? 1 : 0.4, cursor: hasContent ? "pointer" : "not-allowed" }} onClick={() => hasContent && save()}>
          Save My Preferences
        </button>
        <button className="btn-ghost" style={{ width: "100%", marginTop: 8, padding: "10px 0" }} onClick={onClose}>
          {initial ? "Cancel" : "Skip for now"}
        </button>
      </div>
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────
export default function App() {
  const [books, setBooks] = useState(() => {
    try {
      const saved = localStorage.getItem("shelf-books");
      const loaded = saved ? JSON.parse(saved) : [];
      // Migrate: old integer rating 0 (unrated) → null; preserve 1–5 and floats
      return loaded.map(b => ({ ...b, rating: b.rating === 0 ? null : b.rating }));
    } catch { return []; }
  });
  const [toRead, setToRead] = useState(() => {
    try { return JSON.parse(localStorage.getItem("shelf-toread")) || []; } catch { return []; }
  });
  const [view, setView] = useState("shelf");
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date-added");
  const [filterGenre, setFilterGenre] = useState("");
  const [statsYear, setStatsYear] = useState("all");
  const [readingGoal, setReadingGoal] = useState(() => { try { return parseInt(localStorage.getItem("shelf-goal")) || 0; } catch { return 0; } });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const [quizData, setQuizData] = useState(() => {
    try { return JSON.parse(localStorage.getItem("shelf-quiz")); } catch { return null; }
  });

  useEffect(() => {
    try { localStorage.setItem("shelf-books", JSON.stringify(books)); }
    catch { /* storage full */ }
  }, [books]);

  useEffect(() => {
    try { localStorage.setItem("shelf-toread", JSON.stringify(toRead)); }
    catch { /* storage full */ }
  }, [toRead]);


  useEffect(() => {
    try { localStorage.setItem("shelf-goal", String(readingGoal)); } catch {}
  }, [readingGoal]);

  const saveQuiz = (data) => {
    try { localStorage.setItem("shelf-quiz", JSON.stringify(data)); } catch {}
    setQuizData(data);
  };

  const searched = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.author.toLowerCase().includes(search.toLowerCase())
  );

  const shelfGenres = [...new Set(books.map(b => b.genre).filter(Boolean))].sort();

  const filtered = [...searched]
    .filter(b => !filterGenre || (filterGenre === "__dnf__" ? b.status === "dnf" : b.genre === filterGenre))
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "author") return (a.author.split(" ").pop() || "").localeCompare(b.author.split(" ").pop() || "");
      if (sortBy === "rating-high") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "rating-low") return (a.rating || 0) - (b.rating || 0);
      if (sortBy === "date-read") return (b.dateRead || "").localeCompare(a.dateRead || "");
      return 0; // date-added = insertion order (newest first, we prepend)
    });

  // Year filter for stats
  const statYears = [...new Set(books.map(b => b.dateRead?.slice(0,4)).filter(Boolean))].sort((a,b) => b-a);
  const statBooks = statsYear === "all" ? books : books.filter(b => b.dateRead?.startsWith(statsYear));
  const readBooks = statBooks.filter(b => b.status !== "dnf");

  const ratedBooks = readBooks.filter(b => b.rating != null && b.rating > 0);
  const avg = ratedBooks.length ? (ratedBooks.reduce((a,b) => a+b.rating, 0)/ratedBooks.length).toFixed(1) : "—";
  const totalPg = readBooks.reduce((a,b) => a+(b.pages||0), 0);
  const genres = [...new Set(readBooks.map(b => b.genre))];

  // Reading goal
  const thisYear = new Date().getFullYear().toString();
  const thisYearBooks = books.filter(b => b.dateRead?.startsWith(thisYear));

  // Export CSV
  const exportCSV = () => {
    const headers = ["Title","Author","ISBN13","Rating","Date Read","Pages","Genre","Status","Notes"];
    const rows = books.map(b => [b.title, b.author, b.isbn || "", b.rating != null ? b.rating : "", b.dateRead || "", b.pages || "", b.genre || "", b.status || "read", b.notes || ""].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "my-shelf.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast(`✓ Exported ${books.length} book${books.length !== 1 ? "s" : ""} to my-shelf.csv`);
  };

  return (
    <>
      <style>{CSS}</style>

      <div style={{ position: "relative" }}>
        <header className="header">
          <div className="logo">
            <span className="logo-word">My Shelf <span>AI</span></span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="nav-pill">
              {[["shelf","shelf"],["to-read","to read"]].map(([v, label]) => (
                <button key={v} className={`nav-btn ${view===v?"active":""}`} onClick={() => setView(v)}>{label}</button>
              ))}
            </div>
            <div className="nav-pill">
              <button className={`nav-btn ${view==="stats"?"active":""}`} onClick={() => setView("stats")}>stats</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn-ghost" onClick={() => setModal("quiz")}>◈ Reading DNA</button>
            <button className="btn-ghost" onClick={() => setModal("import-csv")}>Import CSV</button>
            <button className="btn-ghost" onClick={exportCSV} disabled={books.length === 0}>Export CSV</button>
            <button className="btn-ghost" onClick={() => setModal("scan")}>📸 Scan Shelf</button>
          </div>
        </header>

        <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
          <div className="stat-bar">
            {[
              { label: "Books Read", value: readBooks.length },
              { label: "Avg Rating", value: readBooks.length ? avg + " ★" : "—" },
              { label: "Pages Read", value: totalPg > 0 ? totalPg.toLocaleString() : "—" },
              { label: "Genres", value: genres.length || "—" },
            ].map((s,i) => (
              <div key={i} className="stat-cell">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
              </div>
            ))}
          </div>

          {view === "shelf" && (
            <>
              <div className="search-row">
                <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your shelf…" style={{ maxWidth: 280 }} />
                <button className="btn-primary" onClick={() => setModal("add")}>+ Log Book</button>
                <button className="rec-btn" disabled={books.length < 2} title={books.length < 2 ? "Add at least 2 books to get recommendations" : ""} onClick={() => books.length >= 2 && setModal("rec")}>✦ Get AI Recs</button>
              </div>
              {books.length > 0 && (
                <>
                  <div className="filter-row">
                    <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                      <option value="date-added">Sort: Date Added</option>
                      <option value="date-read">Sort: Date Read</option>
                      <option value="rating-high">Sort: Highest Rated</option>
                      <option value="rating-low">Sort: Lowest Rated</option>
                      <option value="title">Sort: Title A–Z</option>
                      <option value="author">Sort: Author A–Z</option>
                    </select>
                    <button className={`filter-chip ${!filterGenre ? "active" : ""}`} onClick={() => setFilterGenre("")}>All</button>
                    {shelfGenres.map(g => (
                      <button key={g} className={`filter-chip ${filterGenre === g ? "active" : ""}`} onClick={() => setFilterGenre(filterGenre === g ? "" : g)}>{g}</button>
                    ))}
                    {books.some(b => b.status === "dnf") && (
                      <button className={`filter-chip ${filterGenre === "__dnf__" ? "active" : ""}`} onClick={() => setFilterGenre(filterGenre === "__dnf__" ? "" : "__dnf__")}>DNF</button>
                    )}
                  </div>
                  {readingGoal === 0 && !editingGoal && books.length >= 3 && (
                    <div style={{ fontSize: 11, color: "var(--ink4)", marginBottom: 12 }}>
                      <button onClick={() => { setGoalInput(""); setEditingGoal(true); }} style={{ background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 11, padding: 0, textDecoration: "underline" }}>Set a {thisYear} reading goal</button>
                    </div>
                  )}
                  {readingGoal > 0 && (
                    <div className="goal-bar-wrap">
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink4)", letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        {thisYear} Goal
                      </div>
                      <div className="goal-track">
                        <div className="goal-fill" style={{ width: `${Math.min(100, (thisYearBooks.length / readingGoal) * 100)}%` }} />
                      </div>
                      <div style={{ fontSize: 12, color: thisYearBooks.length >= readingGoal ? "#16a34a" : "var(--ink3)", whiteSpace: "nowrap", fontWeight: 600 }}>
                        {thisYearBooks.length} / {readingGoal}{thisYearBooks.length >= readingGoal ? " 🎉" : ""}
                      </div>
                      <button onClick={() => { setGoalInput(String(readingGoal)); setEditingGoal(true); }} style={{ fontSize: 10, padding: "3px 8px", background: "none", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer", color: "var(--ink4)", fontFamily: "'Inter', sans-serif" }}>edit</button>
                    </div>
                  )}
                  {editingGoal && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, padding: "12px 16px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--ink3)", whiteSpace: "nowrap" }}>Books to read in {thisYear}:</span>
                      <input type="number" min="1" max="365" className="input" value={goalInput} onChange={e => setGoalInput(e.target.value)} style={{ width: 80, padding: "6px 10px" }} autoFocus />
                      <button className="btn-primary" style={{ padding: "6px 16px", fontSize: 11 }} onClick={() => { setReadingGoal(parseInt(goalInput) || 0); setEditingGoal(false); }}>Set</button>
                      <button className="btn-ghost" style={{ padding: "5px 12px" }} onClick={() => setEditingGoal(false)}>Cancel</button>
                    </div>
                  )}
                </>
              )}
              {books.length === 0 ? (
                !quizData ? (
                  // ── Step 1: No DNA yet — show hero and prompt quiz ──
                  <div className="onboarding">
                    <div className="onboarding-title">Your reading life,<br />finally organised.</div>
                    <div className="onboarding-sub">
                      Track every book you've read, rate them, leave notes, and get AI recommendations tuned to your actual taste — not an algorithm's guess.
                    </div>
                    <div className="onboarding-features">
                      <div className="onboarding-feature">
                        <div className="onboarding-feature-icon">📖</div>
                        <div className="onboarding-feature-label">Track</div>
                        <div className="onboarding-feature-desc">Log books, rate them, and keep notes on what you thought.</div>
                      </div>
                      <div className="onboarding-feature">
                        <div className="onboarding-feature-icon">✦</div>
                        <div className="onboarding-feature-label">AI Recs</div>
                        <div className="onboarding-feature-desc">Get recommendations based on your real taste, not popularity.</div>
                      </div>
                      <div className="onboarding-feature">
                        <div className="onboarding-feature-icon">📊</div>
                        <div className="onboarding-feature-label">Stats</div>
                        <div className="onboarding-feature-desc">See your reading pace, favourite genres, and top authors.</div>
                      </div>
                    </div>
                    <div className="onboarding-actions">
                      <button className="btn-primary" style={{ fontSize: 13, padding: "11px 32px" }} onClick={() => setModal("quiz")}>Get Started →</button>
                      <button className="btn-ghost" style={{ fontSize: 12, padding: "9px 24px" }} onClick={() => setModal("import-csv")}>Already have books? Import from Goodreads</button>
                    </div>
                  </div>
                ) : (
                  // ── Step 2: DNA saved — prompt to add books ──
                  <div className="onboarding">
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--cyan-dim)", border: "1.5px solid var(--cyan-mid)", borderRadius: 20, padding: "5px 14px", marginBottom: 22, fontSize: 11, fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      ✓ Reading DNA saved
                    </div>
                    <div className="onboarding-title" style={{ fontSize: 32 }}>Now let's build<br />your shelf.</div>
                    <div className="onboarding-sub" style={{ marginBottom: 28 }}>
                      Add the books you've read and we'll use your Reading DNA to power personalised AI recommendations.
                    </div>
                    <div className="onboarding-actions">
                      <button className="btn-primary" style={{ fontSize: 13, padding: "11px 32px" }} onClick={() => setModal("add")}>+ Log your first book</button>
                      <button className="btn-ghost" style={{ fontSize: 12, padding: "9px 24px" }} onClick={() => setModal("import-csv")}>Import from Goodreads or Amazon</button>
                    </div>
                  </div>
                )
              ) : filtered.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">🔍</div>
                  <div className="empty-title">No matches</div>
                  <div style={{ fontSize: 13, color: "var(--ink3)", marginTop: 8 }}>Try a different search or filter.</div>
                </div>
              ) : (
                <div className="book-grid">
                  {filtered.map(b => <BookCard key={b.id} book={b} onClick={b => setModal(b)} onDelete={id => setBooks(p => p.filter(b => b.id !== id))} onRate={(id, r) => setBooks(p => p.map(x => x.id === id ? {...x, rating: r} : x))} />)}
                </div>
              )}
            </>
          )}

          {view === "stats" && (
            <div style={{ display: "grid", gap: 16 }}>
              {statYears.length > 0 && (
                <div className="year-filter">
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink4)", letterSpacing: "0.12em", textTransform: "uppercase", marginRight: 4 }}>Filter:</span>
                  <button className={`year-btn ${statsYear === "all" ? "active" : ""}`} onClick={() => setStatsYear("all")}>All Time</button>
                  {statYears.map(y => (
                    <button key={y} className={`year-btn ${statsYear === y ? "active" : ""}`} onClick={() => setStatsYear(y)}>{y}</button>
                  ))}
                </div>
              )}
              <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, padding: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink4)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>Rating Distribution</div>
                {[5,4,3,2,1].map(r => {
                  const count = readBooks.filter(b => b.rating != null && Math.round(b.rating) === r).length;
                  const pct = readBooks.length ? (count/readBooks.length)*100 : 0;
                  return (
                    <div key={r} className="bar-row">
                      <div style={{ width: 14, textAlign: "right", color: "var(--amber)", fontSize: 14 }}>{r}</div>
                      <span style={{ color: "var(--amber)", fontSize: 13 }}>★</span>
                      <div className="bar-track"><div className="bar-fill amber" style={{ width: `${pct}%` }} /></div>
                      <div style={{ width: 20, textAlign: "right", color: "var(--ink3)", fontSize: 12 }}>{count}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, padding: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink4)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>Genre Breakdown</div>
                {genres.length === 0 && <div style={{ fontSize: 12, color: "var(--ink4)" }}>{statsYear === "all" ? "No books yet" : `No books read in ${statsYear}`}</div>}
                {genres.map(g => {
                  const count = readBooks.filter(b => b.genre===g).length;
                  const pct = readBooks.length ? (count/readBooks.length)*100 : 0;
                  return (
                    <div key={g} className="bar-row">
                      <div style={{ width: 110, fontSize: 11, color: "var(--ink2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g}</div>
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                      <div style={{ width: 20, textAlign: "right", color: "var(--ink3)", fontSize: 12 }}>{count}</div>
                    </div>
                  );
                })}
              </div>
              {/* Top Authors */}
              {(() => {
                const authorCounts = {};
                readBooks.forEach(b => { if (b.author) authorCounts[b.author] = (authorCounts[b.author] || 0) + 1; });
                const topAuthors = Object.entries(authorCounts).sort((a,b) => b[1]-a[1]).slice(0, 8);
                const maxCount = topAuthors[0]?.[1] || 1;
                return topAuthors.length > 1 ? (
                  <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, padding: 24 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink4)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>Top Authors</div>
                    {topAuthors.map(([author, count]) => (
                      <div key={author} className="bar-row">
                        <div style={{ width: 130, fontSize: 11, color: "var(--ink2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{author}</div>
                        <div className="bar-track"><div className="bar-fill" style={{ width: `${(count/maxCount)*100}%` }} /></div>
                        <div style={{ width: 20, textAlign: "right", color: "var(--ink3)", fontSize: 12 }}>{count}</div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}

              {/* Books by Month */}
              {(() => {
                const displayYear = statsYear === "all" ? thisYear : statsYear;
                const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                const monthlyCounts = months.map((m, i) => {
                  const key = `${displayYear}-${String(i+1).padStart(2,"0")}`;
                  return { m, count: readBooks.filter(b => b.dateRead?.startsWith(key)).length };
                });
                const maxM = Math.max(...monthlyCounts.map(x => x.count), 1);
                const hasMonthData = monthlyCounts.some(x => x.count > 0);
                return hasMonthData ? (
                  <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, padding: 24 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink4)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>Books by Month — {displayYear}</div>
                    {monthlyCounts.map(({ m, count }) => (
                      <div key={m} className="bar-row">
                        <div style={{ width: 30, fontSize: 11, color: "var(--ink2)" }}>{m}</div>
                        <div className="bar-track"><div className="bar-fill" style={{ width: `${(count/maxM)*100}%` }} /></div>
                        <div style={{ width: 20, textAlign: "right", color: "var(--ink3)", fontSize: 12 }}>{count || ""}</div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}

              <div className="tier-bar-wrap">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink4)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Free Tier Usage</div>
                  <div style={{ fontSize: 12, color: books.length > 40 ? "var(--red)" : "var(--ink3)" }}>{books.length} / 50 books</div>
                </div>
                <div className="tier-progress">
                  <div className="tier-fill" style={{ width: `${(books.length/50)*100}%`, background: books.length > 40 ? "linear-gradient(90deg, #ef4444, #f87171)" : "linear-gradient(90deg, var(--cyan), var(--cyan-mid))" }} />
                </div>
                {books.length > 40 && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 10 }}>Almost at limit — upgrade for unlimited shelving</div>}
                {readingGoal === 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 11, color: "var(--ink4)" }}>Set a reading goal for {thisYear}</div>
                    <button className="btn-ghost" style={{ padding: "4px 12px", fontSize: 10 }} onClick={() => { setView("shelf"); setGoalInput(""); setEditingGoal(true); }}>Set Goal</button>
                  </div>
                )}
              </div>
            </div>
          )}
          {view === "to-read" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink4)", letterSpacing: "0.14em", textTransform: "uppercase" }}>{toRead.length} book{toRead.length !== 1 ? "s" : ""} saved</div>
                <button className="btn-primary" onClick={() => setModal("add-toread")}>+ Add to List</button>
              </div>
              {toRead.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">📋</div>
                  <div className="empty-title">Nothing saved yet</div>
                  <div style={{ fontSize: 13, color: "var(--ink3)", maxWidth: 320, margin: "8px auto 0", lineHeight: 1.8 }}>
                    Save books you want to read later. Get AI recommendations, then save the ones that catch your eye.
                  </div>
                  <button className="btn-primary" style={{ marginTop: 24, fontSize: 13, padding: "10px 28px" }} onClick={() => setModal("add-toread")}>
                    Add your first book
                  </button>
                </div>
              ) : (
                <div className="toread-grid">
                  {toRead.map(b => (
                      <div key={b.id} className="toread-card">
                        <button className="toread-remove" onClick={() => setToRead(p => p.filter(x => x.id !== b.id))} title="Remove">✕</button>
                        <div className="toread-cover">
                          {b.cover ? <img src={b.cover} alt="" onError={e => { e.target.style.display="none"; e.target.parentNode.textContent="📖"; }} /> : "📖"}
                        </div>
                        <div>
                          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 14, color: "var(--ink)", lineHeight: 1.3, marginBottom: 2 }}>{b.title}</div>
                          <div style={{ fontSize: 11, color: "var(--ink3)" }}>{b.author}</div>
                        </div>
                        <button
                          className="btn-ghost"
                          style={{ width: "100%", padding: "6px 0", fontSize: 10, marginTop: "auto" }}
                          onClick={() => setModal({ ...b, markAsRead: true })}
                        >Mark as Read</button>
                      </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {modal === "quiz" && <QuizModal onClose={() => setModal(null)} onSave={saveQuiz} initial={quizData} />}
      {modal === "add" && <AddModal onClose={() => setModal(null)} existingBooks={books} onAdd={b => { setBooks(p => [b,...p]); setModal(null); }} onAddMultiple={newBooks => { setBooks(p => [...newBooks, ...p]); setModal(null); }} />}
      {modal === "add-toread" && <AddToReadModal onClose={() => setModal(null)} onAdd={b => setToRead(p => [b, ...p])} />}
      {modal === "scan" && <ScanModal onClose={() => setModal(null)} onAddMultiple={newBooks => setBooks(p => [...newBooks, ...p])} existingBooks={books} />}
      {modal === "import-csv" && <ImportCSVModal onClose={() => setModal(null)} existingBooks={books} existingToRead={toRead} onAddMultiple={newBooks => setBooks(p => [...newBooks, ...p])} onAddToRead={newToRead => setToRead(p => [...newToRead, ...p])} />}
      {modal === "rec" && <RecsModal books={books} onClose={() => setModal(null)} onAdd={b => setBooks(p => [b, ...p])} quizData={quizData} toRead={toRead} setToRead={setToRead} showToast={showToast} />}
      {modal?.id && !modal?.addedAt && <DetailModal book={modal} onClose={() => setModal(null)} onUpdate={b => setBooks(p => p.map(x => x.id === b.id ? b : x))} />}
      {modal?.markAsRead && (
        <AddModal
          onClose={() => setModal(null)}
          prefill={modal}
          onAdd={b => {
            setBooks(p => [b,...p]);
            setToRead(p => p.filter(x => x.id !== modal.id));
            setModal(null);
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
