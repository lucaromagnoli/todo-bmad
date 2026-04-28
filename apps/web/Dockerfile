# syntax=docker/dockerfile:1.7
# Build context: repo root.

ARG NODE_VERSION=22-bookworm-slim
ARG NGINX_VERSION=1.27-alpine

# ---------- build: install workspace deps and run vite build ----------
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY e2e/package.json e2e/package.json
RUN npm ci --workspaces --include-workspace-root
COPY tsconfig.base.json tsconfig.base.json
COPY apps/web/ apps/web/
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build --workspace=@todo-bmad/web

# ---------- runtime: nginx with custom config + non-root user ----------
FROM nginx:${NGINX_VERSION} AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
RUN addgroup -S app 2>/dev/null || true && \
    adduser -S -D -G app app 2>/dev/null || true && \
    touch /var/run/nginx.pid && \
    chown -R app:app /var/cache/nginx /var/run/nginx.pid /usr/share/nginx/html /etc/nginx/conf.d
USER app
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=3 \
    CMD wget -q -O - http://127.0.0.1:8080/healthz >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
