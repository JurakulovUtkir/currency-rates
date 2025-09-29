# 1. Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./

# Install necessary tools including PostgreSQL client (for pg_dump)
RUN apk add --no-cache python3 g++ make postgresql-client

RUN yarn install --frozen-lockfile

COPY . .

RUN npm rebuild bcrypt --build-from-source

RUN yarn build

# 2. Final stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install PostgreSQL client again in the final stage (to use pg_dump)
RUN apk add --no-cache postgresql-client

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./

# 🔐 Create necessary directories and set permissions
RUN mkdir -p /app/uploads /app/assets/files/backup \
    && chmod -R 777 /app/uploads /app/assets

# 👤 Add non-root user and switch
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app/uploads /app/assets

USER appuser

EXPOSE 3999

CMD ["yarn", "start:prod"]
