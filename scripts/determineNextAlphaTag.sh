#!/bin/bash
# Determine next alpha tag
# Fetches tags and determines the next alpha tag based on the highest version
# Requires VERSION environment variable (from getMaxVersionFromMonorepo.cjs output)
# Outputs the tag to GITHUB_OUTPUT if running in GitHub Actions

set -e

if [ -z "$VERSION" ]; then
    echo "❌ VERSION environment variable is required"
    echo "Run: VERSION=\$(node scripts/getMaxVersionFromMonorepo.cjs | grep 'Highest version:' | awk '{print \$3}') ./scripts/determineNextAlphaTag.sh"
    exit 1
fi

echo "Determining next alpha tag..."
git fetch --tags

latest_tag=$(git tag --list 'v*-alpha.*' | sort -V | tail -n 1)
echo "Latest alpha tag: $latest_tag"

if [ -z "$latest_tag" ]; then
    echo "No previous alpha tags found, starting from v${VERSION}-alpha.1"
    next_tag="v${VERSION}-alpha.1"
else
    # Extract the numeric part after "alpha."
    # For example: v1.0.0-alpha.11 -> 11
    num=$(echo "$latest_tag" | sed -n 's/.*-alpha\.\([0-9]*\)/\1/p')
    if [ -z "$num" ]; then
        echo "⚠️  Could not parse alpha number from tag: $latest_tag"
        echo "Starting from v${VERSION}-alpha.1"
        next_tag="v${VERSION}-alpha.1"
    else
        next_num=$((num + 1))
        # Use the VERSION from monorepo as the base (not the tag's base)
        # This ensures we always use the current version even if it changed
        next_tag="v${VERSION}-alpha.${next_num}"
    fi
fi

echo "Next alpha tag: $next_tag"

# Output for GitHub Actions if GITHUB_OUTPUT is set
if [ -n "$GITHUB_OUTPUT" ]; then
    echo "tag=$next_tag" >> "$GITHUB_OUTPUT"
fi

# Also output as regular variable for non-GitHub Actions usage
echo "NEXT_TAG=$next_tag"
