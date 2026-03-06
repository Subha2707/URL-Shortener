import crypto from "crypto";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import linksRouter from "./routes/links.js";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DATA_DIR = path.join(__dirname, "data");
export const DATA_FILE = path.join(DATA_DIR, "links.json");

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- Helper Functions ----------
export const loadLinks = async () => {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(DATA_FILE, JSON.stringify([]));
      return [];
    }
    throw error;
  }
};

export const saveLinks = async (links) => {
  await writeFile(DATA_FILE, JSON.stringify(links, null, 2));
};

// ---------- Home ----------
app.get("/", async (req, res) => {
  const filePath = path.join(__dirname, "views", "index.html");
  const file = await readFile(filePath, "utf-8");

  const links = await loadLinks();
  const limitedLinks = links.slice(0, 5);

  const listItems = limitedLinks.map(link => `
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

// ---------- Shorten ----------
app.post("/", async (req, res) => {
  const { url: originalUrl, shortcode } = req.body;
  if (!originalUrl) return res.status(400).send("URL required");

  const finalShortCode = shortcode || crypto.randomBytes(4).toString("hex");
  const links = await loadLinks();

  if (links.some(l => l.shortcode === finalShortCode)) {
    return res.status(400).send("Shortcode exists");
  }

  links.push({ url: originalUrl, shortcode: finalShortCode, clicks: 0 });
  await saveLinks(links);

  res.redirect("/");
});


// ---------- Links Router ----------
app.use("/links", linksRouter);

// ---------- Redirect ----------
app.get("/:shortcode", async (req, res) => {
  const links = await loadLinks();
  const match = links.find(l => l.shortcode === req.params.shortcode);

  if (!match) return res.status(404).send("Not found");

  match.clicks = (match.clicks || 0) + 1;
  await saveLinks(links);

  res.redirect(match.url);
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});