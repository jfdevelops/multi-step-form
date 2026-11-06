---
name: jf-coding-conventions
description: Apply jfdevelops coding conventions when implementing or reviewing JavaScript, TypeScript, or React code. Read before editing code; use the target project's toolchain and framework.
---

# Coding conventions

The code-style baseline is the Code styling section of `jfdevelops/glammed-by-arielie`'s `AGENTS.md`.

Read the target manifest, formatter, compiler configuration, and relevant source before changing code. Use configured commands and installed APIs. Preserve the user's existing edits and keep changes within the requested behavior. These conventions do not select optional frameworks or dependencies.

## Functions and callbacks

Use `function` declarations when defining new top-level functions and React components. A function-valued `const` binding is appropriate for the result of a higher-order function, which can then be called later; do not define top-level functions with `const` and an arrow function.

Use arrow functions for function-valued props and callbacks. The exception is a prop or callback defining a React component, where a named `function` helps identify the component in React DevTools.

## Spacing and grouping

- Put a blank line before every `return` statement that follows another statement in the same block. A `return` that is the first statement in a block goes directly after the opening brace, with no blank line.
- Put a blank line before and after functions and brace-delimited code blocks, separating them from neighboring statements. This describes separation between code units, not padding inside every object literal or JSX expression.
- Never put a blank line directly after an opening brace or directly before a closing brace.
- Group related variable declarations together and related functions together; keep unrelated declarations from interleaving those groups.
- Use braces for every `if`, `for`, and `while` body.
- Keep the spacing policy consistent across formatter choices. The selected formatter may control indentation, quotes, and semicolons; it must not weaken these required spacing rules.

```ts
function describeSkill(name: string) {
  const normalizedName = name.trim();
  const hasName = normalizedName.length > 0;

  if (!hasName) {
    return 'Unnamed skill';
  }

  return normalizedName;
}

function describeSkills(names: string[]) {
  return names.map((name) => describeSkill(name));
}
```

A skill documents this policy; generated formatter/linter configuration and project checks must enforce it. Do not claim automatic enforcement until those tools are configured and verified.

## Types and file organization

Let TypeScript infer return types unless a public contract, overload, assertion signature, recursion, or inference limitation requires an annotation. Preserve inference through schemas and factories. Validate unknown input at boundaries and narrow it before use. Fix type mismatches at their source instead of hiding them with broad casts, `any`, or disabled checks.

Keep one component, hook, or cohesive helper concern per file. In apps, import from defining files instead of creating barrel or compatibility re-exports. Libraries may use deliberate public entry points and exports. Keep framework-independent logic separate from framework adapters when both exist.

Keep route-private components and utilities beside their route in `components/` and `utils/` directories, respecting the router's non-route directory convention. Name files within their enclosing context instead of repeating the directory name.

## React composition

When React is present, put conditional class-name logic in the project's `cn` utility rather than directly in `className`. Reuse existing UI primitives and keep presentation independent of data fetching. Apply framework-specific guidance only when that framework is selected in the project.

## Verification

Verify changed behavior with the configured checks. Add tests for meaningful regressions and contracts; library public types also need consumer compilation where affected. Report checks actually run and any limitations. This skill grants no authorization to commit, publish, deploy, or mutate unrelated systems.
