FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4175 PULSO_DATA_DIR=/data
RUN apk add --no-cache tini su-exec
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/seed ./seed
# módulos puros compartilhados com o cliente (ranking diário e recomendação de nível)
COPY --from=build /app/src/ranking.js ./src/ranking.js
COPY --from=build /app/src/trilha.js ./src/trilha.js
COPY --from=build /app/src/utils.js ./src/utils.js
RUN mkdir -p /data && chown -R node:node /data
COPY docker-entrypoint.sh /usr/local/bin/pulso-entrypoint
RUN chmod +x /usr/local/bin/pulso-entrypoint
EXPOSE 4175
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4175/api/health >/dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/pulso-entrypoint"]
CMD ["node", "server/index.js"]
