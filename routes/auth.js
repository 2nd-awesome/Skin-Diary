const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const db = require("../db");
const { setSession, clearSession, requireAuth } = require("../middleware/auth");

const router = express.Router();

// A 4-digit passcode only has 10,000 options, so limit guesses per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Wait 15 minutes and try again." },
});

const normalizeEmail = (e) => String(e || "").trim().toLowerCase();
const isValidEmail = (e) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isValidPasscode = (p) => typeof p === "string" && /^\d{4}$/.test(p);

const getUserByEmail = db.prepare("SELECT id, email, passcode_hash FROM users WHERE email = ?");
const insertUser = db.prepare("INSERT INTO users (email, passcode_hash) VALUES (?, ?)");

// Used to keep login timing the same whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync("0000", 10);

// Tells the app whether to show "log in" or "create a passcode".
router.post("/check-email", authLimiter, (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!isValidEmail(email)) return res.status(400).json({ error: "Enter a valid email, like name@example.com." });
  res.json({ exists: Boolean(getUserByEmail.get(email)) });
});

router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { passcode } = req.body;
    if (!isValidEmail(email)) return res.status(400).json({ error: "Enter a valid email, like name@example.com." });
    if (!isValidPasscode(passcode)) return res.status(400).json({ error: "Your passcode must be exactly 4 digits." });
    if (getUserByEmail.get(email)) return res.status(409).json({ error: "An account with this email already exists. Log in instead." });

    const hash = await bcrypt.hash(passcode, 10);
    const { lastInsertRowid } = insertUser.run(email, hash);
    setSession(res, lastInsertRowid);
    res.status(201).json({ user: { id: Number(lastInsertRowid), email } });
  } catch (err) {
    next(err);
  }
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { passcode } = req.body;
    if (!isValidEmail(email) || !isValidPasscode(passcode)) {
      return res.status(400).json({ error: "Enter your email and 4-digit passcode." });
    }
    const user = getUserByEmail.get(email);
    const ok = await bcrypt.compare(passcode, user ? user.passcode_hash : DUMMY_HASH);
    if (!user || !ok) return res.status(401).json({ error: "Wrong passcode. Try again." });

    setSession(res, user.id);
    res.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
