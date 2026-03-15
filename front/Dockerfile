FROM node:20-alpine

WORKDIR /app

# Install git for commit hash generation (needed for build script)
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 80

# Use entrypoint to inject environment variables
ENTRYPOINT ["/docker-entrypoint.sh"]

# Start dev server with host binding for Docker (no SSR in dev mode).
# --poll 2000: use polling for file watch so volume-mounted source changes are detected immediately
# (bind mounts often don't propagate inotify events; without this, edits on the host don't trigger rebuilds).
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "80", "--configuration", "development-no-ssr", "--poll", "2000"]
