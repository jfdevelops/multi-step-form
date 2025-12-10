#!/bin/bash
set -e

echo "🔍 Current branch check..."
current_branch=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $current_branch"

valid_branches=("main" "alpha" "beta")
branch_valid=false
for branch in "${valid_branches[@]}"; do
    if [[ "$current_branch" == "$branch" ]]; then
        branch_valid=true
        break
    fi
done

if [[ "$branch_valid" == false ]]; then
    echo "❌ Error: Cannot publish because '$current_branch' is not one of the valid publish branches."
    echo "Valid branches are: ${valid_branches[*]}"
    exit 1
fi

echo "✅ Branch '$current_branch' is valid for publishing"

echo "Publishing alpha packages..."
for pkg_json in packages/*/package.json; do
    pkg_dir=$(dirname "$pkg_json")
    cd "$pkg_dir"
    echo "📦 In $pkg_dir"

    pkg_name=$(node -p "require('./package.json').name")
    echo "Publishing $pkg_name via OIDC..."

    # npm whoami || echo "Not authenticated (no token detected)"

    publish_cmd="pnpm publish --provenance --tag latest --access public --no-git-checks --publish-branch $current_branch"
    echo "Running: $publish_cmd"
    eval "$publish_cmd" || echo "⚠️ Already published or failed"

    cd - >/dev/null
done

echo "🎉 Alpha packages publishing completed successfully"
