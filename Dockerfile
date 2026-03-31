# ---- Stage 1: Build ----
FROM node:22-slim AS builder

WORKDIR /app

# Copy everything (source files needed for nuxt prepare)
COPY . .

# 1) Delete Mac lockfile
# 2) Install deps WITHOUT running postinstall (avoids oxc/unstorage chicken-egg)
# 3) Run nuxt prepare separately (all deps + source files are present)
# 4) Build
RUN rm -f package-lock.json \
    && npm install --ignore-scripts \
    && npx nuxt prepare \
    && npm run build

# ---- Stage 2: Production ----
FROM node:22-slim AS runner

WORKDIR /app

COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/package.json /app/package.json

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
