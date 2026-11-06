# Branches and initialization

Apply the current repository's conventions identified by the master skill before choosing a branch name or initialization behavior. Preserve existing history and default branches when adopting an established repository.

## Shared defaults

For a new project with no commits, initialize its verified project foundation on `main` and create `chore(init): initialize project` when initialization commits are authorized. Limit it to package metadata, required skills, configuration, documentation, and checks. If Git setup or committing is disabled, report that the initialization commit remains pending.

After initialization, begin a descriptive topic branch before working on a distinct section or idea. Keep one branch per coherent workstream; reuse it for related work rather than creating a branch per file or commit. Keep `main` as the initialization and integration branch.

Every topic branch must have exactly one change-type prefix followed by `/` and a short kebab-case topic: `feat/`, `fix/`, `refactor/`, `docs/`, `style/`, `test/`, `chore/`, `ci/`, or `perf/`. Examples include `feat/skill-discovery`, `docs/project-roadmap`, and `refactor/git-skills`. Use another prefix only when explicitly specified by the user or the current repository's conventions; tool or agent defaults do not qualify. A current user instruction restricting prefixes takes precedence over a conflicting repository default.

## Before switching

Verify the selected name against the resolved conventions. Create or switch branches within the user's authorized workflow; a standing instruction to branch when beginning a section covers that transition for the current task. If independent work depends on unfinished changes, state the dependency and use a deliberate stack rather than mixing unrelated work.

If switching would disturb unrelated changes, preserve them and resolve the workspace choice before proceeding. Do not automatically stash, discard, or move someone else's work. Rename an existing branch when requested without rewriting its commits. Remote branch creation or deletion is a separate operation.
