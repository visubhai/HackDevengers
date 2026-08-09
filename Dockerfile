FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configuration files
COPY package.json package-lock.json tsconfig.json ./

# Copy package.json files for workspaces to ensure npm ci works
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
# Using npm install instead of npm ci because package-lock.json might be stale (referencing apps/backend)
RUN npm install

# Copy backend source
COPY backend ./backend

# Build backend
RUN npm run build -w backend

# Production Runner Stage
FROM node:20-alpine AS runner

# Install Chromium and dependencies for Puppeteer/WhatsApp
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app/backend

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package.json ../
COPY --from=builder /app/node_modules ../node_modules
COPY --from=builder /app/backend ./

# Port 10000 is Render's default, 3001 is the app's fallback
EXPOSE 3001
EXPOSE 10000

# Start it directly from the backend directory
CMD ["node", "dist/index.js"]
