import { useState, useEffect, useRef } from "react";

/* ─── DESIGN SYSTEM ───────────────────────────────────────────────
   AESTHETIC: Hard-SF paperback meets OLED mission control
   Bright white base · electric cyan accents · warm amber for ratings
   Fonts: DM Serif Display (titles) + JetBrains Mono (data/UI)
   Motif: scan-lines, grid overlays, terminal blink, orbital arcs
──────────────────────────────────────────────────────────────────── */

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
    --amber-dim:#fef3c7;
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
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.018) 2px,
      rgba(0,0,0,0.018) 4px
    );
  }

  .grid-bg {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      linear-gradient(var(--grid-col) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-col) 1px, transparent 1px);
    background-size: 32px 32px;
  }

  /* ── HEADER ── */
  .header {
    position: sticky; top: 0; z-index: 200;
    background: rgba(245,247,250,0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    height: 58px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 28px;
  }
  .logo {
    display: flex; align-items: baseline; gap: 10px;
  }
  .logo-word {
    font-family: 'DM Serif Display', serif;
    font-size: 22px; color: var(--ink); letter-spacing: -0.02em;
  }
  .logo-badge {
    font-size: 9px; font-weight: 700; letter-spacing: 0.18em;
    color: var(--cyan); border: 1.5px solid var(--cyan);
    padding: 2px 7px; border-radius: 2px; text-transform: uppercase;
  }
  .nav-pill {
    display: flex; background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; overflow: hidden;
  }
  .nav-btn {
    background: none; border: none; padding: 6px 16px;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
    cursor: pointer; color: var(--ink3); transition: all 0.15s;
  }
  .nav-btn:hover { color: var(--ink); background: var(--bg); }
  .nav-btn.active { background: var(--ink); color: #fff; }

  .btn-primary {
    background: var(--cyan); color: var(--surface);
    border: none; border-radius: 5px;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700;
    letter-spacing: 0.08em; padding: 8px 18px; cursor: pointer;
    transition: background 0.15s, transform 0.1s; text-transform: uppercase;
    box-shadow: 0 2px 8px rgba(0,180,216,0.25);
  }
  .btn-primary:hover { background: #0096c7; transform: translateY(-1px); }
  .btn-ghost {
    background: none; border: 1.5px solid var(--border2); border-radius: 5px;
    font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600;
    letter-spacing: 0.08em; padding: 6px 14px; cursor: pointer; color: var(--ink3);
    transition: all 0.15s; text-transform: uppercase;
  }
  .btn-ghost:hover { border-color: var(--cyan); color: var(--cyan); }

  /* ── STAT BAR ── */
  .stat-bar {
    display: grid; grid-template-columns: repeat(4, 1fr);
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; overflow: hidden; margin-bottom: 28px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .stat-cell {
    padding: 18px 22px; border-right: 1px solid var(--border);
    position: relative;
  }
  .stat-cell:last-child { border-right: none; }
  .stat-cell::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0;
    height: 3px; background: linear-gradient(90deg, var(--cyan), var(--cyan-mid));
    opacity: 0;
  }
  .stat-cell:hover::before { opacity: 1; }
  .stat-label { font-size: 9px; font-weight: 600; color: var(--ink4); letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 6px; }
  .stat-value { font-family: 'DM Serif Display', serif; font-size: 28px; color: var(--ink); line-height: 1; }

  /* ── SEARCH ROW ── */
  .search-row { display: flex; gap: 10px; margin-bottom: 24px; }
  .search-input {
    flex: 1; padding: 10px 14px;
    background: var(--surface); border: 1.5px solid var(--border);
    border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px;
    color: var(--ink); outline: none; transition: border-color 0.15s;
  }
  .search-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(0,180,216,0.1); }
  .search-input::placeholder { color: var(--ink4); }

  .rec-btn {
    padding: 10px 22px; border-radius: 6px;
    border: 1.5px solid var(--cyan);
    background: var(--cyan-dim); color: var(--cyan);
    font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700;
    letter-spacing: 0.08em; cursor: pointer; text-transform: uppercase;
    transition: all 0.15s; white-space: nowrap;
    box-shadow: 0 0 0 0 rgba(0,180,216,0);
  }
  .rec-btn:hover:not(:disabled) { background: var(--cyan); color: #fff; box-shadow: 0 2px 12px rgba(0,180,216,0.3); }
  .rec-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── BOOK CARD ── */
  .book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px,1fr)); gap: 14px; }
  .book-card {
    background: var(--surface); border: 1.5px solid var(--border);
    border-radius: 10px; padding: 16px; cursor: pointer;
    display: flex; gap: 14px; transition: all 0.18s;
    position: relative; overflow: hidden;
  }
  .book-card::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, var(--cyan), var(--cyan-mid));
    transform: scaleX(0); transition: transform 0.2s;
  }
  .book-card:hover { border-color: var(--cyan-mid); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,180,216,0.12); }
  .book-card:hover::after { transform: scaleX(1); }

  .book-cover {
    width: 58px; height: 84px; flex-shrink: 0; border-radius: 4px;
    overflow: hidden; background: var(--bg); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center; font-size: 24px;
  }
  .book-cover img { width: 100%; height: 100%; object-fit: cover; }
  .book-title { font-family: 'DM Serif Display', serif; font-size: 15px; color: var(--ink); margin-bottom: 2px; line-height: 1.3; }
  .book-author { font-size: 11px; color: var(--ink3); margin-bottom: 8px; }
  .book-notes { font-size: 11px; color: var(--ink4); line-height: 1.6; margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-style: italic; }
  .genre-tag {
    font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--cyan); background: var(--cyan-dim); padding: 2px 8px; border-radius: 2px;
  }

  /* ── STARS ── */
  .stars { display: flex; gap: 2px; }
  .star { font-size: 15px; transition: color 0.1s; cursor: default; line-height: 1; }
  .star.interactive { cursor: pointer; }
  .star.lit { color: var(--amber); }
  .star.dim { color: #e2e8f0; }

  /* ── MODAL BACKDROP ── */
  .backdrop {
    position: fixed; inset: 0; background: rgba(15,23,42,0.6);
    backdrop-filter: blur(6px); z-index: 500;
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.18s ease;
  }
  @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
  .modal {
    background: var(--surface); border: 1.5px solid var(--border);
    border-radius: 14px; padding: 32px;
    width: min(500px, 94vw); max-height: 88vh; overflow-y: auto;
    box-shadow: 0 24px 60px rgba(0,0,0,0.18);
    animation: slideUp 0.2s ease;
  }
  .modal-wide { width: min(620px, 94vw); }
  @keyframes slideUp { from { opacity:0; transform: translateY(16px) } to { opacity:1; transform: translateY(0) } }
  .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 26px; }
  .modal-title { font-family: 'DM Serif Display', serif; font-size: 24px; color: var(--ink); }
  .modal-sub { font-size: 10px; color: var(--ink4); letter-spacing: 0.14em; text-transform: uppercase; margin-top: 3px; }
  .close-btn { background: none; border: none; font-size: 22px; color: var(--ink4); cursor: pointer; line-height: 1; padding: 0 4px; }
  .close-btn:hover { color: var(--ink); }

  /* ── FORM ── */
  .field { margin-bottom: 18px; }
  .label { display: block; font-size: 10px; font-weight: 600; color: var(--ink3); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 7px; }
  .input {
    width: 100%; padding: 10px 13px;
    background: var(--bg); border: 1.5px solid var(--border);
    border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px;
    color: var(--ink); outline: none; transition: border-color 0.15s;
  }
  .input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(0,180,216,0.1); background: #fff; }
  .input::placeholder { color: var(--ink4); }
  textarea.input { resize: vertical; line-height: 1.7; min-height: 90px; }

  /* ── AUTOCOMPLETE ── */
  .autocomplete { border: 1.5px solid var(--border); border-radius: 6px; overflow: hidden; margin-bottom: 18px; }
  .ac-item { padding: 10px 14px; cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.1s; }
  .ac-item:last-child { border-bottom: none; }
  .ac-item:hover { background: var(--cyan-dim); }
  .ac-title { font-size: 13px; color: var(--ink); font-family: 'DM Serif Display', serif; }
  .ac-author { font-size: 11px; color: var(--ink3); margin-top: 1px; }

  /* ── RECS ── */
  .taste-profile {
    background: linear-gradient(135deg, #e0f7fc, #f0fdf4);
    border: 1.5px solid var(--cyan-mid); border-radius: 8px;
    padding: 18px; margin-bottom: 22px; position: relative; overflow: hidden;
  }
  .taste-profile::before {
    content: '◈'; position: absolute; right: 14px; top: 12px;
    font-size: 28px; color: var(--cyan); opacity: 0.15;
  }
  .rec-card {
    background: var(--surface); border: 1.5px solid var(--border);
    border-radius: 8px; padding: 18px; margin-bottom: 12px;
    transition: border-color 0.15s;
  }
  .rec-card:hover { border-color: var(--cyan-mid); }
  .rec-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .match-badge {
    background: linear-gradient(135deg, var(--cyan), #0096c7);
    color: #fff; font-size: 10px; font-weight: 700;
    padding: 3px 10px; border-radius: 3px; flex-shrink: 0; margin-left: 12px;
    letter-spacing: 0.06em;
  }
  .rec-reason { font-size: 12px; color: var(--ink3); line-height: 1.7; border-top: 1px solid var(--border); padding-top: 10px; margin-top: 6px; }

  /* ── LOADING SPINNER ── */
  .spinner {
    width: 36px; height: 36px;
    border: 2.5px solid var(--border);
    border-top-color: var(--cyan);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    margin: 0 auto 14px;
  }
  @keyframes spin { to { transform: rotate(360deg) } }

  /* ── STATS PAGE ── */
  .bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .bar-track { flex: 1; height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden; border: 1px solid var(--border); }
  .bar-fill { height: 100%; background: linear-gradient(90deg, var(--cyan), var(--cyan-mid)); border-radius: 4px; transition: width 0.7s cubic-bezier(.4,0,.2,1); }
  .bar-fill.amber { background: linear-gradient(90deg, var(--amber), #fbbf24); }

  .stack-section { background: var(--surface); border: 1.5px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 14px; }
  .stack-num { font-size: 9px; font-weight: 700; color: var(--cyan); letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 12px; }
  .stack-item { display: flex; gap: 10px; margin-bottom: 8px; font-size: 12px; color: var(--ink2); line-height: 1.6; }
  .stack-dash { color: var(--cyan); flex-shrink: 0; }

  /* ── ORBIT DECORATION ── */
  .orbit-ring {
    position: fixed; pointer-events: none; z-index: 1;
    border: 1px solid rgba(0,180,216,0.07); border-radius: 50%;
  }

  /* ── EMPTY STATE ── */
  .empty { text-align: center; padding: 80px 0; color: var(--ink4); }
  .empty-icon { font-size: 52px; margin-bottom: 16px; filter: grayscale(0.3); }
  .empty-title { font-family: 'DM Serif Display', serif; font-size: 22px; color: var(--ink3); margin-bottom: 8px; }

  /* ── FREE TIER BAR ── */
  .tier-bar-wrap { background: var(--surface); border: 1.5px solid var(--border); border-radius: 8px; padding: 18px 22px; margin-top: 16px; }
  .tier-progress { height: 10px; background: var(--bg); border-radius: 5px; overflow: hidden; border: 1px solid var(--border); margin-top: 10px; }
  .tier-fill { height: 100%; border-radius: 5px; transition: width 0.6s ease; }
`;

const MOCK_BOOKS = [];

function Stars({ rating, interactive = false, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="stars">
      {[1,2,3,4,5].map(i => (
        <span
          key={i}
          className={`star ${interactive ? "interactive" : ""} ${i <= (hover || rating) ? "lit" : "dim"}`}
          onClick={() => interactive && onChange?.(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
        >★</span>
      ))}
    </div>
  );
}

function BookCard({ book, onClick, onDelete }) {
  const [imgErr, setImgErr] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="book-card" onClick={() => onClick(book)}>
      <span className="genre-tag">{book.genre}</span>
      <div className="book-cover">
        {!imgErr && book.cover
          ? <img src={book.cover} alt="" onError={() => setImgErr(true)} />
          : "📖"
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="book-title">{book.title}</div>
        <div className="book-author">{book.author}</div>
        <span className="genre-tag" style={{ position: "static", display: "inline-block", marginBottom: 8 }}>{book.genre}</span>
        <Stars rating={book.rating} />
        {book.notes && <div className="book-notes">"{book.notes}"</div>}
      </div>
      <div style={{ position: "absolute", bottom: 10, right: 10 }} onClick={e => e.stopPropagation()}>
        {confirming ? (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => onDelete(book.id)}
              style={{ fontSize: 10, padding: "3px 8px", background: "var(--red)", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
              Yes
            </button>
            <button onClick={() => setConfirming(false)}
              style={{ fontSize: 10, padding: "3px 8px", background: "var(--bg)", color: "var(--ink3)", border: "1px solid var(--border)", borderRadius: 3, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
              No
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)}
            style={{ fontSize: 13, padding: "2px 7px", background: "none", color: "var(--ink4)", border: "1px solid transparent", borderRadius: 3, cursor: "pointer", lineHeight: 1 }}
            title="Remove book">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function AddModal({ onClose, onAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const timer = useRef();

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6&fields=key,title,author_name,cover_i,number_of_pages_median,subject`);
        const d = await r.json();
        setResults(d.docs || []);
      } catch { setResults([]); }
      setLoading(false);
    }, 380);
  }, [query]);

  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Log a Book</div>
            <div className="modal-sub">Search · Rate · Annotate</div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="field">
          <label className="label">Search Open Library</label>
          <input className="input" value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); }}
            placeholder="Title or author…" autoFocus />
        </div>

        {loading && <div style={{ fontSize: 11, color: "var(--ink4)", marginBottom: 12 }}>searching…</div>}

        {results.length > 0 && !selected && (
          <div className="autocomplete">
            {results.map((r, i) => (
              <div key={i} className="ac-item" onClick={() => { setSelected(r); setQuery(r.title); setResults([]); }}>
                <div className="ac-title">{r.title}</div>
                <div className="ac-author">{r.author_name?.[0] || "Unknown author"}</div>
              </div>
            ))}
          </div>
        )}

        <div className="field">
          <label className="label">Your Rating</label>
          <Stars rating={rating} interactive onChange={setRating} />
        </div>

        <div className="field">
          <label className="label">Personal Notes</label>
          <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="What did this book do to you?" rows={4} />
        </div>

        <button className="btn-primary" style={{ width: "100%", padding: "12px 0", fontSize: 12,
          opacity: selected && rating ? 1 : 0.4,
          cursor: selected && rating ? "pointer" : "not-allowed" }}
          onClick={() => {
            if (!selected || !rating) return;
            onAdd({ id: Date.now(), title: selected.title, author: selected.author_name?.[0] || "Unknown",
              cover: selected.cover_i ? `https://covers.openlibrary.org/b/id/${selected.cover_i}-M.jpg` : null,
              rating, notes, genre: selected.subject?.[0] || "General",
              pages: selected.number_of_pages_median || null, dateRead: new Date().toISOString().slice(0,7) });
            onClose();
          }}>
          Add to Shelf
        </button>
      </div>
    </div>
  );
}

function DetailModal({ book, onClose }) {
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
            <Stars rating={book.rating} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {[book.genre, book.pages && `${book.pages}pp`, book.dateRead].filter(Boolean).map((t,i) => (
                <span key={i} style={{ fontSize: 10, padding: "2px 9px", background: "var(--cyan-dim)", color: "var(--cyan)", borderRadius: 3, fontWeight: 600, letterSpacing: "0.06em" }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
        {book.notes && (
          <div style={{ background: "var(--bg)", border: "1.5px solid var(--border)", borderLeft: "3px solid var(--cyan)", borderRadius: "0 6px 6px 0", padding: 16 }}>
            <div style={{ fontSize: 10, color: "var(--ink4)", letterSpacing: "0.12em", marginBottom: 8, textTransform: "uppercase", fontWeight: 600 }}>Your Notes</div>
            <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.8, fontStyle: "italic" }}>{book.notes}</div>
          </div>
        )}
        <button className="btn-ghost" style={{ width: "100%", marginTop: 20, padding: "10px 0" }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function RecsModal({ books, onClose }) {
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true); setError(null); setParsed(null);
    const lib = books.map(b => `- "${b.title}" by ${b.author} — ${b.rating}/5. Notes: "${b.notes || "none"}"`).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content:
            `You are a literary taste analyst. Based on this reader's personal library, recommend 4 books they haven't read. Reason specifically from THEIR ratings and notes.\n\nLibrary:\n${lib}\n\nRespond ONLY with valid JSON (no markdown):\n{\n  "taste_profile": "2-sentence synthesis of their reading taste",\n  "recommendations": [\n    { "title": "...", "author": "...", "match": 90, "reason": "specific reasoning from their actual notes/ratings" }\n  ]\n}` }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      setParsed(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch { setError("Couldn't reach the AI. Check network or API key."); }
    setLoading(false);
  };

  useEffect(() => { generate(); }, []);

  return (
    <div className="backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <div>
            <div className="modal-title">For You</div>
            <div className="modal-sub">AI-Reasoned · Not Crowd-Sourced</div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div className="spinner" />
            <div style={{ fontSize: 12, color: "var(--ink4)" }}>Analyzing your library…</div>
          </div>
        )}

        {error && <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>}

        {parsed && (
          <>
            <div className="taste-profile">
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--cyan)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Your Taste Profile</div>
              <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.75 }}>{parsed.taste_profile}</div>
            </div>

            {parsed.recommendations?.map((rec, i) => (
              <div key={i} className="rec-card">
                <div className="rec-header">
                  <div>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: "var(--ink)" }}>{rec.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>{rec.author}</div>
                  </div>
                  <div className="match-badge">{rec.match}% match</div>
                </div>
                <div className="rec-reason">{rec.reason}</div>
              </div>
            ))}

            <button className="btn-ghost" style={{ width: "100%", marginTop: 8, padding: "10px 0" }} onClick={generate}>
              Regenerate
            </button>
          </>
        )}
      </div>
    </div>
  );
}

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
          <div>
            <div className="modal-title">Stack Blueprint</div>
            <div className="modal-sub">Netlify-First Architecture</div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {sections.map((s, i) => (
          <div key={i} className="stack-section">
            <div className="stack-num">{s.title}</div>
            {s.items.map((item, j) => (
              <div key={j} className="stack-item">
                <span className="stack-dash">→</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        ))}
        <button className="btn-ghost" style={{ width: "100%", marginTop: 8, padding: "10px 0" }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function App() {
  const [books, setBooks] = useState(() => {
    try {
      const saved = localStorage.getItem("shelf-books");
      return saved ? JSON.parse(saved) : MOCK_BOOKS;
    } catch { return MOCK_BOOKS; }
  });
  const [view, setView] = useState("shelf");
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try { localStorage.setItem("shelf-books", JSON.stringify(books)); }
    catch { /* storage full or unavailable */ }
  }, [books]);

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.author.toLowerCase().includes(search.toLowerCase())
  );

  const avg = books.length ? (books.reduce((a,b) => a+b.rating, 0)/books.length).toFixed(1) : "—";
  const totalPg = books.reduce((a,b) => a+(b.pages||0), 0);
  const genres = [...new Set(books.map(b => b.genre))];

  return (
    <>
      <style>{CSS}</style>
      <div className="scanlines" />
      <div className="grid-bg" />

      {/* Decorative orbit rings */}
      <div className="orbit-ring" style={{ width: 600, height: 600, right: -200, top: -200 }} />
      <div className="orbit-ring" style={{ width: 400, height: 400, right: -100, top: -50, opacity: 0.5 }} />

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* HEADER */}
        <header className="header">
          <div className="logo">
            <span className="logo-word">Shelf</span>
            <span className="logo-badge">AI</span>
          </div>

          <div className="nav-pill">
            {["shelf","stats"].map(v => (
              <button key={v} className={`nav-btn ${view===v?"active":""}`} onClick={() => setView(v)}>{v}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn-ghost" onClick={() => setModal("stack")}>Stack ↗</button>
            <button className="btn-primary" onClick={() => setModal("add")}>+ Log Book</button>
          </div>
        </header>

        <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>

          {/* STAT BAR */}
          <div className="stat-bar">
            {[
              { label: "Books Read", value: books.length },
              { label: "Avg Rating", value: avg + " ★" },
              { label: "Pages Read", value: totalPg > 0 ? totalPg.toLocaleString() : "—" },
              { label: "Genres", value: genres.length },
            ].map((s,i) => (
              <div key={i} className="stat-cell">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
              </div>
            ))}
          </div>

          {/* SHELF VIEW */}
          {view === "shelf" && (
            <>
              <div className="search-row">
                <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your shelf…" />
                <button className="rec-btn" disabled={books.length < 2} onClick={() => books.length >= 2 && setModal("rec")}>
                  ✦ Get AI Recs
                </button>
              </div>

              {filtered.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">📚</div>
                  <div className="empty-title">Welcome to Shelf</div>
                  <div style={{ fontSize: 13, color: "var(--ink3)", maxWidth: 340, margin: "8px auto 0", lineHeight: 1.8 }}>
                    Your personal reading tracker — log every book you've read, rate them, leave notes, and get AI recommendations based on your actual taste.
                  </div>
                  <button className="btn-primary" style={{ marginTop: 24, fontSize: 13, padding: "10px 28px" }} onClick={() => setModal("add")}>
                    Log your first book
                  </button>
                </div>
              ) : (
                <div className="book-grid">
                  {filtered.map(b => <BookCard key={b.id} book={b} onClick={b => setModal(b)} onDelete={id => setBooks(p => p.filter(b => b.id !== id))} />)}
                </div>
              )}
            </>
          )}

          {/* STATS VIEW */}
          {view === "stats" && (
            <div style={{ display: "grid", gap: 16 }}>
              {/* Rating distribution */}
              <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, padding: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink4)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>Rating Distribution</div>
                {[5,4,3,2,1].map(r => {
                  const count = books.filter(b => b.rating===r).length;
                  const pct = books.length ? (count/books.length)*100 : 0;
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

              {/* Genre breakdown */}
              <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, padding: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink4)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>Genre Breakdown</div>
                {genres.map(g => {
                  const count = books.filter(b => b.genre===g).length;
                  const pct = (count/books.length)*100;
                  return (
                    <div key={g} className="bar-row">
                      <div style={{ width: 110, fontSize: 11, color: "var(--ink2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g}</div>
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                      <div style={{ width: 20, textAlign: "right", color: "var(--ink3)", fontSize: 12 }}>{count}</div>
                    </div>
                  );
                })}
              </div>

              {/* Free tier */}
              <div className="tier-bar-wrap">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink4)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Free Tier Usage</div>
                  <div style={{ fontSize: 12, color: books.length > 40 ? "var(--red)" : "var(--ink3)" }}>{books.length} / 50 books</div>
                </div>
                <div className="tier-progress">
                  <div className="tier-fill" style={{
                    width: `${(books.length/50)*100}%`,
                    background: books.length > 40
                      ? "linear-gradient(90deg, #ef4444, #f87171)"
                      : "linear-gradient(90deg, var(--cyan), var(--cyan-mid))"
                  }} />
                </div>
                {books.length > 40 && (
                  <div style={{ fontSize: 12, color: "var(--red)", marginTop: 10 }}>
                    Almost at limit — upgrade for unlimited shelving
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      {modal === "add" && <AddModal onClose={() => setModal(null)} onAdd={b => { setBooks(p => [b,...p]); setModal(null); }} />}
      {modal === "rec" && <RecsModal books={books} onClose={() => setModal(null)} />}
      {modal === "stack" && <StackModal onClose={() => setModal(null)} />}
      {modal?.id && <DetailModal book={modal} onClose={() => setModal(null)} />}
    </>
  );
}
