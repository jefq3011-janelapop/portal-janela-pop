const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 4321);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let filePath = path.join(root, decodeURIComponent(url.pathname));

    if (url.pathname === "/") filePath = path.join(root, "index.html");
    if (url.pathname === "/post") filePath = path.join(root, "post.html");

    const normalized = path.normalize(filePath);
    if (!normalized.startsWith(root)) {
      send(res, 403, "Acesso negado");
      return;
    }

    fs.stat(normalized, (statErr, stat) => {
      if (statErr || !stat.isFile()) {
        send(res, 404, "Arquivo nao encontrado");
        return;
      }

      const ext = path.extname(normalized).toLowerCase();
      fs.readFile(normalized, (readErr, data) => {
        if (readErr) {
          send(res, 500, "Erro ao ler arquivo");
          return;
        }

        send(res, 200, data, types[ext] || "application/octet-stream");
      });
    });
  })
  .listen(port, () => {
    console.log(`Portal Janela Pop: http://localhost:${port}`);
  });
