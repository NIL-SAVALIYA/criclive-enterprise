# ==========================================================
# CRICLIVE ENTERPRISE — BACKEND MULTI-STAGE DOCKERFILE
# ==========================================================

# Stage 1: Build Dependencies
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

# Stage 2: Production Execution Image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Security: Run as non-root node user
USER node

COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node src ./src

EXPOSE 5000

CMD ["node", "src/server.js"]
