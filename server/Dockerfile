FROM node:20-bookworm-slim AS builder

WORKDIR /app/server

COPY server/package*.json ./
COPY server/prisma ./prisma
RUN npm ci

COPY server/tsconfig.json ./
COPY server/src ./src

RUN npm run build

FROM node:20-bookworm-slim

WORKDIR /app/server

RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init openssl \
  && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./
COPY server/prisma ./prisma
RUN npm ci
RUN npx prisma generate

COPY --from=builder /app/server/dist ./dist

ENV NODE_ENV=production
EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
