FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY tsconfig.json vite.config.ts ./
COPY index.html ./
COPY src/ src/
COPY server.ts keyPool.ts datetimeUtils.ts consoleUtils.ts ./

RUN npm run build

ENV NODE_ENV=production
EXPOSE 7860

CMD ["node", "dist/server.cjs"]
