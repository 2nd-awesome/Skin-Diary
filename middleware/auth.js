const jwt = require("jsonwebtoken");
const db = require("../db");

const COOKIE_NAME = "sd_session";
const SESSION_DAYS = 7;
const isProd = process.env.NODE_ENV === "production";

let SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  if (isProd) {
    console.error("JWT_SECRET is missing. Set it in your environment before running in production.");
    process.exit(1);
  }
  SECRET = "dev-only-secret-do-not-use-in-production";
  console.warn("Warning: JWT_SECRET is not set, using a development secret. Copy .env.example to .env.");
}

const cookieOptions = {
  httpOnly: true,       // JavaScript in the page can't read it
  sameSite: "lax",
  secure: isProd,       // HTTPS-only when deployed
  path: "/",
};

function setSession(res, userId) {
  const token = jwt.sign({ uid: userId }, SECRET, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 });
}

function clearSession(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

const findUser = db.prepare("SELECT id, email FROM users WHERE id = ?");

function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "You're not logged in." });
  try {
    const payload = jwt.verify(token, SECRET);
    const user = findUser.get(payload.uid);
    if (!user) {
      clearSession(res);
      return res.status(401).json({ error: "This account no longer exists." });
    }
    req.user = user;
    next();
  } catch (e) {
    clearSession(res);
    return res.status(401).json({ error: "Your session has ended. Log in again." });
  }
}

module.exports = { setSession, clearSession, requireAuth };
