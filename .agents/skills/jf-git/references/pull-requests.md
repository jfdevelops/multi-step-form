# Pull requests

Apply the current repository's PR template, title conventions, draft policy, target branch, required checks, and any linked review guidance before composing a PR. Inspect the actual base/head diff rather than inferring its scope from the conversation. For an existing PR, inspect its current title, body, head, and base before updating it.

## Shared defaults

Open ready-for-review PRs unless the user or repository specifies draft status. Use a concise, outcome-focused title; follow the repository's required title format when present. Lead the body with the concrete problem and resulting behavior, then give checks actually run and material limitations. Follow an applicable template rather than imposing a universal section layout.

Keep the description about the final diff for a reviewer who has not read the conversation. Distinguish local checks from remote CI and planned behavior from implemented behavior. Refresh the title/body when the scope changes. Do not claim publishing, deployment, merging, or passing checks that have not occurred.

## Stacks and delivery

Use stacked PRs when a change depends on another unmerged branch. Target the immediate prerequisite branch, identify the dependency and merge order, and explain when the child should be retargeted to the integration branch. Independent changes should use separate PRs without an artificial stack. Cross-repository dependencies should be linked explicitly.

Confirm authorization before pushing or opening PRs. Verify the remote and intended branch, preserve remote work, and avoid force pushes or remote deletions without the applicable authorization. Opening a PR does not authorize merging it. Report the actual PR URL after successful creation or update.
