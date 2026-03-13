FROM node:20-bullseye-slim

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && cd backend && npm ci --omit=dev \
  && apt-get purge -y --auto-remove python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY backend ./backend

ENV NODE_ENV=production

WORKDIR /app/backend

CMD ["node", "server.js"]
