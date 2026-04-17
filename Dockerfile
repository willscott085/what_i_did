# -------- Dependencies --------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# -------- Build --------
FROM deps AS builder
COPY . .
RUN pnpm build

# -------- Production Runtime --------
FROM node:22-alpine AS runtime
WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

RUN npm install -g pnpm

ENV NODE_ENV=production

# Copy production files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
# Migration assets: SQL files + source runner (executed via node --experimental-strip-types)
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/db/migrate.ts ./src/db/migrate.ts
RUN pnpm install --prod --frozen-lockfile

USER nodejs

EXPOSE 55001

# Migrations run as a separate one-off container:
#   entrypoint: ["node"], command: ["--experimental-strip-types", "src/db/migrate.ts"]
CMD ["node", "dist/server/server.js"]