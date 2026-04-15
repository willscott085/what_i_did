# Stage 1: Install dependencies with pnpm
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Stage 2: Build the app
FROM deps AS builder
COPY . .
RUN pnpm build

# Stage 3: Runtime (small & secure)
FROM node:22-alpine AS runtime
WORKDIR /app

# Non-root user for security (zero-trust container principle)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# Install only what we need for production + migrations
RUN npm install -g pnpm serve

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Run as non-root
USER nodejs

EXPOSE 55001

# Run migrations then start server
CMD ["pnpm", "start"]