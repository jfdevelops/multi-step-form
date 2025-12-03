#!/bin/bash
# Check for pending Changesets
# Outputs the count to GITHUB_OUTPUT if running in GitHub Actions

set -e

echo "Checking for pending changesets..."
npx changeset status --output status.json
count=$(jq '.changesets | length' status.json)
echo "Found $count pending changeset(s)"

# Output for GitHub Actions if GITHUB_OUTPUT is set
if [ -n "$GITHUB_OUTPUT" ]; then
    echo "count=$count" >> "$GITHUB_OUTPUT"
fi

# Also output as regular variable for non-GitHub Actions usage
echo "CHANGESET_COUNT=$count"
