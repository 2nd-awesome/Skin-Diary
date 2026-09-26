require("dotenv").config();

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const entryRoutes = require("./routes/entries");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

// API
app.use("/api/auth", authRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api", (req, res) => res.status(404).json({ error: "That API route doesn't exist." }));

// Front end (public/index.html)
app.use(express.static(path.join(__dirname, "public")));

// Error handler: bad JSON bodies and anything unexpected
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "The request body isn't valid JSON." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server. Try again." });
});

app.listen(PORT, () => {
  console.log(`Skin Diary running at http://localhost:${PORT}`);
});
