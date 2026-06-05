# syntax=docker/dockerfile:1.7

# ───────────────────────────────────────────────────────────
# 1) Dependencies layer
# ───────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ───────────────────────────────────────────────────────────
# 2) Build layer
# ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ───────────────────────────────────────────────────────────
# 3) Runtime layer (minimal)
# ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user for safety
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# drizzle-orm + postgres aus deps holen (Standalone-Trace deckt das
# postgres-js/migrator-Submodul nicht ab).
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres
# bcryptjs für den Seed-Runner (scripts/seed.mjs) – nicht Teil des Standalone-Trace.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
RUN chmod +x /app/scripts/entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/app/scripts/entrypoint.sh"]
CMD ["node", "server.js"]
