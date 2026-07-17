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

# web-push + Abhängigkeiten (für Push-Benachrichtigungen; vom Standalone-Trace
# nicht erfasst).
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/web-push ./node_modules/web-push
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/asn1.js ./node_modules/asn1.js
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/http_ece ./node_modules/http_ece
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/https-proxy-agent ./node_modules/https-proxy-agent
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/agent-base ./node_modules/agent-base
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/jws ./node_modules/jws
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/jwa ./node_modules/jwa
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/ecdsa-sig-formatter ./node_modules/ecdsa-sig-formatter
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/buffer-equal-constant-time ./node_modules/buffer-equal-constant-time
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/bn.js ./node_modules/bn.js
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/minimalistic-assert ./node_modules/minimalistic-assert
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/minimist ./node_modules/minimist
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/safe-buffer ./node_modules/safe-buffer
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/safer-buffer ./node_modules/safer-buffer
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/inherits ./node_modules/inherits
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/debug ./node_modules/debug
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/ms ./node_modules/ms
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
RUN chmod +x /app/scripts/entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/app/scripts/entrypoint.sh"]
CMD ["node", "server.js"]
