FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
# ВАЖНО: Копируем схему Prisma, она нужна для генерации клиента
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
# Точка монтирования
RUN mkdir -p /data
EXPOSE 3000
CMD ["npm", "start"]