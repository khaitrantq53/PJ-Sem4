FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5173

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./server.js
COPY --from=build /app/dist ./dist

EXPOSE 5173

CMD ["npm", "start"]
