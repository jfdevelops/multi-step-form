# #!/bin/bash
# Publish alpha packages
# Publishes all packages in the monorepo with the alpha tag
# Requires NODE_AUTH_TOKEN environment variable for npm authentication

set -e

# Get current branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $current_branch"

# Define valid publish branches
valid_branches=("main" "alpha" "beta")

# Check if current branch is in valid branches
branch_valid=false
for branch in "${valid_branches[@]}"; do
    if [[ "$current_branch" == "$branch" ]]; then
        branch_valid=true
        break
    fi
done

# Error if branch is not valid
if [[ "$branch_valid" == false ]]; then
    echo "❌ Error: Cannot publish because '$current_branch' is not one of the valid publish branches."
    echo "Valid branches are: ${valid_branches[*]}"
    exit 1
fi

echo "✅ Branch '$current_branch' is valid for publishing"

if [ -z "$NODE_AUTH_TOKEN" ]; then
    echo "⚠️ Warning: NODE_AUTH_TOKEN not set. Publishing may fail."
    exit 1
fi

echo "Publishing alpha packages..."
for pkg_json in packages/*/package.json; do
    pkg_dir=$(dirname "$pkg_json")

    cd "$pkg_dir"

    echo "in $pkg_dir"

    pkg_name=$(node -p "require('./package.json').name")

    publish_cmd="pnpm publish --tag latest --access public --publish-branch $current_branch --no-git-checks"
    echo "Publishing $pkg_name with command: \"$publish_cmd\""

    eval "$publish_cmd" || echo "Already published or failed"

    cd - >/dev/null
done

echo "📦 Alpha packages publishing completed"
