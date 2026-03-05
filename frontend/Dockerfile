FROM node:20-alpine AS builder
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

RUN npm install

# Копируем все файлы фронтенда
COPY . .

# Собираем
RUN npm run build

# nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]