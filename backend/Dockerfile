FROM node:20-alpine

# Standard Node.js Alpine image
# node:20-alpine already includes nodejs and yarn/npm


WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build shared package
RUN npm run build -w packages/shared

# Build backend
RUN npm run build -w apps/backend

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start", "-w", "apps/backend"]
