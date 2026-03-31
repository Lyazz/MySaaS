# ---- Stage 1: Build ----
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency files first for caching
COPY package.json .npmrc ./

# Install ALL dependencies (postinstall runs nuxt prepare automatically)
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the Nuxt app
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-slim AS runner

WORKDIR /app

# Copy built output
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/package.json /app/package.json

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
