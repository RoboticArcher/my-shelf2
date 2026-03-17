import { useState, useEffect, useRef } from "react";

const MOCK_BOOKS = [
  { id: 1, title: "Piranesi", author: "Susanna Clarke", cover: "https://covers.openlibrary.org/b/id/10361120-M.jpg", rating: 5, notes: "Labyrinthine and haunting. The worldbuilding is unlike anything I've ever read.", genre: "Fantasy", pages: 272, dateRead: "2024-01" },
  { id: 2, title: "The Dispossessed", author: "Ursula K. Le Guin", cover: "https://covers.openlibrary.org/b/id/8232289-M.jpg", rating: 5, notes: "Anarchist utopia vs. capitalist world. Le Guin makes you rethink everything.", genre: "Sci-Fi", pages: 387, dateRead: "2024-02" },
  { id: 3, title: "Normal People", author: "Sally Rooney", cover: "https://covers.openlibrary.org/b/id/9255210-M.jpg", rating: 4, notes: "The dialogue is so naturalistic. Class and intimacy handled beautifully.", genre: "Literary Fiction", pages: 273, dateRead: "2024-03" },
  { id: 4, title: "Annihilation", author: "Jeff VanderMeer", cover: "https://covers.openlibrary.org/b/id/8291037-M.jpg", rating: 4, notes: "Ecological dread done perfectly. Area X is genuinely unsettling.", genre: "Sci-Fi", pages: 195, dateRead: "2024-04" },
  { id: 5, title: "A Little Life", author: "Hanya Yanagihara", cover: "https://covers.openlibrary.org/b/id/8739161-M.jpg", rating: 4, notes: "Devastating. I needed weeks to recover.", genre: "Literary Fiction", pages: 720, dateRead: "2024-05" },
  { id: 6, title: "Recursion", author: "Blake Crouch", cover: "https://covers.openlibrary.org/b/id/9256866-M.jpg", rating: 3, notes: "Fun concept, execution felt rushed toward the end.", genre: "Thriller", pages: 329, dateRead: "2024-06" },
];

const MOCK_RECS = [
  { title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", reason: "You gave The Dispossessed 5 stars and noted Le Guin's political depth — this is her most celebrated novel, exploring gender and society on an alien world with the same rigorous imagination.", match: 97 },
  { title: "House of Leaves", author: "Mark Z. Danielewski", reason: "Your 5-star rating of Piranesi and love of 'labyrinthine' structures points directly here. It's a nested-narrative horror about architecture that defies logic — formally experimental in a way you clearly love.", match: 94 },
  { title: "The Secret History", author: "Donna Tartt", reason: "Normal People showed you value literary fiction with class tension and morally complex relationships. Tartt's debut has that same quality plus a dark academia edge that pairs with your taste for atmospheric writing.", match: 91 },
  { title: "The Word Exchange", author: "Alena Graedon", reason: "Your interest in near-future fiction (Recursion, Annihilation) combined with your literary fiction preference suggests you'd love this — a linguistic thriller about a world where language itself is dying.", match: 87 },
];

// ───────────────────────── STARS ─────────────────────────
function Stars({ rating, interactive = false, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <span
          key={i}
          onClick={() => interactive && onChange && onChange(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          style={{
            fontSize: 16,
            color: i <= (hover || rating) ? "#E8B84B" : "#2a2a2a",
            cursor: interactive ? "pointer" : "default",
            transition: "color 0.1s",
            lineHeight: 1,
          }}
        >★</span>
      ))}
    </div>
  );
}

// ───────────────────────── BOOK CARD ─────────────────────────
function BookCard({ book, onClick }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div
      onClick={() => onClick(book)}
      style={{
        background: "#111",
        border: "1px solid #1e1e1e",
        borderRadius: 4,
        padding: 16,
        cursor: "pointer",
        display: "flex",
        gap: 14,
        transition: "border-color 0.2s, transform 0.15s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#E8B84B"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1e1e"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{
        width: 56, height: 80, flexShrink: 0,
        background: "#1a1a1a", borderRadius: 2, overflow: "hidden",
        border: "1px solid #222",
      }}>
        {!imgErr && book.cover
          ? <img src={book.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImgErr(true)} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📖</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, fontWeight: 700, color: "#f0ebe0", marginBottom: 2, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{book.title}</div>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 8, fontFamily: "monospace" }}>{book.author}</div>
        <Stars rating={book.rating} />
        {book.notes && (
          <div style={{ fontSize: 11, color: "#444", marginTop: 8, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            "{book.notes}"
          </div>
        )}
      </div>
      <div style={{ position: "absolute", top: 10, right: 12, fontSize: 10, color: "#333", fontFamily: "monospace" }}>{book.genre}</div>
    </div>
  );
}

// ───────────────────────── ADD BOOK MODAL ─────────────────────────
function AddBookModal({ onClose, onAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef();

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6&fields=key,title,author_name,cover_i,number_of_pages_median,subject`);
        const data = await res.json();
        setResults(data.docs || []);
      } catch { setResults([]); }
      setLoading(false);
    }, 400);
  }, [query]);

  const handleAdd = () => {
    if (!selected || !rating) return;
    onAdd({
      id: Date.now(),
      title: selected.title,
      author: selected.author_name?.[0] || "Unknown",
      cover: selected.cover_i ? `https://covers.openlibrary.org/b/id/${selected.cover_i}-M.jpg` : null,
      rating,
      notes,
      genre: selected.subject?.[0] || "General",
      pages: selected.number_of_pages_median || null,
      dateRead: new Date().toISOString().slice(0,7),
    });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 8, padding: 32, width: "min(480px, 90vw)", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#f0ebe0", fontSize: 22, margin: 0 }}>Log a Book</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Search by title or author</label>
          <input
            value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }}
            placeholder="e.g. Piranesi, Ursula Le Guin..."
            style={inputStyle}
            autoFocus
          />
        </div>

        {loading && <div style={{ color: "#555", fontSize: 12, fontFamily: "monospace", marginBottom: 12 }}>searching open library...</div>}

        {results.length > 0 && !selected && (
          <div style={{ marginBottom: 20, border: "1px solid #1e1e1e", borderRadius: 4, overflow: "hidden" }}>
            {results.map((r, i) => (
              <div key={i} onClick={() => { setSelected(r); setQuery(r.title); setResults([]); }}
                style={{ padding: "10px 14px", cursor: "pointer", borderBottom: i < results.length-1 ? "1px solid #1a1a1a" : "none", transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#141414"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ color: "#f0ebe0", fontSize: 13, fontFamily: "'Playfair Display', serif" }}>{r.title}</div>
                <div style={{ color: "#555", fontSize: 11, fontFamily: "monospace" }}>{r.author_name?.[0]}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Your rating</label>
          <Stars rating={rating} interactive onChange={setRating} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Personal notes</label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="What did you think? How did it make you feel?"
            rows={4}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={!selected || !rating}
          style={{
            width: "100%", padding: "12px 0",
            background: selected && rating ? "#E8B84B" : "#1a1a1a",
            color: selected && rating ? "#0a0a0a" : "#333",
            border: "none", borderRadius: 4, fontFamily: "monospace",
            fontSize: 13, fontWeight: 700, cursor: selected && rating ? "pointer" : "not-allowed",
            letterSpacing: "0.08em", transition: "background 0.2s, color 0.2s",
          }}>
          ADD TO SHELF
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── BOOK DETAIL MODAL ─────────────────────────
function BookDetailModal({ book, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 8, padding: 32, width: "min(440px, 90vw)" }}>
        <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
          <div style={{ width: 80, height: 116, background: "#1a1a1a", borderRadius: 3, overflow: "hidden", flexShrink: 0, border: "1px solid #222" }}>
            {book.cover
              ? <img src={book.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📖</div>
            }
          </div>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#f0ebe0", fontSize: 20, margin: "0 0 6px", lineHeight: 1.3 }}>{book.title}</h2>
            <div style={{ color: "#666", fontFamily: "monospace", fontSize: 12, marginBottom: 12 }}>{book.author}</div>
            <Stars rating={book.rating} />
            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              <span style={tagStyle}>{book.genre}</span>
              {book.pages && <span style={tagStyle}>{book.pages}pp</span>}
              {book.dateRead && <span style={tagStyle}>{book.dateRead}</span>}
            </div>
          </div>
        </div>
        {book.notes && (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 4, padding: 16, borderLeft: "3px solid #E8B84B" }}>
            <div style={{ fontSize: 10, color: "#555", fontFamily: "monospace", marginBottom: 8, letterSpacing: "0.1em" }}>YOUR NOTES</div>
            <div style={{ color: "#888", fontSize: 13, lineHeight: 1.7, fontStyle: "italic" }}>{book.notes}</div>
          </div>
        )}
        <button onClick={onClose} style={{ width: "100%", marginTop: 20, padding: "10px 0", background: "none", border: "1px solid #222", borderRadius: 4, color: "#555", fontFamily: "monospace", fontSize: 12, cursor: "pointer", letterSpacing: "0.08em" }}>CLOSE</button>
      </div>
    </div>
  );
}

// ───────────────────────── RECOMMENDATIONS PANEL ─────────────────────────
function RecsPanel({ books, onClose }) {
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamText, setStreamText] = useState("");
  const [parsed, setParsed] = useState(null);

  const generate = async () => {
    if (books.length < 2) return;
    setLoading(true);
    setError(null);
    setStreamText("");
    setParsed(null);

    const libraryDesc = books.map(b =>
      `- "${b.title}" by ${b.author} — ${b.rating}/5 stars. Notes: "${b.notes || "none"}"`
    ).join("\n");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a literary taste analyst. Based on this reader's personal library and notes, recommend 4 books they haven't read yet. Reason specifically from THEIR ratings and notes — not generic popularity.

Library:
${libraryDesc}

Respond ONLY with valid JSON (no markdown, no preamble):
{
  "taste_profile": "2-sentence synthesis of their taste",
  "recommendations": [
    {
      "title": "...",
      "author": "...",
      "match": 90,
      "reason": "specific reason referencing their actual books/notes"
    }
  ]
}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const obj = JSON.parse(clean);
      setParsed(obj);
    } catch(e) {
      setError("Couldn't generate recommendations. Check your connection.");
    }
    setLoading(false);
  };

  useEffect(() => { generate(); }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: 32, width: "min(580px, 94vw)", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#f0ebe0", fontSize: 22, margin: "0 0 4px" }}>For You</h2>
            <div style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>AI-REASONED · NOT CROWD-SOURCED</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ width: 40, height: 40, border: "2px solid #1e1e1e", borderTopColor: "#E8B84B", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: "#444", fontFamily: "monospace", fontSize: 12 }}>analyzing your library...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
          </div>
        )}

        {error && <div style={{ color: "#c0392b", fontFamily: "monospace", fontSize: 13 }}>{error}</div>}

        {parsed && (
          <>
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 4, padding: 16, marginBottom: 24, borderLeft: "3px solid #E8B84B" }}>
              <div style={{ fontSize: 10, color: "#555", fontFamily: "monospace", marginBottom: 8, letterSpacing: "0.1em" }}>YOUR TASTE PROFILE</div>
              <div style={{ color: "#888", fontSize: 13, lineHeight: 1.7 }}>{parsed.taste_profile}</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {parsed.recommendations?.map((rec, i) => (
                <div key={i} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 4, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontFamily: "'Playfair Display', serif", color: "#f0ebe0", fontSize: 16, marginBottom: 3 }}>{rec.title}</div>
                      <div style={{ color: "#555", fontFamily: "monospace", fontSize: 11 }}>{rec.author}</div>
                    </div>
                    <div style={{ background: "#E8B84B", color: "#0a0a0a", fontSize: 11, fontFamily: "monospace", fontWeight: 700, padding: "3px 8px", borderRadius: 2, flexShrink: 0, marginLeft: 12 }}>
                      {rec.match}% match
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#555", lineHeight: 1.7, borderTop: "1px solid #1a1a1a", paddingTop: 10, marginTop: 4 }}>{rec.reason}</div>
                </div>
              ))}
            </div>

            <button onClick={generate} style={{ width: "100%", marginTop: 20, padding: "10px 0", background: "none", border: "1px solid #222", borderRadius: 4, color: "#555", fontFamily: "monospace", fontSize: 11, cursor: "pointer", letterSpacing: "0.08em" }}>
              REGENERATE
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── ARCH OVERLAY ─────────────────────────
function ArchPanel({ onClose }) {
  const sections = [
    {
      title: "Auth & Database",
      items: [
        "Supabase — Postgres + Row Level Security so users only see their own books",
        "Auth: Supabase Auth (email/magic link, Google OAuth)",
        "Schema: users, books (FK → users), reading_sessions",
      ]
    },
    {
      title: "Backend",
      items: [
        "Next.js API Routes (or Hono on Cloudflare Workers for edge speed)",
        "Anthropic SDK server-side — API key never touches the client",
        "Rate limiting via Upstash Redis (free tier recs budget per user)",
      ]
    },
    {
      title: "Free vs. Paid",
      items: [
        "Free: 50 books cap, 5 AI recommendation sessions/month",
        "Paid ($6/mo): Unlimited books, unlimited recs, taste timeline, export",
        "Billing: Stripe Checkout + webhooks → update users.plan in Supabase",
      ]
    },
    {
      title: "AI Layer",
      items: [
        "Server-side call to claude-sonnet with full library context",
        "Prompt includes ratings + personal notes — personalized, not collaborative",
        "Cache last rec set per user in Supabase to avoid re-billing on refresh",
      ]
    },
    {
      title: "Deployment",
      items: [
        "Vercel (Next.js) — zero config, preview deploys per branch",
        "Supabase project on Free → Pro as you scale",
        "Domain → Vercel → done. Under $25/mo total until significant scale",
      ]
    },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: 32, width: "min(600px, 94vw)", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#f0ebe0", fontSize: 22, margin: "0 0 4px" }}>Stack Blueprint</h2>
            <div style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>RECOMMENDED ARCHITECTURE</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sections.map((s, i) => (
            <div key={i} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 4, padding: 18 }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#E8B84B", letterSpacing: "0.1em", marginBottom: 12 }}>{i+1}. {s.title.toUpperCase()}</div>
              {s.items.map((item, j) => (
                <div key={j} style={{ display: "flex", gap: 10, marginBottom: j < s.items.length-1 ? 8 : 0 }}>
                  <span style={{ color: "#333", flexShrink: 0 }}>—</span>
                  <span style={{ color: "#666", fontSize: 13, lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ width: "100%", marginTop: 20, padding: "10px 0", background: "none", border: "1px solid #222", borderRadius: 4, color: "#555", fontFamily: "monospace", fontSize: 11, cursor: "pointer", letterSpacing: "0.08em" }}>CLOSE</button>
      </div>
    </div>
  );
}

// ───────────────────────── SHARED STYLES ─────────────────────────
const inputStyle = {
  width: "100%", padding: "10px 12px",
  background: "#111", border: "1px solid #222", borderRadius: 4,
  color: "#f0ebe0", fontFamily: "monospace", fontSize: 13,
  outline: "none", boxSizing: "border-box",
};
const labelStyle = {
  display: "block", fontSize: 10, color: "#555",
  fontFamily: "monospace", letterSpacing: "0.1em",
  marginBottom: 8, textTransform: "uppercase",
};
const tagStyle = {
  background: "#161616", border: "1px solid #222",
  color: "#444", fontFamily: "monospace", fontSize: 10,
  padding: "2px 8px", borderRadius: 2,
};

// ───────────────────────── MAIN APP ─────────────────────────
export default function App() {
  const [books, setBooks] = useState(MOCK_BOOKS);
  const [view, setView] = useState("shelf"); // shelf | stats
  const [modal, setModal] = useState(null); // null | add | rec | arch | {book}
  const [search, setSearch] = useState("");

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.author.toLowerCase().includes(search.toLowerCase())
  );

  const avgRating = books.length ? (books.reduce((a,b) => a + b.rating, 0) / books.length).toFixed(1) : "—";
  const totalPages = books.reduce((a,b) => a + (b.pages || 0), 0);
  const genres = [...new Set(books.map(b => b.genre))];

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#f0ebe0", fontFamily: "monospace" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <header style={{ borderBottom: "1px solid #141414", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#080808", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#f0ebe0", letterSpacing: "-0.02em" }}>shelf</span>
          <span style={{ fontSize: 10, color: "#E8B84B", letterSpacing: "0.2em" }}>AI</span>
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {["shelf","stats"].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ background: "none", border: "none", color: view === v ? "#f0ebe0" : "#333", cursor: "pointer", fontFamily: "monospace", fontSize: 11, letterSpacing: "0.1em", padding: "6px 12px", textTransform: "uppercase" }}>
              {v}
            </button>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setModal("arch")}
            style={{ background: "none", border: "1px solid #1e1e1e", color: "#444", cursor: "pointer", fontFamily: "monospace", fontSize: 10, padding: "5px 10px", borderRadius: 3, letterSpacing: "0.06em" }}>
            STACK ↗
          </button>
          <button onClick={() => setModal("add")}
            style={{ background: "#E8B84B", border: "none", color: "#0a0a0a", cursor: "pointer", fontFamily: "monospace", fontSize: 11, fontWeight: 700, padding: "7px 16px", borderRadius: 3, letterSpacing: "0.08em" }}>
            + LOG BOOK
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        {/* STATS BAR */}
        <div style={{ display: "flex", gap: 1, marginBottom: 32, background: "#111", border: "1px solid #141414", borderRadius: 4, overflow: "hidden" }}>
          {[
            { label: "BOOKS READ", value: books.length },
            { label: "AVG RATING", value: avgRating + " ★" },
            { label: "PAGES", value: totalPages > 0 ? totalPages.toLocaleString() : "—" },
            { label: "GENRES", value: genres.length },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: "16px 20px", borderRight: i < 3 ? "1px solid #141414" : "none" }}>
              <div style={{ fontSize: 10, color: "#333", letterSpacing: "0.12em", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontFamily: "'Playfair Display', serif", color: "#f0ebe0" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {view === "shelf" && (
          <>
            {/* SEARCH + REC */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search your shelf..."
                style={{ ...inputStyle, flex: 1 }} />
              <button
                onClick={() => books.length >= 2 && setModal("rec")}
                disabled={books.length < 2}
                style={{
                  padding: "10px 20px", borderRadius: 4, border: "1px solid",
                  borderColor: books.length >= 2 ? "#E8B84B" : "#1e1e1e",
                  background: "none",
                  color: books.length >= 2 ? "#E8B84B" : "#333",
                  fontFamily: "monospace", fontSize: 11, fontWeight: 700, cursor: books.length >= 2 ? "pointer" : "not-allowed",
                  letterSpacing: "0.08em", whiteSpace: "nowrap",
                }}>
                ✦ GET RECS
              </button>
            </div>

            {/* BOOK GRID */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#222" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18 }}>Your shelf is empty</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>Log your first book to get started</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {filtered.map(b => <BookCard key={b.id} book={b} onClick={b => setModal(b)} />)}
              </div>
            )}
          </>
        )}

        {view === "stats" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ background: "#111", border: "1px solid #141414", borderRadius: 4, padding: 24 }}>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.12em", marginBottom: 20 }}>RATING DISTRIBUTION</div>
              {[5,4,3,2,1].map(r => {
                const count = books.filter(b => b.rating === r).length;
                const pct = books.length ? (count / books.length) * 100 : 0;
                return (
                  <div key={r} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 16, textAlign: "right", color: "#E8B84B", fontSize: 13 }}>{r}</div>
                    <span style={{ color: "#E8B84B", fontSize: 12 }}>★</span>
                    <div style={{ flex: 1, height: 8, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "#E8B84B", borderRadius: 2, transition: "width 0.6s ease" }} />
                    </div>
                    <div style={{ width: 24, color: "#333", fontSize: 12, textAlign: "right" }}>{count}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: "#111", border: "1px solid #141414", borderRadius: 4, padding: 24 }}>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.12em", marginBottom: 16 }}>GENRES</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {genres.map(g => {
                  const count = books.filter(b => b.genre === g).length;
                  return (
                    <div key={g} style={{ background: "#161616", border: "1px solid #222", borderRadius: 3, padding: "6px 14px", display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: "#666", fontSize: 12 }}>{g}</span>
                      <span style={{ background: "#E8B84B", color: "#0a0a0a", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 2 }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ background: "#111", border: "1px solid #141414", borderRadius: 4, padding: 24 }}>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.12em", marginBottom: 16 }}>FREE TIER USAGE</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1, height: 10, background: "#1a1a1a", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: `${(books.length/50)*100}%`, height: "100%", background: books.length > 40 ? "#c0392b" : "#E8B84B", borderRadius: 5 }} />
                </div>
                <div style={{ color: "#555", fontSize: 12, whiteSpace: "nowrap" }}>{books.length} / 50</div>
              </div>
              {books.length > 40 && (
                <div style={{ marginTop: 12, fontSize: 12, color: "#E8B84B" }}>
                  Almost at your limit — upgrade for unlimited shelving
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {modal === "add" && <AddBookModal onClose={() => setModal(null)} onAdd={b => setBooks(prev => [b, ...prev])} />}
      {modal === "rec" && <RecsPanel books={books} onClose={() => setModal(null)} />}
      {modal === "arch" && <ArchPanel onClose={() => setModal(null)} />}
      {modal && modal.id && <BookDetailModal book={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
