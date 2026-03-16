import { useState, useEffect, useRef } from "react";

// Module-level recs cache — persists while tab is open, cleared on regenerate
let recsCache = null; // { tasteProfile, recs, bookCount }

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@300;400;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #f5f7fa;
    --surface:  #ffffff;
    --border:   #dde3ec;
    --border2:  #c8d2e0;
    --cyan:     #00b4d8;
    --cyan-dim: #e0f7fc;
    --cyan-mid: #90e0ef;
    --amber:    #f59e0b;
    --red:      #ef4444;
    --ink:      #0f172a;
    --ink2:     #334155;
    --ink3:     #64748b;
    --ink4:     #94a3b8;
    --grid-col: rgba(0,180,216,0.06);
  }

  body { background: var(--bg); color: var(--ink); font-family: 'JetBrains Mono', monospace; }

  .scanlines {
    position: fixed; inset: 0; pointer-events: none; z-index: 9999;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.018) 2px, rgba(0,0,0,0.018) 4px);
  }
  .grid-bg {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image: linear-gradient(var(--grid-col) 1px, transparent 1px), linear-gradient(90deg, var(--grid-col) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  .orbit-ring { position: fixed; pointer-events: none; z-index: 1; border: 1px solid rgba(0,180,216,0.07); border-radius: 50%; }

  .header {
    position: sticky; top: 0; z-index: 200;
    background: rgba(245,247,250,0.92); backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border); height: 58px;
    display: flex; align-items: center; justify-content: space-between; padding: 0 28px;
  }
  .logo { display: flex; align-items: baseline; gap: 10px; }
  .logo-word { font-family: 'DM Serif Display', serif; font-size: 22px; color: var(--ink); letter-spacing: -0.02em; }
  .logo-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: var(--cyan); border: 1.5px solid var(--cyan); padding: 2px 7px; border-radius: 2px; text-transform: uppercase; }
  .nav-pill { display: flex; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
  .nav-btn { background: none; border: none; padding: 6px 16px; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; color: var(--ink3); transition: all 0.15s; }
  .nav-btn:hover { color: var(--ink); background: var(--bg); }
  .nav-btn.active { background: var(--ink); color: #fff; }

  .btn-primary { background: var(--cyan); color: var(--surface); border: none; border-radius: 5px; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; padding: 8px 18px; cursor: pointer; transition: background 0.15s, transform 0.1s; text-transform: uppercase; box-shadow: 0 2px 8px rgba(0,180,216,0.25); }
  .btn-primary:hover { background: #0096c7; transform: translateY(-1px); }
  .btn-ghost { background: none; border: 1.5px solid var(--border2); border-radius: 5px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; padding: 6px 14px; cursor: pointer; color: var(--ink3); transition: all 0.15s; text-transform: uppercase; }
  .btn-ghost:hover { border-color: var(--cyan); color: var(--cyan); }

  .stat-bar { display: grid; grid-template-columns: repeat(4, 1fr); background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .stat-cell { padding: 18px 22px; border-right: 1px solid var(--border); position: relative; }
  .stat-cell:last-child { border-right: none; }
  .stat-cell::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--cyan), var(--cyan-mid)); opacity: 0; }
  .stat-cell:hover::before { opacity: 1; }
  .stat-label { font-size: 9px; font-weight: 600; color: var(--ink4); letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 6px; }
  .stat-value { font-family: 'DM Serif Display', serif; font-size: 28px; color: var(--ink); line-height: 1; }

  .search-row { display: flex; gap: 10px; margin-bottom: 24px; }
  .search-input { flex: 1; padding: 10px 14px; background: var(--surface); border: 1.5px solid var(--border); border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--ink); outline: none; transition: border-color 0.15s; }
  .search-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(0,180,216,0.1); }
  .search-input::placeholder { color: var(--ink4); }
  .rec-btn { padding: 10px 22px; border-radius: 6px; border: 1.5px solid var(--cyan); background: var(--cyan-dim); color: var(--cyan); font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; text-transform: uppercase; transition: all 0.15s; white-space: nowrap; }
  .rec-btn:hover:not(:disabled) { background: var(--cyan); color: #fff; box-shadow: 0 2px 12px rgba(0,180,216,0.3); }
  .rec-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px,1fr)); gap: 14px; }
  .book-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 10px; padding: 16px; cursor: pointer; display: flex; gap: 14px; transition: all 0.18s; position: relative; overflow: hidden; }
  .book-card::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--cyan), var(--cyan-mid)); transform: scaleX(0); transition: transform 0.2s; }
  .book-card:hover { border-color: var(--cyan-mid); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,180,216,0.12); }
  .book-card:hover::after { transform: scaleX(1); }
  .book-cover { width: 58px; height: 84px; flex-shrink: 0; border-radius: 4px; overflow: hidden; background: var(--bg); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 24px; }
  .book-cover img { width: 100%; height: 100%; object-fit: cover; }
  .book-title { font-family: 'DM Serif Display', serif; font-size: 15px; color: var(--ink); margin-bottom: 2px; line-height: 1.3; }
  .book-author { font-size: 11px; color: var(--ink3); margin-bottom: 8px; }
  .book-notes { font-size: 11px; color: var(--ink4); line-height: 1.6; margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-style: italic; }
  .genre-tag { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--cyan); background: var(--cyan-dim); padding: 2px 8px; border-radius: 2px; }

  .stars { display: flex; gap: 3px; }
  .star { font-size: 22px; transition: color 0.1s; cursor: default; line-height: 1; }
  .star.interactive { cursor: pointer; }
  .star.lit { color: var(--amber); }
  .star.dim { color: #e2e8f0; }

  .backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(6px); z-index: 500; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.18s ease; }
  @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
  .modal { background: var(--surface); border: 1.5px solid var(--border); border-radius: 14px; padding: 32px; width: min(500px, 94vw); max-height: 88vh; overflow-y: auto; box-shadow: 0 24px 60px rgba(0,0,0,0.18); animation: slideUp 0.2s ease; }
  .modal-wide { width: min(620px, 94vw); }
  @keyframes slideUp { from { opacity:0; transform: translateY(16px) } to { opacity:1; transform: translateY(0) } }
  .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 26px; }
  .modal-title { font-family: 'DM Serif Display', serif; font-size: 24px; color: var(--ink); }
  .modal-sub { font-size: 10px; color: var(--ink4); letter-spacing: 0.14em; text-transform: uppercase; margin-top: 3px; }
  .close-btn { background: none; border: none; font-size: 22px; color: var(--ink4); cursor: pointer; line-height: 1; padding: 0 4px; }
  .close-btn:hover { color: var(--ink); }

  .field { margin-bottom: 18px; }
  .label { display: block; font-size: 10px; font-weight: 600; color: var(--ink3); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 7px; }
  .input { width: 100%; padding: 10px 13px; background: var(--bg); border: 1.5px solid var(--border); border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--ink); outline: none; transition: border-color 0.15s; }
  .input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(0,180,216,0.1); background: #fff; }
  .input::placeholder { color: var(--ink4); }
  textarea.input { resize: vertical; line-height: 1.7; min-height: 90px; }

  .autocomplete { border: 1.5px solid var(--border); border-radius: 6px; overflow: hidden; margin-bottom: 18px; }
  .ac-item { padding: 10px 14px; cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.1s; }
  .ac-item:last-child { border-bottom: none; }
  .ac-item:hover { background: var(--cyan-dim); }
  .ac-title { font-size: 13px; color: var(--ink); font-family: 'DM Serif Display', serif; }
  .ac-author { font-size: 11px; color: var(--ink3); margin-top: 1px; }

  .taste-profile { background: linear-gradient(135deg, #e0f7fc, #f0fdf4); border: 1.5px solid var(--cyan-mid); border-radius: 8px; padding: 18px; margin-bottom: 22px; position: relative; overflow: hidden; }
  .taste-profile::before { content: '◈'; position: absolute; right: 14px; top: 12px; font-size: 28px; color: var(--cyan); opacity: 0.15; }
  .rec-card { background: transparent; border: none; border-top: 1.5px solid var(--border); padding: 16px 0; margin-bottom: 0; transition: none; }
  .rec-card:first-of-type { border-top: none; }
  .rec-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .match-badge { background: linear-gradient(135deg, var(--cyan), #0096c7); color: #fff; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 3px; flex-shrink: 0; margin-left: 12px; letter-spacing: 0.06em; }
  .rec-reason { font-size: 12px; color: var(--ink3); line-height: 1.7; border-top: 1px solid var(--border); padding-top: 10px; margin-top: 6px; }

  .spinner { width: 36px; height: 36px; border: 2.5px solid var(--border); border-top-color: var(--cyan); border-radius: 50%; animation: spin 0.7s linear infinite; margin: 0 auto 14px; }
  @keyframes spin { to { transform: rotate(360deg) } }

  .bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .bar-track { flex: 1; height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden; border: 1px solid var(--border); }
  .bar-fill { height: 100%; background: linear-gradient(90deg, var(--cyan), var(--cyan-mid)); border-radius: 4px; transition: width 0.7s cubic-bezier(.4,0,.2,1); }
  .bar-fill.amber { background: linear-gradient(90deg, var(--amber), #fbbf24); }

  .stack-section { background: var(--surface); border: 1.5px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 14px; }
  .stack-num { font-size: 9px; font-weight: 700; color: var(--cyan); letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 12px; }
  .stack-item { display: flex; gap: 10px; margin-bottom: 8px; font-size: 12px; color: var(--ink2); line-height: 1.6; }
  .stack-dash { color: var(--cyan); flex-shrink: 0; }

  .empty { text-align: center; padding: 80px 0; color: var(--ink4); }
  .empty-icon { font-size: 52px; margin-bottom: 16px; }
  .empty-title { font-family: 'DM Serif Display', serif; font-size: 22px; color: var(--ink3); margin-bottom: 8px; }

  .onboarding { max-width: 520px; margin: 60px auto; text-align: center; padding: 0 16px; }
  .onboarding-title { font-family: 'DM Serif Display', serif; font-size: 42px; color: var(--ink); line-height: 1.15; margin-bottom: 14px; }
  .onboarding-sub { font-size: 14px; color: var(--ink3); line-height: 1.8; margin-bottom: 36px; max-width: 380px; margin-left: auto; margin-right: auto; }
  .onboarding-features { display: flex; justify-content: center; gap: 12px; margin-bottom: 36px; flex-wrap: wrap; }
  .onboarding-feature { background: var(--surface); border: 1.5px solid var(--border); border-radius: 10px; padding: 16px 18px; width: 140px; }
  .onboarding-feature-icon { font-size: 22px; margin-bottom: 8px; }
  .onboarding-feature-label { font-size: 11px; font-weight: 700; color: var(--ink2); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 4px; }
  .onboarding-feature-desc { font-size: 11px; color: var(--ink4); line-height: 1.6; }
  .onboarding-actions { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  @media (max-width: 640px) {
    .onboarding-title { font-size: 32px; }
    .onboarding-feature { width: 120px; padding: 14px 12px; }
  }

  .tier-bar-wrap { background: var(--surface); border: 1.5px solid var(--border); border-radius: 8px; padding: 18px 22px; margin-top: 16px; }
  .tier-progress { height: 10px; background: var(--bg); border-radius: 5px; overflow: hidden; border: 1px solid var(--border); margin-top: 10px; }
  .tier-fill { height: 100%; border-radius: 5px; transition: width 0.6s ease; }

  .year-filter { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; align-items: center; }
  .year-btn { background: none; border: 1.5px solid var(--border); border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; padding: 5px 12px; cursor: pointer; color: var(--ink3); transition: all 0.15s; text-transform: uppercase; }
  .year-btn:hover { border-color: var(--cyan); color: var(--cyan); }
  .year-btn.active { background: var(--ink); color: #fff; border-color: var(--ink); }

  .toread-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
  .toread-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; position: relative; transition: all 0.18s; }
  .toread-card:hover { border-color: var(--cyan-mid); box-shadow: 0 4px 16px rgba(0,180,216,0.1); }
  .toread-cover { width: 100%; height: 120px; border-radius: 6px; overflow: hidden; background: var(--bg); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 36px; }
  .toread-cover img { width: 100%; height: 100%; object-fit: cover; }
  .toread-remove { position: absolute; top: 8px; right: 8px; background: none; border: none; color: var(--ink4); cursor: pointer; font-size: 14px; line-height: 1; padding: 2px 5px; border-radius: 3px; }
  .toread-remove:hover { color: var(--red); background: #fef2f2; }

  .import-drop { border: 2px dashed var(--border2); border-radius: 10px; padding: 36px 20px; text-align: center; cursor: pointer; margin-bottom: 16px; transition: border-color 0.15s; }
  .import-drop:hover { border-color: var(--cyan); }

  .filter-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
  .filter-chip { background: none; border: 1.5px solid var(--border); border-radius: 20px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; letter-spacing: 0.06em; padding: 4px 12px; cursor: pointer; color: var(--ink3); transition: all 0.15s; text-transform: uppercase; white-space: nowrap; }
  .filter-chip:hover { border-color: var(--cyan); color: var(--cyan); }
  .filter-chip.active { background: var(--ink); color: #fff; border-color: var(--ink); }
  .sort-select { background: var(--surface); border: 1.5px solid var(--border); border-radius: 5px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; color: var(--ink3); padding: 5px 10px; cursor: pointer; outline: none; appearance: none; padding-right: 24px; }
  .goal-bar-wrap { background: var(--surface); border: 1.5px solid var(--border); border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; gap: 14px; }
  .goal-track { flex: 1; height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden; border: 1px solid var(--border); }
  .goal-fill { height: 100%; background: linear-gradient(90deg, var(--cyan), var(--cyan-mid)); border-radius: 4px; transition: width 0.7s cubic-bezier(.4,0,.2,1); }
  .dup-warning { background: #fffbeb; border: 1.5px solid #fbbf24; border-radius: 6px; padding: 10px 14px; font-size: 11px; color: #92400e; margin-bottom: 14px; }

  .dnf-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink4); background: var(--bg); border: 1.5px solid var(--border2); padding: 2px 8px; border-radius: 2px; }
  .status-toggle { display: flex; border: 1.5px solid var(--border); border-radius: 6px; overflow: hidden; margin-bottom: 18px; }
  .status-btn { flex: 1; background: none; border: none; padding: 9px 0; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; cursor: pointer; color: var(--ink3); transition: all 0.15s; }
  .status-btn.active-read { background: var(--cyan); color: #fff; }
  .status-btn.active-dnf { background: var(--ink3); color: #fff; }

  @media (max-width: 640px) {
    .stat-bar { grid-template-columns: repeat(2, 1fr); }
    .stat-cell:nth-child(2) { border-right: none; }
    .stat-cell:nth-child(3) { border-top: 1px solid var(--border); }
    .stat-cell:nth-child(4) { border-top: 1px solid var(--border); border-right: none; }
    .header { height: auto; min-height: 58px; padding: 10px 16px; flex-wrap: wrap; row-gap: 8px; }
    .search-row { flex-wrap: wrap; }
    .search-row .search-input { max-width: none !important; flex: 1 0 100%; }
    .filter-row { overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; padding-bottom: 4px; }
    .modal { padding: 22px 18px; }
  }

  .toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); background: var(--ink); color: #fff; padding: 10px 22px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; z-index: 9999; pointer-events: none; animation: toast-in 0.2s ease; }
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
function Stars({ rating, interactive = false, onChange }) {
  const [hover, setHover] = useState(0);
  const ref = useRef();
  const starFromTouch = (e) => {
    const touch = e.touches[0] || e.changedTouches[0];
    const el = ref.current;
    if (!el || !touch) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(5, Math.max(1, Math.ceil((touch.clientX - rect.left) / (rect.width / 5))));
  };
  return (
    <div className="stars" ref={ref}
      onTouchMove={interactive ? e => setHover(starFromTouch(e)) : undefined}
      onTouchEnd={interactive ? e => { const s = starFromTouch(e); if (s) onChange?.(s); setHover(0); } : undefined}
    >
      {[1,2,3,4,5].map(i => (
        <span key={i}
          className={`star ${interactive ? "interactive" : ""} ${i <= (hover || rating) ? "lit" : "dim"}`}
          onClick={() => interactive && onChange?.(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
        >★</span>
      ))}
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
            <button onClick={() => onDelete(book.id)} style={{ fontSize: 10, padding: "3px 8px", background: "var(--red)", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>Yes</button>
            <button onClick={() => setConfirming(false)} style={{ fontSize: 10, padding: "3px 8px", background: "var(--bg)", color: "var(--ink3)", border: "1px solid var(--border)", borderRadius: 3, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>No</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} style={{ fontSize: 13, padding: "2px 7px", background: "none", color: "var(--ink4)", border: "1px solid transparent", borderRadius: 3, cursor: "pointer", lineHeight: 1 }} title="Remove book">✕</button>
        )}
      </div>
    </div>
  );
}

// ── ADD BOOK MODAL ─────────────────────────────────────────────────
function AddModal({ onClose, onAdd, prefill, existingBooks = [] }) {
  const [query, setQuery] = useState(prefill?.title || "");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(prefill ? { title: prefill.title, author_name: [prefill.author], cover_i: null, _prefillCover: prefill.cover } : null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("read");
  const [loading, setLoading] = useState(false);
  const [dupWarning, setDupWarning] = useState(null);
  const timer = useRef();

  useEffect(() => {
    if (prefill) return;
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&sort=editions&limit=7&fields=key,title,author_name,cover_i,number_of_pages_median,subject`);
        const d = await r.json();
        setResults(d.docs || []);
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

  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div><div className="modal-title">{prefill ? "Mark as Read" : "Log a Book"}</div><div className="modal-sub">Search · Rate · Annotate</div></div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
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
        {dupWarning && (
          <div className="dup-warning">⚠ "{dupWarning}" is already on your shelf — you can still add it again.</div>
        )}
        {prefill && selected && (
          <div style={{ display: "flex", gap: 12, marginBottom: 18, padding: "12px 14px", background: "var(--cyan-dim)", border: "1.5px solid var(--cyan-mid)", borderRadius: 8 }}>
            <div style={{ width: 42, height: 60, borderRadius: 4, overflow: "hidden", background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
              {prefill.cover ? <img src={prefill.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📖"}
            </div>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 15, color: "var(--ink)", lineHeight: 1.3 }}>{prefill.title}</div>
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
          <Stars rating={rating} interactive onChange={setRating} />
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
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "var(--ink)", marginBottom: 4, lineHeight: 1.3 }}>{book.title}</div>
            <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 12 }}>{book.author}</div>
            <Stars rating={rating} interactive onChange={setRating} />
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
          style={{ width: "100%", minHeight: 90, background: "var(--bg)", border: "1.5px solid var(--border)", borderLeft: "3px solid var(--cyan)", borderRadius: "0 6px 6px 0", padding: 12, fontSize: 13, color: "var(--ink2)", fontFamily: "'JetBrains Mono', monospace", resize: "vertical", outline: "none", lineHeight: 1.8, boxSizing: "border-box" }}
        />
        <button className="btn-primary" style={{ width: "100%", marginTop: 12, padding: "10px 0" }} onClick={save}>Save</button>
        <button className="btn-ghost" style={{ width: "100%", marginTop: 8, padding: "10px 0" }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ── RECS MODAL ─────────────────────────────────────────────────────
function RecsModal({ books, onClose, onAdd, quizData, toRead, setToRead }) {
  const [tasteProfile, setTasteProfile] = useState(null);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [addedIdx, setAddedIdx] = useState(new Set());
  const [savedIdx, setSavedIdx] = useState(new Set());

  const libraryLines = (shelf) => shelf.map(b => `- "${b.title}" by ${b.author} — ${b.rating}/5. Notes: "${b.notes || "none"}"`).join("\n");

  const quizSection = quizData ? (() => {
    const faves = quizData.favBooks.filter(b => b.title.trim());
    const genres = quizData.topGenres.filter(Boolean);
    const favLines = faves.length ? `All-time favorite books (weight these most heavily):\n${faves.map((b, i) => `${i+1}. "${b.title}"${b.author ? ` by ${b.author}` : ""}`).join("\n")}` : "";
    const genreLines = genres.length ? `Preferred genres in ranked order: ${genres.map((g, i) => `${i+1}. ${g}`).join(", ")}` : "";
    return [favLines, genreLines].filter(Boolean).join("\n\n");
  })() : "";

  const prompt = `You are a literary taste analyst. Based on this reader's stated preferences and library, recommend 4 books they haven't read.${quizSection ? `\n\nCORE PREFERENCES — factor these in most heavily:\n${quizSection}` : ""}

Library (use ratings and notes to fine-tune, but never override the core preferences above):
${libraryLines(books)}

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
    if (useCache && recsCache && recsCache.bookCount === books.length && recsCache.recs.length > 0) {
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
      recsCache = { tasteProfile: parsed.taste_profile, recs: newRecs, bookCount: books.length };
    } catch {
      setError("Couldn't reach the AI. Check your API key is set correctly.");
    }
    setLoading(false);
  };

  const replaceRec = async (idx, currentRecs) => {
    const exclude = [...books.map(b => b.title), ...currentRecs.map(r => r.title)].map(t => `"${t}"`).join(", ");
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
    setAddedIdx(prev => new Set([...prev, idx]));
    setRecs(prev => prev.map((r, i) => i === idx ? { ...r, replacing: true } : r));
    const cover = await fetchCover(rec.title, rec.author).catch(() => null);
    onAdd({ id: Date.now(), title: rec.title, author: rec.author, cover, rating: 0, notes: "", genre: "General", pages: null, dateRead: new Date().toISOString().slice(0,7), status: "read" });
    await replaceRec(idx, recs);
    setAddedIdx(prev => { const next = new Set(prev); next.delete(idx); return next; });
  };

  const saveToRead = async (idx) => {
    if (savedIdx.has(idx)) return;
    const rec = recs[idx];
    setSavedIdx(prev => new Set([...prev, idx]));
    setRecs(prev => prev.map((r, i) => i === idx ? { ...r, replacing: true } : r));
    let cover = null;
    try { ({ cover } = await fetchBookMeta(rec.title, rec.author)); } catch {}
    setToRead(prev => [...prev, { id: Date.now(), title: rec.title, author: rec.author, cover, addedAt: new Date().toISOString() }]);
    await replaceRec(idx, recs);
    setSavedIdx(prev => { const next = new Set(prev); next.delete(idx); return next; });
  };

  const copyPrompt = () => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2500); };

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
                        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: "var(--ink)" }}>{rec.title}</div>
                        <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>{rec.author}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        <div className="match-badge">{rec.match}% match</div>
                        <button
                          onClick={() => !addedIdx.has(i) && markRead(i)}
                          style={{ fontSize: 10, padding: "3px 10px", background: addedIdx.has(i) ? "var(--cyan-dim)" : "var(--cyan-dim)", color: addedIdx.has(i) ? "var(--cyan)" : "var(--cyan)", border: "1px solid var(--cyan-mid)", borderRadius: 3, cursor: addedIdx.has(i) ? "default" : "pointer", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, whiteSpace: "nowrap", opacity: addedIdx.has(i) ? 0.6 : 1 }}
                        >{addedIdx.has(i) ? "✓ Added" : "✓ Already Read"}</button>
                        <button
                          onClick={() => saveToRead(i)}
                          style={{ fontSize: 10, padding: "3px 10px", background: savedIdx.has(i) ? "#f0fdf4" : "var(--bg)", color: savedIdx.has(i) ? "#16a34a" : "var(--ink3)", border: `1px solid ${savedIdx.has(i) ? "#86efac" : "var(--border)"}`, borderRadius: 3, cursor: savedIdx.has(i) ? "default" : "pointer", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, whiteSpace: "nowrap" }}
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
function ScanModal({ onClose, onAdd }) {
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
      const withCovers = await Promise.all(parsed.books.map(async (b, i) => {
        let cover = null, pages = null;
        try { ({ cover, pages } = await fetchBookMeta(b.title, b.author)); } catch {}
        return { ...b, id: now + i, include: true, cover, pages };
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
    found.filter(b => b.include).forEach(b => {
      onAdd({ id: b.id, title: b.title, author: b.author, cover: b.cover || null, rating: 0, notes: "", genre: b.genre || "General", pages: b.pages || null, dateRead: new Date().toISOString().slice(0,7) });
    });
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
            <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 16 }}>Found <strong>{found.length} books</strong>. Uncheck any that are wrong, then add them all at once.</div>
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
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 14, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>{b.author || "Unknown"}</div>
                    <div style={{ fontSize: 10, color: "var(--cyan)", fontWeight: 600, marginTop: 3, letterSpacing: "0.06em" }}>{b.genre || "General"}</div>
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

// ── STACK MODAL ────────────────────────────────────────────────────
function StackModal({ onClose }) {
  const sections = [
    { title: "1. Frontend Hosting", items: ["Netlify Free — drag-and-drop deploy or connect GitHub repo", "Build: Vite + React (this exact component as your app shell)", "Free SSL, custom domain, 100GB bandwidth/month"] },
    { title: "2. Auth + Database", items: ["Supabase Free — Postgres + Row Level Security", "Each user's books stored with user_id FK — no data leakage", "Auth: magic link email or Google OAuth, 50K MAU free"] },
    { title: "3. AI Layer", items: ["Netlify Functions (serverless) — keeps Anthropic API key off client", "Function receives user's book list → calls Claude → returns JSON", "Cache last result in Supabase to avoid double-billing on refresh"] },
    { title: "4. Upgrade Path", items: ["Free: 50 books cap + 5 recs/month (check row count in Supabase)", "Paid: Stripe Checkout → webhook → flip users.plan = 'pro'", "Unlimited books + recs, export CSV, reading stats over time"] },
    { title: "5. Total Cost at Test Scale", items: ["Netlify Free + Supabase Free + Anthropic pay-per-use ≈ ~$0–3/mo", "Only costs money when AI recs are generated (~$0.01 per session)", "No server to manage — fully serverless stack"] },
  ];
  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <div><div className="modal-title">Stack Blueprint</div><div className="modal-sub">Netlify-First Architecture</div></div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {sections.map((s, i) => (
          <div key={i} className="stack-section">
            <div className="stack-num">{s.title}</div>
            {s.items.map((item, j) => (
              <div key={j} className="stack-item"><span className="stack-dash">→</span><span>{item}</span></div>
            ))}
          </div>
        ))}
        <button className="btn-ghost" style={{ width: "100%", marginTop: 8, padding: "10px 0" }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ── CSV IMPORT MODAL ───────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { format: "unknown", rows: [] };
  const parseRow = (line) => {
    const cols = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
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
      if (i >= 0) return row[i] || "";
    }
    return "";
  };
  // Detect format
  const hasAsin = headers.some(h => h.includes("asin"));
  const hasOrderId = headers.some(h => h.includes("order_id") || h === "orderid");
  const hasGoodreads = headers.some(h => h.includes("exclusive_shelf") || h.includes("my_rating") || h.includes("bookshelves"));
  let format = "generic";
  if (hasGoodreads) format = "goodreads";
  else if (hasAsin || hasOrderId) format = "amazon";

  let rows;
  if (format === "amazon") {
    rows = lines.slice(1).map(line => {
      const row = parseRow(line);
      const title = get(row, "title", "product_name");
      const category = get(row, "category", "product_category");
      const dateRaw = get(row, "order_date", "orderdate");
      if (!title) return null;
      if (!category.toLowerCase().includes("kindle")) return null;
      let dateRead = new Date().toISOString().slice(0, 7);
      if (dateRaw) {
        // Amazon uses MM/DD/YYYY
        const mdy = dateRaw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (mdy) dateRead = `${mdy[3]}-${mdy[1].padStart(2, "0")}`;
        else {
          const ymd = dateRaw.match(/(\d{4})[\/\-](\d{1,2})/);
          if (ymd) dateRead = `${ymd[1]}-${ymd[2].padStart(2, "0")}`;
          else { const y = dateRaw.match(/\d{4}/); if (y) dateRead = `${y[0]}-01`; }
        }
      }
      return { title, author: "Unknown", rating: 0, pages: null, dateRead, shelf: "read", include: true };
    }).filter(Boolean);
  } else {
    rows = lines.slice(1).map(line => {
      const row = parseRow(line);
      const title = get(row, "title");
      const author = get(row, "author");
      const ratingRaw = get(row, "my_rating", "rating");
      const dateRaw = get(row, "date_read", "dateread");
      const pagesRaw = get(row, "number_of_pages", "pages", "num_pages");
      const shelfRaw = get(row, "exclusive_shelf", "shelf", "bookshelves");
      if (!title) return null;
      const rating = parseInt(ratingRaw) || 0;
      const pages = parseInt(pagesRaw) || null;
      let dateRead = new Date().toISOString().slice(0, 7);
      if (dateRaw) {
        const m = dateRaw.match(/(\d{4})[\/\-](\d{1,2})/);
        if (m) dateRead = `${m[1]}-${m[2].padStart(2, "0")}`;
        else { const y = dateRaw.match(/\d{4}/); if (y) dateRead = `${y[0]}-01`; }
      }
      return { title, author: author || "Unknown", rating, pages, dateRead, shelf: shelfRaw, include: true };
    }).filter(Boolean);
  }
  return { format, rows };
}

function ImportCSVModal({ onClose, onAdd }) {
  const [stage, setStage] = useState("upload");
  const [parsed, setParsed] = useState([]);
  const [csvFormat, setCsvFormat] = useState("generic");
  const [fetching, setFetching] = useState(false);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const { format, rows } = parseCSV(e.target.result);
      if (rows.length === 0) {
        if (format === "amazon") alert("No Kindle books found in this Amazon Order History CSV. Make sure your order report includes Kindle purchases.");
        else alert("No books found. Make sure this is a Goodreads export or Amazon Order History CSV.");
        return;
      }
      setCsvFormat(format);
      setParsed(rows);
      setStage("review");
    };
    reader.readAsText(file);
  };

  const toggle = (i) => setParsed(p => p.map((b, j) => j === i ? { ...b, include: !b.include } : b));

  const addAll = async () => {
    setFetching(true);
    const toAdd = parsed.filter(b => b.include);
    const withMeta = await Promise.all(toAdd.map(async (b, i) => {
      let cover = null, pages = b.pages, author = b.author;
      try {
        const meta = await fetchBookMeta(b.title, b.author);
        cover = meta.cover;
        if (!pages) pages = meta.pages;
        if (author === "Unknown" && meta.author) author = meta.author;
      } catch {}
      return { id: Date.now() + i, title: b.title, author, cover, rating: b.rating, notes: "", genre: "General", pages, dateRead: b.dateRead };
    }));
    withMeta.forEach(b => onAdd(b));
    setFetching(false);
    onClose();
  };

  const formatLabel = csvFormat === "amazon" ? "Amazon Order History" : csvFormat === "goodreads" ? "Goodreads Export" : "CSV Import";
  const formatColor = csvFormat === "amazon" ? "var(--amber)" : "var(--cyan)";

  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <div><div className="modal-title">Import CSV</div><div className="modal-sub">Goodreads · Amazon Order History · Any compatible export</div></div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {stage === "upload" && (
          <>
            <div className="import-drop"
              onClick={() => fileRef.current.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--cyan)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border2)"}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
              <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 4 }}>Click or drag a CSV file here</div>
              <div style={{ fontSize: 11, color: "var(--ink4)" }}>Goodreads export · Amazon Order History</div>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            <div style={{ fontSize: 11, color: "var(--ink4)", lineHeight: 1.9 }}>
              <strong style={{ color: "var(--ink3)" }}>Goodreads:</strong> Account → Import/Export → Export Library<br />
              <strong style={{ color: "var(--ink3)" }}>Amazon:</strong> amazon.com/gp/b2b/reports → Order History Report → Kindle items auto-detected
            </div>
          </>
        )}
        {stage === "review" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 4, background: formatColor, color: csvFormat === "amazon" ? "#000" : "#fff", textTransform: "uppercase" }}>{formatLabel}</span>
              <span style={{ fontSize: 12, color: "var(--ink3)" }}>Found <strong>{parsed.length} book{parsed.length !== 1 ? "s" : ""}</strong>. Uncheck any to skip.</span>
            </div>
            {csvFormat === "amazon" && (
              <div style={{ fontSize: 11, color: "var(--ink4)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", marginBottom: 12 }}>
                📅 Dates shown are <strong>purchase dates</strong>. Authors will be looked up from OpenLibrary during import.
              </div>
            )}
            <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {parsed.map((b, i) => (
                <div key={i} onClick={() => toggle(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: b.include ? "var(--cyan-dim)" : "var(--bg)", border: `1.5px solid ${b.include ? "var(--cyan-mid)" : "var(--border)"}`, borderRadius: 6, cursor: "pointer", transition: "all 0.12s" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${b.include ? "var(--cyan)" : "var(--border2)"}`, background: b.include ? "var(--cyan)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {b.include && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                    <div style={{ fontSize: 10, color: "var(--ink3)" }}>{b.author !== "Unknown" ? b.author : <em style={{ color: "var(--ink4)" }}>author via OpenLibrary</em>}{b.rating ? ` · ${"★".repeat(b.rating)}` : ""}{b.pages ? ` · ${b.pages}pp` : ""}</div>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink4)", flexShrink: 0 }}>{b.dateRead}</div>
                </div>
              ))}
            </div>
            {fetching ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div className="spinner" style={{ width: 28, height: 28, margin: "0 auto 8px" }} />
                <div style={{ fontSize: 12, color: "var(--ink3)" }}>{csvFormat === "amazon" ? "Fetching covers & authors…" : "Fetching covers…"} this may take a moment</div>
              </div>
            ) : (
              <>
                <button className="btn-primary" style={{ width: "100%", padding: "12px 0", fontSize: 12 }} onClick={addAll}>
                  Import {parsed.filter(b => b.include).length} Books
                </button>
                <button className="btn-ghost" style={{ width: "100%", marginTop: 8, padding: "10px 0" }} onClick={() => setStage("upload")}>Choose a different file</button>
              </>
            )}
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
        const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&sort=editions&limit=7&fields=key,title,author_name,cover_i`);
        const d = await r.json();
        setResults(d.docs || []);
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
  const timer = useRef();

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5&fields=title,author_name`);
        const d = await r.json();
        setResults(d.docs || []);
      } catch { setResults([]); }
      setLoading(false);
    }, 380);
  }, [query]);

  const select = (result) => {
    const title = result.title;
    const author = result.author_name?.[0] || "";
    setQuery(title);
    setResults([]);
    onChange({ title, author });
  };

  const clear = () => { setQuery(""); setResults([]); onChange({ title: "", author: "" }); };

  return (
    <div style={{ flex: 1 }}>
      <div style={{ position: "relative" }}>
        <input
          className="input"
          placeholder="Search a book…"
          value={query}
          onChange={e => { setQuery(e.target.value); if (!e.target.value) clear(); }}
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
      return saved ? JSON.parse(saved) : [];
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

  const saveQuiz = async (data) => {
    try { localStorage.setItem("shelf-quiz", JSON.stringify(data)); } catch {}
    setQuizData(data);

    // Auto-add favourite books from DNA quiz to the shelf
    const favs = data.favBooks.filter(b => b.title.trim());
    if (favs.length === 0) return;
    const now = Date.now();
    const newBooks = await Promise.all(favs.map(async (fav, i) => {
      let meta = { cover: null, pages: null, author: null, genre: "General" };
      try { meta = await fetchBookMeta(fav.title, fav.author || ""); } catch {}
      return {
        id: now + i,
        title: fav.title,
        author: fav.author || meta.author || "Unknown",
        cover: meta.cover || null,
        rating: 0,
        notes: "",
        genre: meta.genre || "General",
        pages: meta.pages || null,
        dateRead: null,
        status: "read",
      };
    }));
    setBooks(prev => {
      const existing = new Set(prev.map(b => b.title.toLowerCase()));
      const toAdd = newBooks.filter(b => !existing.has(b.title.toLowerCase()));
      return toAdd.length ? [...prev, ...toAdd] : prev;
    });
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
      if (sortBy === "author") return a.author.localeCompare(b.author);
      if (sortBy === "rating-high") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "rating-low") return (a.rating || 0) - (b.rating || 0);
      if (sortBy === "date-read") return (b.dateRead || "").localeCompare(a.dateRead || "");
      return 0; // date-added = insertion order (newest first, we prepend)
    });

  // Year filter for stats
  const statYears = [...new Set(books.map(b => b.dateRead?.slice(0,4)).filter(Boolean))].sort((a,b) => b-a);
  const statBooks = statsYear === "all" ? books : books.filter(b => b.dateRead?.startsWith(statsYear));
  const readBooks = statBooks.filter(b => b.status !== "dnf");

  const ratedBooks = readBooks.filter(b => b.rating > 0);
  const avg = ratedBooks.length ? (ratedBooks.reduce((a,b) => a+b.rating, 0)/ratedBooks.length).toFixed(1) : "—";
  const totalPg = readBooks.reduce((a,b) => a+(b.pages||0), 0);
  const genres = [...new Set(readBooks.map(b => b.genre))];

  // Reading goal
  const thisYear = new Date().getFullYear().toString();
  const thisYearBooks = books.filter(b => b.dateRead?.startsWith(thisYear));

  // Export CSV
  const exportCSV = () => {
    const headers = ["Title","Author","Rating","Date Read","Pages","Genre","Notes"];
    const rows = books.map(b => [b.title, b.author, b.rating || "", b.dateRead || "", b.pages || "", b.genre || "", b.notes || ""].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
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
      <div className="scanlines" />
      <div className="grid-bg" />
      <div className="orbit-ring" style={{ width: 600, height: 600, right: -200, top: -200 }} />
      <div className="orbit-ring" style={{ width: 400, height: 400, right: -100, top: -50, opacity: 0.5 }} />

      <div style={{ position: "relative", zIndex: 2 }}>
        <header className="header">
          <div className="logo">
            <span className="logo-word">Shelf</span>
            <span className="logo-badge">AI</span>
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
                      <button onClick={() => { setGoalInput(""); setEditingGoal(true); }} style={{ background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: 0, textDecoration: "underline" }}>Set a {thisYear} reading goal</button>
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
                      <button onClick={() => { setGoalInput(String(readingGoal)); setEditingGoal(true); }} style={{ fontSize: 10, padding: "3px 8px", background: "none", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer", color: "var(--ink4)", fontFamily: "'JetBrains Mono', monospace" }}>edit</button>
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
                  const count = readBooks.filter(b => b.rating===r).length;
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
                          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 14, color: "var(--ink)", lineHeight: 1.3, marginBottom: 2 }}>{b.title}</div>
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
      {modal === "add" && <AddModal onClose={() => setModal(null)} existingBooks={books} onAdd={b => { setBooks(p => [b,...p]); setModal(null); }} />}
      {modal === "add-toread" && <AddToReadModal onClose={() => setModal(null)} onAdd={b => setToRead(p => [b, ...p])} />}
      {modal === "scan" && <ScanModal onClose={() => setModal(null)} onAdd={b => setBooks(p => [b,...p])} />}
      {modal === "import-csv" && <ImportCSVModal onClose={() => setModal(null)} onAdd={b => setBooks(p => [b, ...p])} />}
      {modal === "rec" && <RecsModal books={books} onClose={() => setModal(null)} onAdd={b => setBooks(p => [b, ...p])} quizData={quizData} toRead={toRead} setToRead={setToRead} />}
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
