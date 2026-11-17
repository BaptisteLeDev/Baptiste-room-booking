import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import compression from "compression";
import { createQwikCity } from "@builder.io/qwik-city/middleware/node";
import qwikCityPlan from "@qwik-city-plan";
import { manifest } from "@qwik-client-manifest";
import render from "./entry.ssr";

const { router, notFound, staticFile } = createQwikCity({
  render,
  qwikCityPlan,
  manifest,
  static: { cacheControl: "public, max-age=31536000, immutable" },
});

// gzip/deflate for SSR HTML and static assets; Node http does not compress by itself.
// Types expect express req/res; the middleware only uses the plain node http API.
const compress = compression() as unknown as (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => void;

// Room photos live on the backend (private network): the browser only reaches the front.
const MEDIA_UPSTREAM = new URL(
  process.env.API_URL ?? "http://localhost:8080/api",
).origin;

async function proxyMedia(req: IncomingMessage, res: ServerResponse) {
  try {
    const upstream = await fetch(`${MEDIA_UPSTREAM}${req.url}`);
    res.writeHead(upstream.status, {
      "content-type":
        upstream.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": upstream.headers.get("cache-control") ?? "no-store",
    });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    res.writeHead(502).end();
  }
}

createServer((req, res) => {
  if (req.url?.startsWith("/api/media/")) return void proxyMedia(req, res);
  compress(req, res, () =>
    staticFile(req, res, () =>
      router(req, res, () => notFound(req, res, () => {})),
    ),
  );
}).listen(Number(process.env.PORT ?? 3000));
