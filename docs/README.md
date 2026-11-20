# Documentation

Start with the guide for the way you want to build your form:

- [Choose and install packages](framework/react/v1/installation.md)
- [Create a React form](framework/react/v1/quick-start.md)
- [Build a form editor](framework/react/v1/guides/form-builder.md)
- [Create and export definitions without React](framework/core/v1/guides/definitions.md)
- [Choose a builder validator](framework/core/v1/guides/validators.md)
- [Save builder definitions](framework/core/v1/guides/persistence.md)

These guides describe the packages at major version 1. Existing package-local
guides remain available for advanced instance, storage, and migration topics.

## Contributing

Public pages live under `framework/<framework>/v<major>/`. Use `title`,
`description`, and `order` frontmatter, relative Markdown links, and fenced
examples imported from public packages. There is currently no docs site,
generated navigation, generated API reference, or docs-specific check command.
Do not hand-write an API reference. Verify examples against package exports and
tests, check relative links, and run the repository's required pre-commit checks.
