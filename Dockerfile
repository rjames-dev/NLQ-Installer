# NLQ Platform Installer - Standalone Dashboard
# This container provides the installer UI and coordinates deployments
# with a host-side deployment service.
#
# Multi-Architecture Build:
#   Supports both AMD64 (linux/amd64) and ARM64 (linux/arm64) architectures
#   Build: docker buildx build --platform linux/amd64,linux/arm64 .
#
# Environment Variables:
#   PORT - Port for installer UI (default: 3001)
#   DEPLOYMENT_SERVICE_HOST - Host address of deployment service
#                            (auto-detected based on platform)
#   DEPLOYMENT_SERVICE_PORT - Port of deployment service (default: 3002)

ARG BUILDPLATFORM
ARG TARGETPLATFORM

FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy application files
COPY . .

# Build React app (outputs to dist/)
RUN npm run build

# Expose ports for installer dashboard and deployment service
EXPOSE 3001 3002

# Start both services: deployment service in background, installer in foreground
CMD ["sh", "-c", "node deployment-service.js & npm start"]
