# Repository Agent Rules

## Git branches

- Never create or switch to a new branch unless the user explicitly instructs you to create one.
- A request to commit, push, or open a pull request does not grant permission to create a branch.
- When the user explicitly requests a new branch, its name must start with exactly one of these prefixes followed by `/`: `feat/`, `fix/`, `docs/`, `test/`, `chore/`, `ci/`, `refactor/`, `hotfix/`.
- Never use any other branch prefix, including `agent/`.
- Before creating an authorized branch, confirm the proposed branch name satisfies the allowed-prefix rule.
- Never commit without permission
- New PR will NEVER be a draft
- Commits must always follow this format: type(scope): subject
  - I NEVER want to see any description
