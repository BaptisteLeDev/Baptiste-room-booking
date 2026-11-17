# Production image, build context = repo root (see docker-compose.prod.yml)
FROM node:24-alpine AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --filter @room-booking/backend... \
  && pnpm --filter @room-booking/backend build \
  && pnpm --filter @room-booking/backend deploy --prod --legacy /out \
  && cp -r apps/backend/dist /out/dist

FROM node:24-alpine
ENV NODE_ENV=production PORT=8080 SEED_MOCK_DIR=/app/mock/data
WORKDIR /app
COPY --from=build --chown=node:node /out ./
COPY --from=build /app/mock/data ./mock/data
# GraphQL autoSchemaFile writes src/schema.gql at boot
RUN mkdir -p src && chown node:node src
USER node
EXPOSE 8080
# seed is idempotent (upserts), but availability is rebuilt and reservations reset on every boot
CMD ["sh", "-c", "node node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js && node dist/database/seed.js && exec node dist/main.js"]
