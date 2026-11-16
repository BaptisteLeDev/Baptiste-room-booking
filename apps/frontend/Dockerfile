# Production image, build context = repo root (see docker-compose.prod.yml)
FROM node:24-alpine AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --filter @room-booking/frontend... \
  && pnpm --filter @room-booking/frontend build.client \
  && pnpm --filter @room-booking/frontend build.server

FROM node:24-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
# SSR bundle keeps undici external
RUN npm install --no-save --no-package-lock undici@8.12.4
COPY --from=build /app/apps/frontend/dist dist
COPY --from=build /app/apps/frontend/server server
USER node
EXPOSE 3000
CMD ["node", "server/entry.node-server.js"]
