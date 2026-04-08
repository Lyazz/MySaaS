# ---- Stage 1: Build ----
FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --ignore-scripts

# package-lock.json was generated on macOS, so some platform-specific optional deps
# (used by Nuxt build tooling) are not present for Linux. Install Linux variants
# explicitly to make Docker builds reproducible on the server.
RUN OXC_MINIFY_VERSION="$(node -p 'require("oxc-minify/package.json").version')" && \
    ROLLUP_VERSION="$(node -p 'require("rollup/package.json").version')" && \
    PARCEL_WATCHER_VERSION="$(node -p 'require("@parcel/watcher/package.json").version')" && \
    npm install --ignore-scripts --no-save \
      "@oxc-minify/binding-linux-x64-gnu@${OXC_MINIFY_VERSION}" \
      "@rollup/rollup-linux-x64-gnu@${ROLLUP_VERSION}" \
      "@parcel/watcher-linux-x64-glibc@${PARCEL_WATCHER_VERSION}"

COPY . .

RUN npx prisma generate

RUN npx nuxt prepare

ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# ---- Stage 2: Production ----
FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=builder /app/node_modules/prisma /app/node_modules/prisma
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/prisma /app/prisma

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node .output/server/index.mjs"]
