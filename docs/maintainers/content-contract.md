# Documentation content contract

Public pages live in `docs/framework/<framework>/v<major>/`. The React collection
explains the interface and its runtime integration; the core collection explains
framework-independent runtime behavior. All builder documentation, including
core-only authoring, lives together in `docs/framework/react/v1/builder/`.
That directory forms its own generated navigation group with a dedicated
overview, installation, quick start, and focused guides. Keep builder content out
of the general runtime guides directory.

## Author pages

Use only `title`, `description`, and `order` in frontmatter. Keep order unique
within a directory and use increments of ten for new pages. The site supplies the
page title, so body headings begin at `##` without skipping levels.

Use CommonMark, GitHub tables, and language-labeled code fences. Do not depend on
MDX, raw HTML, or an interactive component renderer. Installation commands use
separate `npm`, `pnpm`, `yarn`, and `bun` fences, in that order.

Open with the reader's task and the feature's purpose. Guides list what the reader
will do, explain each example's important behavior, and end with relative next-step
links. Use concrete domain examples without mentioning outside applications or
repositories. Public guides should explain their own prerequisites rather than
send readers to package-local documentation.

## Keep behavior accurate

Read exports, implementation, and tests before documenting behavior. Distinguish
definition, factory, and instance lifetimes. Distinguish runtime answers from
builder definitions, and completion predicates from navigation enforcement.
Mark incomplete snippets with prose establishing the required surrounding code.

Compile complete examples against public package exports after building the
packages they use. For the walkthrough, create the four files named on the page
in one consumer module directory and type-check them together with strict
TypeScript, DOM libraries, and React JSX enabled. Compile core guide examples in
separate modules to avoid collisions between their demonstration names.

## Audit public utility coverage

Utilities are grouped by task under `core/v1/utilities/`, `react/v1/utilities/`,
and `react/v1/builder/utilities/`. Update their overview tables when adding a new
workflow. Include behavioral limits and a consumer example where the utility is
intended for application use. Identify exported internal construction hooks as
such rather than recommending them over supported instance methods.

Audit runtime exports of core, React, builder core, React builder, and all six
validator adapter packages against the public collection. Include namespace and
instance methods in the review; a package export list alone misses `createHook`,
shared form getters, context hooks, operation scopes, and storage methods.
Document public type helpers separately from runtime calls. A symbol appearing
in text is a discovery check, not evidence that its behavior has been explained.

The utility guides cover value/path extraction, step parsing, helper context,
update/reset factories, labels, dates, resolution, storage, lifecycle, structured
errors, logging, invariants, callable composition, React scheduling, schema
traversal, editor models, adapter compilation, and expression/import emission.

## Generate and check

Run from the repository root:

```sh
pnpm docs:generate
pnpm docs:check
```

These commands derive `docs/docs.json` and directory `meta.json` files from page
frontmatter. Generated navigation stays ignored and must not be authored by hand.
The current generation command deliberately skips API reference; do not add a
hand-maintained reference that duplicates public type signatures.

Use relative `.md` links between public pages and check anchors after renaming
headings. Keep maintainer material out of the public collection. A change to the
Markdown rendering contract requires coordination with the consuming docs site.
