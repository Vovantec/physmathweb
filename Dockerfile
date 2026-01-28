FROM node:20-alpine
WORKDIR /app

# 1. Устанавливаем OpenSSL (критично для Prisma на Alpine)
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

# Генерируем клиент Prisma
RUN npx prisma generate

RUN npm run build
RUN mkdir -p /data
EXPOSE 3000

# Запускаем миграции и сервер
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]