# 1. Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./

# Tools for node-gyp + pg_dump + canvas build deps
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

# pg_dump + chromium runtime deps
RUN apk add --no-cache \
    postgresql-client \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./

RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /app/uploads /app/assets/files/backup /app/images \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3998
CMD ["yarn", "start:prod"]
