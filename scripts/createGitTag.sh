#!/bin/bash
# Create Git tag for version
# Creates and pushes a git tag
# Requires TAG environment variable

set -e

if [ -z "$TAG" ]; then
    echo "❌ TAG environment variable is required"
    echo "Run: TAG=v1.0.0-alpha.1 ./scripts/createGitTag.sh"
    exit 1
fi

echo "Creating git tag: $TAG"
git tag "$TAG"

echo "Pushing tag to origin..."
git push origin "$TAG"

echo "✅ Tag $TAG created and pushed"
