# syntax=docker/dockerfile:1
FROM docker.io/oven/bun:1.4.2-alpine AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
COPY apps/super-productivity-plugin/package.json apps/super-productivity-plugin/package.json
COPY packages/a11y-testing/package.json packages/a11y-testing/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/homework/package.json packages/homework/package.json
RUN test "bun@$(bun --version)" = "$(bun -p 'require("./package.json").packageManager')" && bun install --frozen-lockfile

FROM dependencies AS builder
COPY . .
RUN bunx turbo run build --filter @papersync/web

FROM dependencies AS production-dependencies
RUN rm -rf node_modules apps/*/node_modules packages/*/node_modules && bun install --frozen-lockfile --production

FROM docker.io/oven/bun:1.4.2-alpine AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV PLUGIN_ARCHIVE_PATH=/app/papersync-plugin.zip
COPY --from=builder /app/apps/web/.next/standalone /app
COPY --from=production-dependencies /app/node_modules /app/node_modules
COPY --from=builder /app/packages/db/package.json /app/packages/db/
COPY --from=builder /app/packages/db/drizzle.config.ts /app/packages/db/
COPY --from=builder /app/packages/db/src /app/packages/db/src
COPY --from=builder /app/packages/db/migrations /app/packages/db/migrations
COPY --from=production-dependencies /app/packages/db/node_modules /app/packages/db/node_modules
COPY --from=builder /app/packages/typescript-config /app/packages/typescript-config
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/super-productivity-plugin/dist/papersync-plugin.zip /app/papersync-plugin.zip
RUN chmod -R a+rX /app
USER bun
EXPOSE 3000
CMD ["bun", "server.js"]
