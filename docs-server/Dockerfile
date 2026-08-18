FROM node:20-alpine

WORKDIR /app

# Зависимости устанавливаются на этапе сборки и запекаются в образ
COPY package*.json ./
RUN npm install --omit=dev

# Код сервера
COPY server.js ./

# Внутренний порт контейнера (наружу пробрасывается через docker-compose)
ENV PORT=3000
ENV DOCS_PATH=/app/docs

EXPOSE 3000

# Документация монтируется как volume, поэтому healthcheck
# просто проверяет, что сервер отвечает на запросы
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]