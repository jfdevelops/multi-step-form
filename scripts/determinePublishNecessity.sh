#!/bin/bash
# Determine publish necessity
# Scans packages and checks if they need to be published
# Outputs needs_publish to GITHUB_OUTPUT if running in GitHub Actions

set -e

echo "Scanning for packages that need publishing..."
needs_publish=0

for pkg_json in packages/*/package.json; do
    pkg_name=$(node -p "require('./$pkg_json').name")
    local_version=$(node -p "require('./$pkg_json').version")
    echo "Checking $pkg_name (local v${local_version})"
    
    published_version=$(npm view "$pkg_name" version 2>/dev/null || echo "none")
    
    if [ "$published_version" = "none" ]; then
        echo "⚠️  $pkg_name has never been published — will publish."
        needs_publish=1
        elif [ "$published_version" != "$local_version" ]; then
        echo "🚀 $pkg_name mismatch (local=$local_version, published=$published_version) — will publish."
        needs_publish=1
    else
        echo "✅ $pkg_name is up to date."
    fi
done

# Output for GitHub Actions if GITHUB_OUTPUT is set
if [ -n "$GITHUB_OUTPUT" ]; then
    echo "needs_publish=$needs_publish" >> "$GITHUB_OUTPUT"
fi

# Also output as regular variable for non-GitHub Actions usage
echo "NEEDS_PUBLISH=$needs_publish"
