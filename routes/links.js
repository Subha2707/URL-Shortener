import express from "express";
import Link from "../models/Link.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const search = req.query.search || "";
  const limit = 20;


  //Search Functionality

  let query = {};

  if (search) {
    query = {
      $or: [
        { url: { $regex: search, $options: "i" } },
        { shortcode: { $regex: search, $options: "i" } }
      ]
    };
  }

  let links = await Link.find(query);

  //Pagination

  const totalPages = Math.ceil(links.length / limit);
  const start = (page - 1) * limit;
  const paginated = links.slice(start, start + limit);

  const cards = paginated.map(link => 
    `
    <div class="link-card">
      <div class="card-header">
        <span class="click-badge">📊 ${link.clicks || 0}</span>
        <button onclick="copyToClipboard('${req.protocol}://${req.get("host")}/${link.shortcode}')">
          📋 Copy
        </button>
      </div>

      <a href="/${link.shortcode}" target="_blank" class="short-link">
        ${req.protocol}://${req.get("host")}/${link.shortcode}
      </a>

      <p class="original-link">${link.url}</p>

      <form method="POST" action="/links/delete/${link.shortcode}">
        <button class="delete-btn">🗑 Delete</button>
      </form>
    </div>
  `).join("");

  const pagination = `
    <div class="pagination">
      ${page > 1 ? `<a href="?page=${page - 1}&search=${search}">Prev</a>` : ""}
      <span>Page ${page} of ${totalPages || 1}</span>
      ${page < totalPages ? `<a href="?page=${page + 1}&search=${search}">Next</a>` : ""}
    </div>
  `;

  res.send(`
    <html>
    <head>
      <link rel="stylesheet" href="/style.css">
      <script src="/script.js" defer></script>
    </head>
    <body>
      <div class="links-page">
        <h1>All Links</h1>

        <form class="search-bar" method="GET" action="/links">
          <input type="text" name="search" placeholder="Search..." value="${search}">
          <button type="submit">Search</button>
        </form>

        <div class="links-grid">
          ${cards}
        </div>

        ${pagination}
        <a href="/" class="back-btn">Back</a>
      </div>
    </body>
    </html>
  `);
});

// Delete Logic 

router.post("/delete/:shortcode", async (req, res) => {
  await Link.deleteOne({
    shortcode: req.params.shortcode
  });

  // Redirect logic
  res.redirect("/links");
});

export default router;