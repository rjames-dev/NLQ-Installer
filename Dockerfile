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

# Remove node_modules to reduce image size, they'll be used from npm ci above
# Keep them as they're needed for running the server

# Expose port for installer dashboard
EXPOSE 3001

# Start server
CMD ["npm", "start"]
