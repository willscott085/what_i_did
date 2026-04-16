# -------- Base --------
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

# -------- Dependencies --------
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# -------- Build --------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# -------- Production --------
FROM node:22-alpine AS runtime
WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

ENV NODE_ENV=production

# Copy ONLY what we need
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/drizzle ./drizzle

# Install ONLY production deps
COPY --from=builder /app/node_modules ./node_modules

# Create data directory for SQLite (volume mount point)
RUN mkdir -p ./data && chown nodejs:nodejs ./data
VOLUME /app/data

# Drop root
USER nodejs

EXPOSE 3000

CMD ["node", "dist/server/server.js"]