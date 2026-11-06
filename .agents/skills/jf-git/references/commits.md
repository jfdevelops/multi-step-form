# Commits

Apply the current repository's message format, allowed types/scopes, body/trailer policy, and checks before writing a commit. Review relevant examples only to fill gaps in documented requirements.

## Shared defaults

Use a subject-only message in the form `type(scope): summary`. Use a lowercase, outcome-focused summary and a scope describing the affected area, such as `skills`, `discovery`, `config`, or `auth`. Types are `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `ci`, and `perf`.

```text
feat(discovery): find skills declared by installed packages
fix(config): preserve existing project options
docs(skills): explain package-owned skill discovery
```

Use no attribution or session trailers. Add a body only when explicitly requested or required by the target repository's instructions.

## Commit boundaries and verification

Each commit should represent one reviewable change and contain its directly related tests and documentation. Separate shared-skill changes, consumer adoption, and unrelated feature work when they are distinct changes.

Commit only within the user's authorization. Preserve unrelated staged and unstaged changes and stage explicit paths for the intended commit. Review the staged diff, ensure it contains no unrelated work, and run relevant configured checks before committing. Report the actual result and commit identifier after success; a prepared message or staged diff is not a completed commit.
