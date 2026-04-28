# syntax=docker/dockerfile:1.7
# Build context: repo root (so npm workspaces resolve).

ARG NODE_VERSION=22-alpine

# ---------- deps: install all workspaces (dev + prod) for the build ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY e2e/package.json e2e/package.json
RUN npm ci --workspaces --include-workspace-root

# ---------- build: compile TypeScript ----------
FROM deps AS build
WORKDIR /app
COPY tsconfig.base.json tsconfig.base.json
COPY apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/
COPY apps/api/src apps/api/src
RUN npm run build --workspace=@todo-bmad/api

# ---------- prod-deps: prod-only install (smaller, no devDependencies) ----------
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY e2e/package.json e2e/package.json
RUN npm ci --workspaces --include-workspace-root --omit=dev && \
    npm cache clean --force

# ---------- runtime: minimal image, non-root, healthcheck ----------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    DATABASE_PATH=/data/app.db
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/dist /app/apps/api/dist
RUN addgroup -S app && adduser -S -G app -h /app -s /sbin/nologin app && \
    mkdir -p /data && chown -R app:app /app /data
USER app
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/index.js"]
