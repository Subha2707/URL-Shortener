import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { readFile } from "fs/promises";

import linksRouter from "./routes/links.js";
import connectDB from "./config/db.js";
import Link from "./models/Link.js";

const app = express();
const PORT = 3000;

// Connect MongoDB
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- Home ----------
app.get("/", async (req, res) => {
  const filePath = path.join(__dirname, "views", "index.html");
  const file = await readFile(filePath, "utf-8");

  const links = await Link.find().limit(5);

  const listItems = links.map(link => `
    <li class="short-card">
      <div class="short-info">
        <a href="/${link.shortcode}" target="_blank">
          ${req.protocol}://${req.get("host")}/${link.shortcode}
        </a>
      </div>

      <form method="POST" action="/links/delete/${link.shortcode}">
        <button class="mini-delete">✕</button>
      </form>
    </li>
  `).join("");

  res.send(file.replace("{{shortened_urls}}", listItems));
});


// ---------- Shorten URL ----------
app.post("/", async (req, res) => {
  const { url: originalUrl, shortcode } = req.body;

  if (!originalUrl) {
    return res.status(400).send("URL required");
  }

  const finalShortCode = shortcode || crypto.randomBytes(4).toString("hex");

  const exists = await Link.findOne({
    shortcode: finalShortCode
  });

  if (exists) {
    return res.status(400).send("Shortcode already exists");
  }

  await Link.create({
    url: originalUrl,
    shortcode: finalShortCode,
    clicks: 0
  });

  res.redirect("/");
});


// ---------- Links Router ----------
app.use("/links", linksRouter);


// ---------- Redirect ----------
app.get("/:shortcode", async (req, res) => {

  const match = await Link.findOne({
    shortcode: req.params.shortcode
  });

  if (!match) {
    return res.status(404).send("Short link not found");
  }

  match.clicks += 1;
  await match.save();

  res.redirect(match.url);
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});