# syntax=docker/dockerfile:1
# Liquid Assets — Node.js frontend server (serves the SPA, proxies /api).

# 1) Build the React app (needs the dev toolchain: vite, react, typescript).
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2) Runtime: just the Express server + its two runtime deps + the built assets.
FROM node:22-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    BACKEND_URL=http://backend:8000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "server.js"]
