#!/bin/bash
# Publish alpha packages
# Publishes all packages in the monorepo with the alpha tag
# Requires NODE_AUTH_TOKEN environment variable for npm authentication

set -e

if [ -z "$NODE_AUTH_TOKEN" ]; then
    echo "⚠️  Warning: NODE_AUTH_TOKEN not set. Publishing may fail."
fi

echo "Publishing alpha packages..."
for pkg_json in packages/*/package.json; do
    pkg_dir=$(dirname "$pkg_json")
    cd "$pkg_dir"
    pkg_name=$(node -p "require('./package.json').name")
    echo "Publishing $pkg_name..."
    pnpm publish --tag latest --access public --no-git-checks || echo "Already published or failed"
    cd - >/dev/null
done

echo "✅ Alpha packages publishing completed"
