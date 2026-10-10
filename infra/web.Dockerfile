FROM node:24.16.0-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @market/contracts build && pnpm --filter @market/web build
FROM nginx:1.30.5-trixie
COPY infra/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
RUN chown -R nginx:nginx /var/cache/nginx /usr/share/nginx/html
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
