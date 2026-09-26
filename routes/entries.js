const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const MAX_NOTE = 1000;

// Checks YYYY-MM-DD is a real calendar date and not far in the future.
function isValidDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
  // Allow up to one day ahead of the server's UTC date, for time zones like New Zealand.
  const limit = new Date();
  limit.setUTCDate(limit.getUTCDate() + 1);
  return s <= limit.toISOString().slice(0, 10);
}

const listAll = db.prepare("SELECT date, rating, note FROM entries WHERE user_id = ? ORDER BY date");
const listRange = db.prepare("SELECT date, rating, note FROM entries WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date");
const getOne = db.prepare("SELECT date, rating, note FROM entries WHERE user_id = ? AND date = ?");
const upsert = db.prepare(`
  INSERT INTO entries (user_id, date, rating, note, updated_at)
  VALUES (?, ?, ?, ?, datetime('now'))
  ON CONFLICT (user_id, date) DO UPDATE SET
    rating = excluded.rating,
    note = excluded.note,
    updated_at = excluded.updated_at
`);
const remove = db.prepare("DELETE FROM entries WHERE user_id = ? AND date = ?");

const toObject = (rows) =>
  Object.fromEntries(rows.map((r) => [r.date, { rating: r.rating, note: r.note }]));

// GET /api/entries            -> every entry
// GET /api/entries?from=&to=  -> entries in a date range
router.get("/", (req, res) => {
  const { from, to } = req.query;
  if (from || to) {
    if (!isValidDate(from) || !isValidDate(to)) {
      return res.status(400).json({ error: "Use from and to dates in YYYY-MM-DD format." });
    }
    return res.json({ entries: toObject(listRange.all(req.user.id, from, to)) });
  }
  res.json({ entries: toObject(listAll.all(req.user.id)) });
});

// PUT /api/entries/2026-09-26  { "rating": 4, "note": "..." }
// Leave a field out to keep its current value. rating null clears the stars.
router.put("/:date", (req, res) => {
  const { date } = req.params;
  if (!isValidDate(date)) return res.status(400).json({ error: "Use a real date in YYYY-MM-DD format." });

  const { rating, note } = req.body;
  if (rating !== undefined && rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
    return res.status(400).json({ error: "Rating must be a whole number from 1 to 5." });
  }
  if (note !== undefined && (typeof note !== "string" || note.length > MAX_NOTE)) {
    return res.status(400).json({ error: `Notes can be up to ${MAX_NOTE} characters.` });
  }

  const existing = getOne.get(req.user.id, date) || { rating: null, note: "" };
  const next = {
    rating: rating === undefined ? existing.rating : rating,
    note: note === undefined ? existing.note : note.trim(),
  };

  // Nothing left in this day: remove the row instead of storing an empty one.
  if (next.rating === null && next.note === "") {
    remove.run(req.user.id, date);
    return res.json({ date, entry: null });
  }

  upsert.run(req.user.id, date, next.rating, next.note);
  res.json({ date, entry: next });
});

router.delete("/:date", (req, res) => {
  const { date } = req.params;
  if (!isValidDate(date)) return res.status(400).json({ error: "Use a real date in YYYY-MM-DD format." });
  remove.run(req.user.id, date);
  res.json({ ok: true });
});

module.exports = router;
