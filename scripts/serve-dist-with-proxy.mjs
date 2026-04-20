import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const appRoot = process.env.APP_ROOT_OVERRIDE ?? path.resolve(process.cwd());
const distRoot = path.join(appRoot, "dist");
const host = "127.0.0.1";
const frontendPort = Number(process.env.FRONTEND_PORT ?? "8080");
const backendPort = Number(process.env.BACKEND_PORT ?? "4400");

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

if (!fs.existsSync(path.join(distRoot, "index.html"))) {
  console.error(`Missing built frontend at ${distRoot}. Run npm run build first.`);
  process.exit(1);
}

function sendError(res, statusCode, message) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}

function proxyToBackend(req, res) {
  const target = http.request(
    {
      hostname: host,
      port: backendPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (upstream) => {
      res.writeHead(upstream.statusCode ?? 502, upstream.headers);
      upstream.pipe(res);
    },
  );

  target.on("error", (error) => {
    sendError(res, 502, `Backend unavailable: ${error.message}`);
  });

  req.pipe(target);
}

function resolveStaticFile(urlPath) {
  const sanitizedPath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const requestedPath = path.join(distRoot, sanitizedPath);
  const relativePath = path.relative(distRoot, requestedPath);

  if (relativePath.startsWith("..")) {
    return null;
  }

  if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
    return requestedPath;
  }

  return null;
}

const server = http.createServer((req, res) => {
  const method = req.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") {
    sendError(res, 405, "Method not allowed");
    return;
  }

  const requestUrl = new URL(req.url ?? "/", `http://${host}:${frontendPort}`);

  if (requestUrl.pathname.startsWith("/public/")) {
    proxyToBackend(req, res);
    return;
  }

  const directFile =
    requestUrl.pathname === "/"
      ? path.join(distRoot, "index.html")
      : resolveStaticFile(requestUrl.pathname.slice(1));

  const targetFile =
    directFile ??
    (path.extname(requestUrl.pathname) ? null : path.join(distRoot, "index.html"));

  if (!targetFile || !fs.existsSync(targetFile)) {
    sendError(res, 404, "Not found");
    return;
  }

  const extension = path.extname(targetFile).toLowerCase();
  res.writeHead(200, {
    "Content-Type": contentTypes.get(extension) ?? "application/octet-stream",
    "Cache-Control": targetFile.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
  });

  if (method === "HEAD") {
    res.end();
    return;
  }

  fs.createReadStream(targetFile).pipe(res);
});

server.listen(frontendPort, host, () => {
  console.log(`Frontend server listening on http://${host}:${frontendPort}`);
});
