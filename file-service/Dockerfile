# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --pure-lockfile

COPY default-avatars ./default-avatars

COPY . .

RUN yarn build


# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN yarn install --production --frozen-lockfile --pure-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/default-avatars ./default-avatars

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001

CMD ["node", "dist/main"]