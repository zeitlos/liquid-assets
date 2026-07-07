// Production frontend server.
//
// Serves the built React SPA and reverse-proxies /api to the Python backend.
// The browser only ever talks to this origin, so there is no CORS to manage
// and the backend URL is a deploy-time env var, not baked into the bundle.
//
// Env:
//   PORT         port to listen on            (default 3000)
//   BACKEND_URL  where the Python API lives    (default http://localhost:8000)

import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const DIST = path.join(__dirname, "dist");

const app = express();
app.disable("x-powered-by");

// 1) Proxy the API to the backend (server-to-server). Keep the /api prefix.
app.use(
  createProxyMiddleware({
    pathFilter: "/api",
    target: BACKEND_URL,
    changeOrigin: true,
    xfwd: true,
  })
);

// 2) This server's own health check.
app.get("/healthz", (_req, res) =>
  res.json({ status: "ok", service: "frontend", backend: BACKEND_URL })
);

// 3) Static assets (hashed, so cache them hard).
app.use(
  express.static(DIST, {
    maxAge: "1y",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html")) res.setHeader("Cache-Control", "no-cache");
    },
  })
);

// 4) SPA fallback — every other GET returns index.html.
app.get("*", (_req, res) => res.sendFile(path.join(DIST, "index.html")));

app.listen(PORT, () => {
  console.log(`🍷 Liquid Assets frontend listening on :${PORT} → API at ${BACKEND_URL}`);
});
