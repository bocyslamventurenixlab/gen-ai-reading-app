FROM node:20-slim

WORKDIR /app

# Copy and install dependencies first
COPY gateway/package.json gateway/package-lock.json* ./
RUN npm install

# Copy application code
COPY gateway/src ./src

# Create .env if not exists
RUN touch .env

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

CMD ["node", "src/index.js"]
