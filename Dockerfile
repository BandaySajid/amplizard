# Stage 1: Build the application
FROM node:latest AS builder

WORKDIR /app

COPY package*.json .

RUN npx pnpm install

COPY . .

RUN npm run build

# Stage 2: Run the application
FROM node:latest AS production

WORKDIR /app

COPY package*.json .
RUN npx pnpm install --prod

COPY --from=builder /app/dist ./dist

#CMD ["node", "/app/dist/main.js"]
