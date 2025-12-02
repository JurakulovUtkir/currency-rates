# 1. Builder stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock ./

# build deps (canvas + pg)
RUN apk add --no-cache \
    python3 g++ make postgresql-client \
    cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev pixman-dev freetype-dev fontconfig-dev

RUN yarn install --frozen-lockfile
COPY . .
RUN npm rebuild bcrypt --build-from-source
RUN yarn build

# 2. Final stage
FROM node:20-alpine AS runner
WORKDIR /app

# RUNTIME libs (note: **librsvg** here, not -dev)
RUN apk add --no-cache \
    postgresql-client \
    cairo pango jpeg giflib librsvg pixman freetype fontconfig

# Tell puppeteer-core where Chromium is
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./

RUN mkdir -p /app/uploads /app/assets/files/backup \
    && chmod -R 777 /app/uploads /app/assets \
    && addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app/uploads /app/assets

USER appuser
EXPOSE 3999
CMD ["yarn", "start:prod"]
