# ---- Stage 1: Build ----
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency files first for caching
COPY package.json ./
COPY .npmrc ./

# Install ALL dependencies (including dev) without running postinstall
RUN npm install --ignore-scripts

# Copy the rest of the source code
COPY . .

# Now run nuxt prepare (all deps are installed) and build
RUN npx nuxt prepare
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-slim AS runner

WORKDIR /app

# Copy built output and production files
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/package.json /app/package.json

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# Start the Nuxt production server
CMD ["node", ".output/server/index.mjs"]
