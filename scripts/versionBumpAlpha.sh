#!/bin/bash
# Version bump (alpha)
# Runs changeset version and commits the changes

set -e

echo "Running changeset version bump..."
npx changeset version

echo "Configuring git user..."
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

echo "Staging changes..."
git add .

echo "Committing version bump..."
git commit -m "chore: bump alpha versions [skip ci]" || echo "No version bump"

echo "Pushing changes..."
git push || echo "No changes to push"

echo "✅ Version bump completed"
