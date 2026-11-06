---
name: jf-git
description: Follow repository Git conventions before initializing history, naming or switching branches, staging changes, writing commits, or creating and updating pull requests.
---

# Git

## Read the current repository first

Before making any branch, commit, or PR decision, identify the actual repository root and affected workspace. Read its root and applicable nested agent instructions, CONTRIBUTING guide, linked Git conventions, and PR templates. Inspect configured commit/branch checks and the current Git state. Check recent history and existing PRs for examples when documented rules leave a gap; examples do not override explicit instructions.

Determine the repository's branch prefixes and naming pattern, commit types/scopes/message format, default branch, PR title/body requirements, draft policy, and required checks as relevant to the requested operation. Read only applicable guidance, but resolve it before choosing a name, message, or PR structure. Repeat this lookup when changing repositories, including between a shared package and its consumer; conventions from one repository do not automatically apply to another.

Current explicit user instructions govern conflicts with repository guidance. Applicable repository rules govern over the shared defaults in this folder. If the repository is silent, use those shared defaults. A tool's default prefix or a remembered convention from another project is not a repository rule. Ask only when a material ambiguity remains after inspecting available guidance.

Inspect the current branch, existing history, staged diff, and working tree before mutation. Preserve unrelated work. Follow the user's existing authorization; loading this skill does not itself authorize commits, pushes, PR creation, merges, publishing, or history rewrites.

## Read the relevant reference

- Before initialization, branch naming, creating/switching/renaming branches, or changing workstreams, read [branches and initialization](references/branches.md).
- Before staging, choosing a commit boundary, writing a message, or committing, read [commits](references/commits.md).
- Before choosing PR branches, title, body, draft status, or stack structure, read [pull requests](references/pull-requests.md).

These references are parts of this single Git skill, not independently registered skills. Apply the repository-first lookup above before their defaults.
