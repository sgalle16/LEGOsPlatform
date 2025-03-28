#Build stage
FROM node:22.14.0-alpine AS builder

WORKDIR /app

COPY package*.json .
RUN npm install

COPY . .

RUN npm run build

#Production stage
FROM node:22.14.0-alpine AS production

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm install --production

EXPOSE 5000

CMD ["node", "dist/index.js"]