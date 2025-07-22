# Use Node.js 20 with platform forcing
FROM --platform=linux/amd64 node:20-alpine

# Install dependencies
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 8081

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8081"] 