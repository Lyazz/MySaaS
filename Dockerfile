# ---- Stage 1: Build ----
FROM node:22-slim AS builder

WORKDIR /app

# Copy everything first so nuxt.config.ts is present for postinstall
COPY . .

# Install all deps (postinstall will run nuxt prepare with all files present)
RUN npm install

# Build the Nuxt app
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
