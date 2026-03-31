# ---- Stage 1: Build ----
FROM node:22-slim AS builder

WORKDIR /app

COPY . .

# Install deps without postinstall
RUN rm -f package-lock.json && npm install --ignore-scripts

# Generate Prisma client
RUN npx prisma generate

# Run nuxt prepare
RUN npx nuxt prepare

# Build with increased memory
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# ---- Stage 2: Production ----
FROM node:22-slim AS runner

WORKDIR /app

COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=builder /app/package.json /app/package.json

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
