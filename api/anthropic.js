// Serverless proxy — keeps your Anthropic API key on the server,
// never visible to the browser.

// Allowlisted model prefixes — only these can be used through this proxy
const ALLOWED_MODEL_PREFIXES = ["claude-sonnet-", "claude-haiku-", "claude-opus-"];
const MAX_TOKENS_CAP = 2000;

// Top-level fields we forward to Anthropic — anything else is stripped
const ALLOWED_FIELDS = new Set(["model", "max_tokens", "messages", "system", "stream", "temperature", "top_p", "top_k", "stop_sequences", "metadata"]);

// In-memory rate limit store: { ip -> [timestamps] }
// Persists across warm invocations of the same serverless instance.
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;      // per IP per minute

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) {
    rateLimitMap.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get IP from Vercel headers or fallback
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    "unknown";

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in environment variables." });
  }

  const body = req.body || {};

  // Validate model — must match an allowed prefix
  const model = body.model;
  if (!model || !ALLOWED_MODEL_PREFIXES.some(prefix => model.startsWith(prefix))) {
    return res.status(400).json({ error: `Model not allowed. Use a claude-sonnet-* or claude-haiku-* model.` });
  }

  // Cap max_tokens
  const maxTokens = typeof body.max_tokens === "number"
    ? Math.min(body.max_tokens, MAX_TOKENS_CAP)
    : MAX_TOKENS_CAP;

  // Strip unrecognized top-level fields
  const safeBody = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) safeBody[key] = body[key];
  }
  safeBody.model = model;
  safeBody.max_tokens = maxTokens;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(safeBody),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Proxy request failed." });
  }
}
