#!/bin/sh
set -e

# Get API and WS URLs from environment variables, with defaults
# In production, we prefer relative URLs handled by index.html defaults
API_URL="${API_URL:-}"
WS_URL="${WS_URL:-}"
STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY:-}"

# Escape special characters for sed (slashes, ampersands, etc.)
# We only do this if the variables are not empty
if [ -n "$API_URL" ]; then
    API_URL_ESCAPED=$(echo "$API_URL" | sed 's/[\/&]/\\&/g')
    find /usr/share/nginx/html -name "index.html" -exec sed -i "s#window.__API_URL__ = .*#window.__API_URL__ = '${API_URL_ESCAPED}';#g" {} \;
fi

if [ -n "$WS_URL" ]; then
    WS_URL_ESCAPED=$(echo "$WS_URL" | sed 's/[\/&]/\\&/g')
    find /usr/share/nginx/html -name "index.html" -exec sed -i "s#window.__WS_URL__ = .*#window.__WS_URL__ = '${WS_URL_ESCAPED}';#g" {} \;
fi

if [ -n "$STRIPE_PUBLISHABLE_KEY" ]; then
    STRIPE_KEY_ESCAPED=$(echo "$STRIPE_PUBLISHABLE_KEY" | sed 's/[\/&]/\\&/g')
    find /usr/share/nginx/html -name "index.html" -exec sed -i "s#window.__STRIPE_PUBLISHABLE_KEY__ = .*#window.__STRIPE_PUBLISHABLE_KEY__ = '${STRIPE_KEY_ESCAPED}';#g" {} \;
fi

# Execute the original command
exec "$@"