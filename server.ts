import {
  IncomingMessage,
  ServerResponse,
  createServer,
  request as httpRequest,
} from "node:http";
import { Socket, connect as netConnect } from "node:net";
import type { Duplex } from "node:stream";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || (dev ? "3000" : "30003"), 10);
// HOSTNAME is set in Linux shells to the machine name, which would bind the
// server to a single interface; require an explicit HOST opt-in instead.
const hostname = process.env.HOST || "0.0.0.0";

const CONVEX_HOST = process.env.CONVEX_PROXY_HOST || "127.0.0.1";
const CONVEX_PORT = parseInt(process.env.CONVEX_PROXY_PORT || "3210", 10);
const CONVEX_PREFIX = "/convex";

const app = next({ dev, hostname, port, turbopack: dev });
const handle = app.getRequestHandler();

function stripConvexPrefix(url: string): string | null {
  if (url === CONVEX_PREFIX) return "/";
  if (url.startsWith(CONVEX_PREFIX + "/"))
    return url.slice(CONVEX_PREFIX.length);
  if (url.startsWith(CONVEX_PREFIX + "?"))
    return "/" + url.slice(CONVEX_PREFIX.length);
  return null;
}

function proxyHttp(req: IncomingMessage, res: ServerResponse, target: string) {
  const proxyReq = httpRequest(
    {
      host: CONVEX_HOST,
      port: CONVEX_PORT,
      method: req.method,
      path: target,
      headers: { ...req.headers, host: `${CONVEX_HOST}:${CONVEX_PORT}` },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on("error", (err) => {
    console.error("[convex proxy] http error:", err.message);
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain" });
    }
    res.end("Convex backend unreachable");
  });
  req.pipe(proxyReq);
}

function proxyUpgrade(
  req: IncomingMessage,
  clientSocket: Duplex,
  head: Buffer,
  target: string,
) {
  const upstream = netConnect(CONVEX_PORT, CONVEX_HOST, () => {
    const headers = { ...req.headers, host: `${CONVEX_HOST}:${CONVEX_PORT}` };
    const lines = [`${req.method} ${target} HTTP/${req.httpVersion}`];
    for (const [k, v] of Object.entries(headers)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) for (const vv of v) lines.push(`${k}: ${vv}`);
      else lines.push(`${k}: ${v}`);
    }
    upstream.write(lines.join("\r\n") + "\r\n\r\n");
    if (head && head.length) upstream.write(head);
    upstream.pipe(clientSocket);
    clientSocket.pipe(upstream);
  });
  const teardown = (where: string) => (err: Error) => {
    console.error(`[convex proxy] ws ${where} error:`, err.message);
    upstream.destroy();
    clientSocket.destroy();
  };
  upstream.on("error", teardown("upstream"));
  clientSocket.on("error", teardown("client"));
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const target = stripConvexPrefix(req.url || "/");
    if (target !== null) {
      proxyHttp(req, res, target);
      return;
    }
    handle(req, res).catch((err) => {
      console.error("[next] request error:", err);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });

  // Next attaches its own upgrade listener (for HMR) lazily on the first
  // HTTP request; for /convex paths Next's listener no-ops, so a second
  // listener that proxies /convex is safe to coexist.
  server.on("upgrade", (req, socket, head) => {
    const target = stripConvexPrefix(req.url || "/");
    if (target !== null) {
      proxyUpgrade(req, socket as Socket, head, target);
    }
  });

  server.listen(port, hostname, () => {
    console.log(
      `> Ready on http://${hostname}:${port}` +
        ` (proxy ${CONVEX_PREFIX}/* → ${CONVEX_HOST}:${CONVEX_PORT})`,
    );
  });
});
