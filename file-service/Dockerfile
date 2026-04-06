# Builder stage
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --pure-lockfile

COPY default-avatars ./default-avatars

COPY . .

RUN yarn build


# Production stage
FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json ./
COPY scripts/install-conversion-binaries.sh /usr/local/bin/install-conversion-binaries.sh

RUN sed -i 's/\r$//' /usr/local/bin/install-conversion-binaries.sh && \
    chmod +x /usr/local/bin/install-conversion-binaries.sh && \
    /bin/sh /usr/local/bin/install-conversion-binaries.sh

RUN yarn install --production --frozen-lockfile --pure-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/default-avatars ./default-avatars

RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid 1001 --system --create-home --home-dir /home/nodejs --shell /usr/sbin/nologin nodejs && \
    mkdir -p /home/nodejs/.cache/dconf && \
    chown -R nodejs:nodejs /home/nodejs

ENV HOME=/home/nodejs
ENV XDG_CACHE_HOME=/home/nodejs/.cache
USER nodejs

EXPOSE 3001

CMD ["node", "dist/main"]