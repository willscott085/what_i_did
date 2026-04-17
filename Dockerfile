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
# Bundle the migration runner to plain JS so it can run with just `node`
RUN npx esbuild src/db/migrate.ts --bundle --platform=node --format=esm --outfile=dist/db/migrate.mjs --packages=external

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
# Migration assets: SQL files + bundled runner
COPY --from=builder /app/drizzle ./drizzle
RUN pnpm install --prod --frozen-lockfile

USER nodejs

EXPOSE 55001

# Migrations run as a separate one-off container:
#   entrypoint: ["node"], command: ["dist/db/migrate.mjs"]
CMD ["node", "dist/server/server.js"]