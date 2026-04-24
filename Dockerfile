# -------- Dependencies --------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# -------- Build --------
FROM deps AS builder
ARG VITE_APP_NAME
ARG VITE_VAPID_PUBLIC_KEY
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY
COPY . .
RUN rm -rf .output .vinxi node_modules/.vite node_modules/.cache && pnpm build

# -------- Production Runtime --------
FROM node:22-alpine AS runtime
WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

ENV NODE_ENV=production

# Copy Nitro server output (self-contained, no node_modules needed)
COPY --from=builder /app/.output ./.output
# Production boot wrapper — eagerly starts the scheduler
COPY --from=builder /app/boot.mjs ./
# Migration assets: SQL files + source runner
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/db/migrate.ts ./src/db/migrate.ts
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

USER nodejs

EXPOSE 3000

# Migrations run as a separate one-off container:
#   entrypoint: ["node"], command: ["--experimental-strip-types", "src/db/migrate.ts"]
CMD ["node", "boot.mjs"]