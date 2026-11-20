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

Public pages live under `docs/framework/<framework>/v<major>/` from the repository root.
Run the docs commands from this repository:

```sh
pnpm docs:generate
pnpm docs:check
```

The generator derives `docs/docs.json` and per-directory `meta.json` navigation from
page frontmatter. Generated files stay ignored; the website runs these commands
after checking out its pinned repository commit.

Generation skips the API reference. The public guides cover core and React; package-local advanced guides are linked to pinned repository files.
