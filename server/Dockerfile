FROM --platform=linux/arm64 node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/

EXPOSE 3000

CMD ["node", "--max-old-space-size=128", "dist/index.js"]