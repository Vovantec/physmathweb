FROM node:20-alpine
WORKDIR /app

# Копируем зависимости
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код (включая .env, если он не в .gitignore, но лучше передавать его отдельно)
COPY . .

# Генерируем Prisma Client (чтобы TS знал типы)
RUN npx prisma generate

# Собираем Next.js приложение
RUN npm run build

# Создаем папку для данных (опционально, если будете выносить БД наружу)
RUN mkdir -p /data

EXPOSE 3000

# ВАЖНО: При запуске сначала накатываем миграции, потом запускаем сервер.
# Это создаст таблицы, если их нет, или обновит их.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]