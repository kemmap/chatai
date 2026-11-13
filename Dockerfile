# Sử dụng Node.js 20 lightweight
FROM node:20-alpine

WORKDIR /app

# Copy package files và cài đặt dependencies
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy mã nguồn và biên dịch TypeScript
COPY src/ ./src/
RUN npm run build

# Loại bỏ devDependencies để container gọn nhẹ nhất
RUN npm prune --production

# Khởi chạy bot
CMD ["node", "dist/index.js"]
