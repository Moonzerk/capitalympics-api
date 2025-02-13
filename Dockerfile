FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY .env.example /app/.env
COPY prisma ./prisma

RUN npm install

COPY . .

RUN npm run build

ENV PORT=${PORT}
ENV DB_HOST=${DB_HOST}
ENV DB_USER=${DB_USER}
ENV DB_PWD=${DB_PWD}
ENV DB_NAME=${DB_NAME}
ENV DATABASE_URL=${DATABASE_URL}
ENV JWT_TOKEN=${JWT_TOKEN}
ENV NODE_ENV=production

FROM node:18-alpine

COPY --from=builder /app/.env ./.env
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

RUN npm install pm2 -g

EXPOSE 3001

CMD ["pm2-runtime", "dist/src/index.js"]
