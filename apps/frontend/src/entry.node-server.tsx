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

createServer((req, res) =>
  compress(req, res, () =>
    staticFile(req, res, () =>
      router(req, res, () => notFound(req, res, () => {})),
    ),
  ),
).listen(Number(process.env.PORT ?? 3000));
