// Serverless CSV import parser — handles GoodReads exports server-side.
// Accepts POST with JSON body { csv: "...text..." }
// Returns { format, rows, errorCount, error }

const MAX_BYTES = 5 * 1024 * 1024; // 5MB guard

// Required GoodReads columns — used to validate the file is a real GoodReads export
const GOODREADS_REQUIRED = ["title", "author", "exclusive_shelf", "my_rating"];

function parseRow(line) {
  const cols = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      // Handle escaped double-quote inside quoted field
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (c === ',' && !inQ) {
      cols.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  cols.push(cur.trim());
  return cols;
}

function normalizeHeader(h) {
  return h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function getCol(row, headers, ...names) {
  for (const n of names) {
    const i = headers.findIndex(h => h.includes(n));
    if (i >= 0 && i < row.length) return row[i] || "";
  }
  return "";
}

// Normalize a date string like "2023/04/15" or "2023-04" → "YYYY-MM"
function parseDate(raw) {
  if (!raw || !raw.trim()) return null;
  const m = raw.match(/(\d{4})[\/\-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  const y = raw.match(/\d{4}/);
  if (y) return `${y[0]}-01`;
  return null;
}

// GoodReads exports "Last, First" — convert to "First Last"
function normalizeAuthorName(raw) {
  if (!raw || !raw.trim()) return "Unknown";
  const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts[1]} ${parts[0]}`;
  return parts[0] || "Unknown";
}

// Strip ISBN punctuation GoodReads wraps them in: ="1234567890123"
function cleanISBN(raw) {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 13) return digits;
  if (digits.length === 10) return digits; // ISBN-10 as fallback
  return null;
}

function parseCSVServer(text) {
  // Strip UTF-8 BOM if present
  text = text.replace(/^\uFEFF/, "");

  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    return { format: "unknown", rows: [], errorCount: 0, error: "The file appears to be empty or has only one row." };
  }

  const headers = parseRow(lines[0]).map(normalizeHeader);

  // --- Detect format ---
  const hasGoodreads = GOODREADS_REQUIRED.every(col => headers.some(h => h.includes(col)));
  const hasAsin = headers.some(h => h.includes("asin"));
  const hasOrderId = headers.some(h => h.includes("order_id") || h === "orderid");

  let format = "generic";
  if (hasGoodreads) format = "goodreads";
  else if (hasAsin || hasOrderId) format = "amazon";

  // Strict GoodReads validation — if it looks GoodReads-ish but is missing key columns, reject it
  if (!hasGoodreads && !hasAsin && !hasOrderId) {
    const hasTitle = headers.some(h => h.includes("title"));
    if (!hasTitle) {
      return {
        format: "unknown",
        rows: [],
        errorCount: 0,
        error: "This doesn't look like a GoodReads export. Make sure you're uploading the file from GoodReads → My Books → Tools → Export."
      };
    }
  }

  let rows = [];
  let errorCount = 0;

  if (format === "goodreads") {
    rows = lines.slice(1).map((line) => {
      try {
        const row = parseRow(line);
        const title = getCol(row, headers, "title").trim();
        if (!title) return null;

        // Author: GoodReads uses "Last, First" format
        const authorRaw = getCol(row, headers, "author_lf", "author");
        const author = normalizeAuthorName(authorRaw);

        // ISBN: prefer ISBN13, fall back to ISBN
        const isbn13Raw = getCol(row, headers, "isbn13");
        const isbn10Raw = getCol(row, headers, "isbn");
        const isbn = cleanISBN(isbn13Raw) || cleanISBN(isbn10Raw);

        // Rating: 0 in GoodReads means "no rating" → store as null
        const ratingRaw = getCol(row, headers, "my_rating");
        const ratingNum = parseInt(ratingRaw) || 0;
        const rating = ratingNum > 0 ? ratingNum : null;

        // Dates
        const dateReadRaw = getCol(row, headers, "date_read");
        const dateAddedRaw = getCol(row, headers, "date_added");
        const dateRead = parseDate(dateReadRaw) || parseDate(dateAddedRaw) || new Date().toISOString().slice(0, 7);

        // Pages
        const pagesRaw = getCol(row, headers, "number_of_pages", "pages", "num_pages");
        const pages = parseInt(pagesRaw) || null;

        // Status from exclusive_shelf
        const shelfRaw = getCol(row, headers, "exclusive_shelf").toLowerCase().trim();
        let status = "read";
        if (shelfRaw === "to-read") status = "to-read";
        else if (shelfRaw === "currently-reading") status = "read"; // treat as read

        // Review → notes (strip basic HTML tags GoodReads sometimes includes)
        const reviewRaw = getCol(row, headers, "my_review");
        const notes = reviewRaw.replace(/<[^>]+>/g, "").trim() || null;

        return {
          title,
          author,
          isbn,
          rating,
          pages,
          dateRead,
          status,
          notes,
          include: true,
        };
      } catch (e) {
        errorCount++;
        return null;
      }
    }).filter(Boolean);

  } else if (format === "amazon") {
    rows = lines.slice(1).map((line) => {
      try {
        const row = parseRow(line);
        const title = getCol(row, headers, "title", "product_name").trim();
        const category = getCol(row, headers, "category", "product_category");
        if (!title) return null;
        if (!category.toLowerCase().includes("kindle")) return null;

        const dateRaw = getCol(row, headers, "order_date", "orderdate");
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

        return { title, author: "Unknown", isbn: null, rating: null, pages: null, dateRead, status: "read", notes: null, include: true };
      } catch {
        errorCount++;
        return null;
      }
    }).filter(Boolean);

  } else {
    // Generic fallback — best-effort
    rows = lines.slice(1).map((line) => {
      try {
        const row = parseRow(line);
        const title = getCol(row, headers, "title").trim();
        const author = getCol(row, headers, "author") || "Unknown";
        const ratingRaw = getCol(row, headers, "rating");
        const pagesRaw = getCol(row, headers, "pages");
        if (!title) return null;
        const ratingNum = parseInt(ratingRaw) || 0;
        return {
          title,
          author,
          isbn: null,
          rating: ratingNum > 0 ? ratingNum : null,
          pages: parseInt(pagesRaw) || null,
          dateRead: new Date().toISOString().slice(0, 7),
          status: "read",
          notes: null,
          include: true,
        };
      } catch {
        errorCount++;
        return null;
      }
    }).filter(Boolean);
  }

  return { format, rows, errorCount, error: null };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body;
  if (!body || typeof body.csv !== "string") {
    return res.status(400).json({ error: "Missing CSV data in request body." });
  }

  if (body.csv.length > MAX_BYTES) {
    return res.status(413).json({
      error: "File too large. GoodReads exports are usually well under 1MB — make sure you're uploading the right file."
    });
  }

  const result = parseCSVServer(body.csv);
  return res.status(200).json(result);
}
