---
name: jf-naming-conventions
description: Choose names for files, directories, packages, functions, types, and public APIs in jfdevelops projects. Read before adding or renaming these elements.
---

# Naming conventions

Inspect neighboring code, package names, and the project's glossary before naming a new concept. Use the same name for the same domain concept across code, tests, and documentation. Introduce a new term only when the concept is different.

For new projects, use kebab-case for source files and directories, camelCase for variables and functions, and PascalCase for types, classes, and React components. Preserve framework-reserved and generated filenames. Keep an existing project's established naming when adopting these skills; avoid unrelated renames.

Name functions for their action and result, such as `discoverPackageSkills` or `validateSkillManifest`. Name booleans as predicates, such as `isInstalled`, `hasChanges`, or `canPublish`. Use meaningful domain nouns for types rather than implementation suffixes such as `Data` or `Manager` when a more specific name exists.

Keep filenames local to their directory context: `skills/discover.ts` rather than `skills/discover-skills.ts`. Use suffixes that communicate a genuine role, such as `.test.ts`, `.schema.ts`, or `.config.ts`, following the target's conventions.

Use lowercase kebab-case npm package names. Use `@jfdevelops/` for packages intended to belong to that scope; an unrelated consuming project's packages keep their own scope. Name skills with the `jf-` prefix for shared jfdevelops conventions, and make the skill directory match its frontmatter `name`.

Before finishing a rename, update imports, public entry points, tests, documentation, and configuration references. Identify public API or import-path compatibility changes explicitly rather than treating them as an internal rename.
