FROM node:24.16.0-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @market/contracts build && pnpm --filter @market/api db:generate && pnpm --filter @market/api build
FROM node:24.16.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
