# Image JokR : le front compilé et l'API dans un seul conteneur (port 3000).
# Au démarrage, le serveur applique les migrations SQL manquantes puis sert le site.
# Construction : pnpm docker:image (voir README, section Déploiement)

FROM node:24-bookworm-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# Dépendances d'abord : cette étape reste en cache tant que les package.json ne changent pas
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
# Le front appelle l'API sur la même adresse, sous /api
RUN VITE_API_URL=/api pnpm build \
 && pnpm --filter backend build \
 && pnpm --filter backend deploy --prod --legacy /out \
 && cp -r backend/dist /out/dist


FROM node:24-bookworm-slim
ENV NODE_ENV=production \
    PORT=3000 \
    API_PREFIX=/api \
    STATIC_DIR=/app/public \
    MIGRATIONS_DIR=/app/migrations
WORKDIR /app

COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/dist ./dist
COPY --from=build /app/dist ./public
COPY database/migrations ./migrations

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/ping').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/index.js"]
