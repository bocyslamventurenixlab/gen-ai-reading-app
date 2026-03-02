FROM node:20-slim AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy environment variables (required for Vite build)
COPY .env* ./

# Copy source code
COPY src ./src
COPY public ./public
COPY *.html ./
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY eslint.config.js ./

# Build application (with environment variables)
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install serve to run the built app
RUN npm install -g serve

# Copy built application from build stage
COPY --from=build /app/dist ./dist

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

CMD ["serve", "-s", "dist", "-l", "3000"]
