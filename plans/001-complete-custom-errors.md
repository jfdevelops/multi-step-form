# Plan 001: Complete the structured custom-error migration

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report—do not improvise. When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 25e6275..HEAD -- packages/core/src packages/core/test packages/react/src packages/react/test`
> The invariant migration is expected to appear because it is being committed with this plan. If later changes alter the error factory, concrete error pattern, or remaining throw sites described below, compare the excerpts against live code and stop on a semantic mismatch.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `25e6275`, 2026-07-17

## Why this matters

The invariant migration gives library-generated assertion failures structured `code`, `scope`, and `context` data, but direct native throws and platform exceptions still bypass that contract. Consumers therefore cannot reliably discriminate every library failure without parsing messages. Completing this plan makes all library-owned failures structured while deliberately preserving user-owned callback errors and React Suspense control flow.

## Current state

- `packages/core/src/errors/multi-step-form-error.ts` defines `MultiStepFormError`, `createMultiStepFormError`, structured serialization, customizable rendering, and the inherited static `invariant()` method.
- Every concrete error must remain in its own file under `packages/core/src/errors` and follow `packages/core/src/errors/update-mismatch.ts` exactly:

```ts
const scope = 'update' as const;

export interface UpdateMismatchContext
  extends MultiStepFormErrorContext<typeof scope> {
  // structured fields
}

export class UpdateMismatchError extends createMultiStepFormError(
  { code: 'updateMismatch', scope },
)((scope, context: UpdateMismatchContext) => `[${scope}]: ...`) {}
```

- All 64 former standalone invariant call sites now use `SomeCustomError.invariant(condition, context)`.
- Direct library-owned native throws remain at:
  - `packages/core/src/utils/validator.ts:113-120` — asynchronous Standard Schema usage and validation issues.
  - `packages/core/src/utils/logger.ts:73-75,170` — invalid logger wrapping configuration and configured throw-on-error behavior.
  - `packages/core/src/steps/schema.ts:284-300,535-539` — transformation parse failures and unsupported transformation types.
  - `packages/core/src/internals/step-schema.ts:472-475,670,733,881,913-915` — invalid update/reset/context/helper inputs.
  - `packages/core/src/steps/utils.ts:174` and `packages/core/src/steps/fn-utils/helper-fn/index.ts:168-170` — invalid helper step-selection shapes.
  - `packages/react/src/utils.ts:82-91` — user hook execution wrapped in a native `Error`.
- Native platform/serialization exceptions can escape from `packages/core/src/storage.ts:166,190-192` and eager debug `JSON.stringify` calls in Core and React.
- `packages/core/src/errors/update-mismatch.ts:31` uses `JSON.stringify(fields)` while constructing an error. Circular data or `bigint` can replace the intended custom error with a native `TypeError`.
- `makeJsonSafe()` in `packages/core/src/errors/multi-step-form-error.ts` recursively traverses objects without cycle detection and does not serialize `Error` causes meaningfully.
- Runtime tests pass, while the full package `typecheck` scripts currently report test-only generic assertion errors in transformation/reset/update and React field tests. Source builds and source-only typechecks pass.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Core source typecheck | `pnpm exec tsc -p packages/core/tsconfig.build.json --noEmit` | exit 0, no errors |
| Core tests | `pnpm --filter @jfdevelops/multi-step-form-core test -- --run` | all tests pass |
| React tests | `pnpm --filter @jfdevelops/react-multi-step-form test -- --run` | all tests pass |
| Package builds | `pnpm run build:packages` | exit 0; both packages build |
| Full typechecks | `pnpm --filter @jfdevelops/multi-step-form-core typecheck && pnpm --filter @jfdevelops/react-multi-step-form typecheck` | exit 0, no errors |
| Native throw audit | `rg -n "throw new (Error|TypeError)|return new Error" packages/core/src packages/react/src` | no library-owned native error construction remains |
| Legacy invariant audit | `rg -n "(^|[^.[:alnum:]_])invariant\\(" packages/core/src packages/react/src` | only the backward-compatible invariant utility definition, or no matches if removed separately |

## Scope

**In scope**:

- `packages/core/src/errors/*.ts`
- `packages/core/src/index.ts`
- `packages/core/src/storage.ts`
- `packages/core/src/utils/logger.ts`
- `packages/core/src/utils/validator.ts`
- `packages/core/src/steps/schema.ts`
- `packages/core/src/steps/utils.ts`
- `packages/core/src/steps/fn-utils/helper-fn/index.ts`
- `packages/core/src/internals/step-schema.ts`
- Core tests exercising these modules
- `packages/react/src/utils.ts`
- React tests for hook execution failures
- Test-only TypeScript errors that prevent the two documented `typecheck` commands from exiting successfully
- One patch changeset per independently releasable implementation commit

**Out of scope**:

- `throw error` and `throw state.error` in step override handling; these preserve user-owned error identity.
- `throw this.resolveStep(step)` in `suspendStep()`; this is the React Suspense promise contract.
- Test helper throws used to fail a test immediately.
- Errors in `examples/react-basic`.
- Changing public successful-return shapes or step/update behavior.
- Removing the legacy exported `invariant` utility; retain backward compatibility unless handled as a separately approved breaking change.

## Git workflow

- Work on a feature branch, not `main`.
- Use subject-only conventional commits: `type(scope): subject`, lowercase imperative, no period, at most 72 characters.
- Keep each concrete error in its own file and include a patch changeset in every version-impacting commit.
- Do not push or open a PR unless the operator explicitly requests it.

## Steps

### Step 1: Make rendering and serialization total

Update `packages/core/src/errors/multi-step-form-error.ts` so constructing, rendering, and serializing a custom error cannot be replaced by a native serialization failure:

- Add cycle detection to JSON-safe conversion using a `WeakSet<object>`.
- Represent circular references with a stable parseable sentinel such as `"[Circular]"`.
- Convert `bigint`, symbols, functions, dates, and nested `Error` values into deterministic JSON-safe values.
- Establish a structured cause convention. Prefer an optional `cause?: unknown` in contexts plus `ErrorOptions` propagation in the base constructor without making `cause` mandatory for every error.
- Add a shared safe value renderer for error-message renderers and debug logging; do not call raw `JSON.stringify` on unknown values.
- Update `UpdateMismatchError` to use the safe renderer.

**Verify**: add tests to `packages/core/test/errors.test.ts` for circular context, `bigint`, nested causes, and circular `fields`, then run the Core test command; all tests must pass.

### Step 2: Add concrete classes for remaining direct failures

Create one file per class, matching `UpdateMismatchError` with no alternate class pattern. At minimum add:

- `StandardSchemaValidationError` with validation issues, input, and validator metadata.
- `AsyncStandardSchemaError` for a validator that returns a promise where synchronous validation is required.
- `InvalidLoggerConfigError` and `LoggedError` for logger-owned failures.
- `TransformationParseError` for scalar/array parse failures; reuse `InvalidTransformationError` for unsupported transformation names.
- `InvalidResetError` for reset helper selection failures.
- `HookExecutionError` for React hook callbacks, preserving the original exception as `cause`.
- Reuse `InvalidUpdateError`, `InvalidContextError`, and `InvalidHelperInputError` for the remaining direct throws in their existing scopes instead of creating duplicates.
- Add a storage operation class only if `InvalidStorageError` cannot express operation, key, value, and cause without ambiguous context.

Export every class and context type from `packages/core/src/index.ts` so React bindings and consumers can discriminate them.

**Verify**: `pnpm exec tsc -p packages/core/tsconfig.build.json --noEmit` exits 0.

### Step 3: Replace every library-owned direct native throw

Migrate the exact direct throw sites listed under Current state. Use `throw new ConcreteError(context)` for unconditional failures and `ConcreteError.invariant()` only when an actual condition is being asserted. Preserve structured values in context rather than embedding them only in `reason`.

Do not wrap user override errors or the Suspense promise. For `HookExecutionError`, preserve the original error as `cause`; the wrapper is appropriate because the library adds hook name and component-operation context.

**Verify**: run the native throw audit command. Every remaining match must be one of the explicitly out-of-scope pass-through/control-flow sites, not `new Error` or `new TypeError`.

### Step 4: Wrap storage and eager serialization boundaries

In `packages/core/src/storage.ts`, wrap `JSON.parse`, `JSON.stringify`, `Storage.getItem`, `Storage.setItem`, and `Storage.removeItem` failures in a structured storage error containing `operation`, `key`, and `cause`. Fix `hasKey()` so unavailable storage follows the same `throwWhenUndefined` behavior as `get`, `add`, and `remove` instead of leaking a property-access `TypeError`.

Replace eager debug stringification of unknown data in Core and React with the safe renderer from Step 1. Logging must not cause otherwise-successful operations or renders to throw because a value is circular or contains `bigint`.

**Verify**: add storage tests using a throwing `Storage` stub plus circular and malformed JSON values. Run both package test commands; all tests pass.

### Step 5: Strengthen concrete error tests

Update tests that currently assert only `Error`, `TypeError`, or any thrown value. For each migrated family assert:

- concrete class
- literal `code`
- literal `scope`
- structured context fields
- rendered default message
- custom `renderMessage()` override
- `toJSON()` output
- preserved `cause` where applicable

Use `packages/core/test/errors.test.ts` as the structural pattern. Add at least one public API behavior test for validation, transformation, update/reset helper selection, storage, logger, and React hook execution.

**Verify**: both package test commands pass with the new assertions.

### Step 6: Restore full typecheck as a release gate

Run both package `typecheck` scripts. Resolve the existing test-only failures without weakening public types or deleting meaningful assertions. Keep changes limited to test fixture typing unless investigation proves a public declaration is incorrect.

Specific current clusters:

- `packages/core/test/step-schema/as-type-transformations.test.ts`
- `packages/core/test/step-schema/reset.test.ts`
- `packages/core/test/step-schema/update.test.ts`
- `packages/react/test/field.test.tsx`
- `packages/react/test/step-schema/create-component.test.tsx`

**Verify**: both full typecheck commands exit 0 with no diagnostics.

### Step 7: Run the final audit and release checks

Run all commands in Commands you will need. Inspect every remaining `throw` in published source and classify it as custom error, user-error pass-through, or Suspense control flow. Add patch changesets that describe the consumer-visible error contract.

**Verify**: tests, builds, full typechecks, native throw audit, legacy invariant audit, and `git diff --check` all pass.

## Test plan

- Extend `packages/core/test/errors.test.ts` for total serialization, causes, and custom rendering.
- Extend validator tests for synchronous validation issues and asynchronous-schema rejection.
- Extend transformation tests to assert concrete classes and contexts.
- Extend update/reset/helper tests to assert structured selection failures.
- Extend `packages/core/test/storage.test.ts` with malformed persisted JSON, circular input, unavailable store, and throwing Storage methods.
- Extend logger tests or create `packages/core/test/logger.test.ts` for invalid wrapping and configured throwing.
- Extend `packages/react/test/step-schema/create-component.test.tsx` or add a focused utility test for `HookExecutionError` and its cause.
- Model assertions after the concrete custom-error checks in `packages/core/test/errors.test.ts`.

## Done criteria

- [ ] Every library-owned failure created in Core or React is a `MultiStepFormError` subclass.
- [ ] Every concrete error is in its own file and follows the `UpdateMismatchError` factory pattern.
- [ ] Every concrete error is exported with its context type.
- [ ] No library-owned `new Error` or `new TypeError` remains in published source.
- [ ] User override errors retain their original identity.
- [ ] React Suspense promises remain unwrapped.
- [ ] Circular, `bigint`, and nested error contexts render and serialize without throwing.
- [ ] Storage and hook boundaries preserve original exceptions as `cause`.
- [ ] Core and React tests pass.
- [ ] Core and React builds pass.
- [ ] Core and React full typechecks pass without diagnostics.
- [ ] Every version-impacting commit includes a patch changeset.
- [ ] `plans/README.md` marks Plan 001 DONE.

## STOP conditions

Stop and report instead of improvising if:

- Completing structured causes requires changing the public constructor from context-only input.
- A proposed wrapper changes the observable identity of user override errors.
- React Suspense behavior changes or a promise is converted into an error.
- Fixing the test-only typecheck failures requires widening public field/update/reset types to `any` or `unknown`.
- A direct native throw is discovered whose ownership is ambiguous between library and user code.
- Any verification command fails twice after a targeted correction.

## Maintenance notes

- New library failure paths should always start with a concrete class under `packages/core/src/errors`; do not add native error construction and defer migration.
- Keep contexts data-oriented. Messages are presentation; consumers should discriminate `code`, `scope`, and context fields.
- Reviewers should scrutinize cause preservation, cycle handling, and any catch block that may accidentally swallow user exceptions.
- Removing the legacy standalone invariant utility is a separate breaking-change decision and is intentionally deferred.
