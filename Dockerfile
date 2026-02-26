# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy env for Docker
COPY .env.docker .env

# Copy source code
COPY . .

# Build production version
RUN npm run build

# Production stage using Nginx
FROM nginx:alpine

# Copy build output to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Run Nginx
CMD ["nginx", "-g", "daemon off;"]