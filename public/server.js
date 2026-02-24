import crypto from "crypto";
import { readFile, writeFile, mkdir } from "fs/promises";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const PORT = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//  Paths
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "links.json");

//  Helper: Serve static files
const serveFile = async (res, filePath, contentType) => {
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 page not found");
  }
};

//  Load links safely
const loadLinks = async () => {
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

//  Save links
const saveLinks = async (links) => {
  await writeFile(DATA_FILE, JSON.stringify(links, null, 2));
};

// Create server
const server = createServer(async (req, res) => {
  // ---- GET Requests ----
  if (req.method === "GET") {
    if (req.url === "/") {
      return serveFile(res, path.join(__dirname, "index.html"), "text/html");
    } 
    else if (req.url === "/style.css") {
      return serveFile(res, path.join(__dirname, "style.css"), "text/css");
    } 
    else if (req.url === "/links") {
      const links = await loadLinks();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(links));
    } 
    else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Page not found");
    }
  }

  // ---- POST /shorten ----
  if (req.method === "POST" && req.url === "/shorten") {
    const links = await loadLinks();
    let body = "";

    req.on("data", (chunk) => (body += chunk));

    req.on("end", async () => {
      const { url: originalUrl, shortCode } = JSON.parse(body);

      if (!originalUrl) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("URL is required.");
      }

      const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex");

      // Prevent duplicate shortcodes
      if (links.some((l) => l.shortcode === finalShortCode)) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("Short Code already exists. Please choose another.");
      }

      const newLink = { url: originalUrl, shortcode: finalShortCode };
      links.push(newLink);
      await saveLinks(links);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: newLink }));
    });
  }

  // ---- DELETE /delete/:shortcode ----
  if (req.method === "DELETE" && req.url.startsWith("/delete/")) {
    const shortCode = req.url.split("/delete/")[1];
    const links = await loadLinks();

    const updatedLinks = links.filter((l) => l.shortcode !== shortCode);

    if (updatedLinks.length === links.length) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Shortcode not found.");
    }

    await saveLinks(updatedLinks);
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("Deleted successfully.");
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
