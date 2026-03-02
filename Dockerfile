FROM node:20-slim

WORKDIR /app

# Install root dependencies
COPY package*.json ./
RUN npm ci --only=production 2>/dev/null || true

# Install gateway dependencies
COPY gateway/package*.json ./gateway/
RUN cd gateway && npm ci --only=production

# Copy gateway application code
COPY gateway/src ./gateway/src

# Create .env if not exists
RUN touch gateway/.env

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

CMD ["node", "gateway/src/index.js"]
