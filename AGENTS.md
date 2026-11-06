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

<!-- jfdevelops:start -->

## jfdevelops skills

Read each skill before the work it describes:

- [jf-coding-conventions](.agents/skills/jf-coding-conventions/SKILL.md): Apply jfdevelops coding conventions when implementing or reviewing JavaScript, TypeScript, or React code. Read before editing code; use the target project's toolchain and framework.
- [jf-git](.agents/skills/jf-git/SKILL.md): Follow repository Git conventions before initializing history, naming or switching branches, staging changes, writing commits, or creating and updating pull requests.
- [jf-naming-conventions](.agents/skills/jf-naming-conventions/SKILL.md): Choose names for files, directories, packages, functions, types, and public APIs in jfdevelops projects. Read before adding or renaming these elements.

<!-- jfdevelops:end -->
