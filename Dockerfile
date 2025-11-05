# NLQ Platform Installer - Standalone Dashboard
# This container provides the installer UI and coordinates deployments
# with a host-side deployment service.
#
# Environment Variables:
#   PORT - Port for installer UI (default: 3001)
#   DEPLOYMENT_SERVICE_HOST - Host address of deployment service
#                            (auto-detected based on platform)
#   DEPLOYMENT_SERVICE_PORT - Port of deployment service (default: 3002)

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

# Expose port for installer dashboard
EXPOSE 3001

# Start server
# The installer will communicate with the host deployment service
# to execute docker-compose commands on the host machine
CMD ["npm", "start"]
