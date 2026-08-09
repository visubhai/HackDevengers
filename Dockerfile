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

# Copy backend and frontend source code
COPY backend ./backend
COPY frontend ./frontend

# Build backend and frontend
RUN npm run build -w backend && npm run build -w frontend

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

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary build artifacts from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend ./frontend

# Expose ports: 3000 for Next.js (mapped publicly by Render), 3001 for Express API
EXPOSE 3000
EXPOSE 3001

# Start both backend and frontend concurrently
CMD ["sh", "-c", "PORT=3001 node backend/dist/index.js & npm run start -w frontend"]
