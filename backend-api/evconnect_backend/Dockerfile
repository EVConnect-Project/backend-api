# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --production=true

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Copy .env file (use .env.example as template)
COPY .env ./

# Change ownership to non-root user
RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 4000
CMD ["node", "dist/main.js"]
