import { createServer } from "node:http";
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

createServer((req, res) =>
  staticFile(req, res, () =>
    router(req, res, () => notFound(req, res, () => {})),
  ),
).listen(Number(process.env.PORT ?? 3000));
