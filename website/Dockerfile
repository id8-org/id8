# Single-stage Dockerfile for Next.js website in a monorepo
FROM node:20-alpine

WORKDIR /app

# Copy only package files for better caching
COPY website/package.json website/package-lock.json ./
RUN npm ci --frozen-lockfile

# Copy the rest of the website source
COPY website/. .

# Copy the monorepo root .env file
COPY .env .env

# Force Next.js to use port 4000
ENV PORT=4000

RUN npm run build

EXPOSE 4000
CMD ["npx", "next", "start"] 