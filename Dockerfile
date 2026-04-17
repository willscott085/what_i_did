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

# Install runtime tools
RUN npm install -g pnpm tsx

ENV NODE_ENV=production

# Copy production files + migration source
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/db ./src/db
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

USER nodejs

EXPOSE 55001

# Run migrations then start the server
CMD ["sh", "-c", "pnpm db:migrate && node dist/server/server.js"]