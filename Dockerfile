# ─── BASE ───────────────────────────────────────────────────────────────
FROM node:26-alpine AS base
# ────────────────────────────────────────────────────────────────────────

# ─── DEPS (dev + build) ─────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY ./package.json ./package-lock.json ./
RUN npm ci
# ────────────────────────────────────────────────────────────────────────

# ─── DEPS (production only) ─────────────────────────────────────────────
FROM base AS deps-prod
WORKDIR /app
COPY ./package.json ./package-lock.json ./
RUN npm ci --omit=dev
# ────────────────────────────────────────────────────────────────────────

# ─── BUILDER ────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY ./package.json ./tsconfig.json ./tsconfig-build.json ./
COPY ./src ./src
RUN npm run build
# ────────────────────────────────────────────────────────────────────────

# ─── RUNNER ─────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /app/storage && chown node:node /app/storage

USER node

EXPOSE 3000
VOLUME ["/app/storage"]

CMD ["node", "dist/index.js"]
# ────────────────────────────────────────────────────────────────────────
