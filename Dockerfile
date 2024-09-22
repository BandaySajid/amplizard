FROM node:20 AS development

ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

COPY package*.json .

RUN npm install

COPY . .

RUN npm run build

FROM node:20 AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

COPY package*.json .

RUN npm install --only=production

COPY --from=development /app/dist ./dist

CMD ["cp","dist/config.sample.js", "dist/config.js"]

CMD ["node","/app/dist/main.js"]
