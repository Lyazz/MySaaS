# ---- Stage 1: Build ----
FROM node:22-slim AS builder

WORKDIR /app

# Copy everything (source files needed for nuxt prepare)
COPY . .

# Delete Mac lockfile and install deps (no postinstall)
RUN rm -f package-lock.json && npm install --ignore-scripts

# Run nuxt prepare separately
RUN npx nuxt prepare

# Build with increased memory
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

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
