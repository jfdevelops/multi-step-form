# Plan 002: Fix `validateFields`, default step completeness, step `validate`, Selector remounts, and `isStepComplete` step keys

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **This plan is executed in the library repo**, not in `glammed-by-arielie`:
> `https://github.com/jfdevelops/multi-step-form`
>
> If you are reading this file from the booking app, copy it into that repo as
> `plans/002-fix-validate-fields-selector-is-step-complete.md` (that repo
> already has `plans/001-complete-custom-errors.md`) and update *that* repo's
> `plans/README.md`. Do not implement library changes inside the booking app.
>
> **Drift check (run first, in the library repo)**:
> `git diff --stat 34d4546..HEAD -- packages/core/src packages/core/test packages/react/src packages/react/test`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: library `main` tree `34d4546` (2026-08-13). Consumer reproduction is `glammed-by-arielie` commit `9b30a889`, `src/routes/admin/$resource/-appointments/pane/form.tsx:58`.
- **Published packages this plan targets**: `@jfdevelops/multi-step-form-core@1.0.0-beta.5`, `@jfdevelops/react-multi-step-form@1.0.0-beta.8`

## Why this matters

Consumers already write Standard Schema / arktype objects as `validateFields` and expect that to mean "this step is complete when the current field values pass the schema." Today that property only runs once against **default** values at instantiate time and **throws** if they fail. Completeness ignores it. An explicit `isComplete` is the only working path, which is why the booking app duplicates `isComplete: (values) => step1Schema.allows(values)`.

A provided validator should also (1) type-check field `defaultValue`s against the validator input, and (2) expose `step.validate()` so callers can read issues / parsed output instead of only a boolean. The type-check is the hard part — it is explicitly skippable if it fights inference.

Separately, wrapping reusable fields in `Selector` (the correct API for cross-field UI) remounts the inner `<input>` on every selected-slice update, so typing the first character steals focus. And `instance.stepSchema.isStepComplete(...)` on a named instance (`bookAppointmentForm({ instance: 'admin' })`) types the step argument as `never`, so callers cannot pass `'step1'`.

## Current state

### Consumer reproduction (do not edit in this plan)

In `glammed-by-arielie`:

- `src/multi-step-form/schema.tsx` defines arktype `step1Schema` / `step2Schema` / `step3Schema` and wires completeness by hand:

```ts
isComplete: (values) => step1Schema.allows(values),
```

- `src/routes/admin/$resource/-appointments/pane/form.tsx:57-58`:

```ts
const adminBookingSchema = bookAppointmentForm({ instance: 'admin' });
adminBookingSchema.stepSchema.isStepComplete()
```

Hover / tsc on that call: the parameter is `never`, not `'step1' | 'step2' | 'step3' | 'step4'`. That line is a debug repro only.

- The same file wraps `FirstName` / `LastName` / `Email` / `PhoneNumber` in library `Selector`. Typing the first character remounts the input and drops focus.

### Library files and their roles

- `packages/core/src/utils/validator.ts` — `runStandardValidation` throws on issues or a Promise result.
- `packages/core/src/steps/fields.ts` — `instantiateFields` is the only runtime caller of `validateFields`.
- `packages/core/src/steps/steps.ts` — `instantiateSteps` forwards `validateFields` into `instantiateFields`, then copies only `title` / `description` / `nameTransformCasing` / `fields`. `isComplete` and `validateFields` are not copied onto the instantiated step.
- `packages/core/src/internals/step-schema.ts` — `createStepIsCompleteFn` is the runtime completeness implementation. It only reads `#originalValue[step].isComplete`.
- `packages/core/src/steps/schema.ts` — public `isStepComplete(step)` delegates to `this.value[step].isComplete()`.
- `packages/core/src/define.ts` — `DefineConfig<TSteps, TCasing>` **does not use `TSteps` in its body**, so instance generics collapse to the default `StepConfig` index.
- `packages/core/src/schema.ts` — `declare readonly stepNumbers: StepNumbers<def['steps']>` already keys off declared steps; `isStepComplete` does not.
- `packages/react/src/define.ts` — `bookAppointmentForm({ instance: 'admin' })` returns `MultiStepFormReactInstance<DefineConfig<TSteps, TCasing>>`.
- `packages/react/src/step-schema.ts` — `createStepSpecificComponentImpl` and `createComponentImpl` call `field.create()` / `selector.create()` **inside the React render function**.
- `packages/react/src/field.tsx` — when `selectorFn` is set, `selector.create(...)` also runs during `Field` render.
- `packages/core/test/step-schema/validation.test.ts` — current `validateFields` tests. The "happy" case uses `type({ firstName: 'string' })`, which accepts `''`, so it never hits the throw-on-invalid-defaults bug. The second test expects a throw when schema keys differ from field keys.
- `packages/core/test/field-metadata-and-is-complete.test.ts` — existing `isComplete` behavior (always-true when omitted; custom predicate against current values).
- `packages/react/test/step-schema/for-field.test.tsx` — jsdom `createRoot` + `act` harness to copy for the remount test.
- `packages/react/test/define.test.ts` and `packages/core/test/step-schema/overrides.types.test.ts` — `expectTypeOf` / `@ts-expect-error` patterns.

### Bug 1 — `validateFields` is init-time throw, not ongoing validation

`instantiateFields` (`packages/core/src/steps/fields.ts`), after building resolved fields:

```ts
if (validateFields) {
  const defaultValues = Object.fromEntries(
    Object.entries(resolvedFields).map(([name, value]) => [
      name,
      (value as Record<string, unknown>).defaultValue,
    ])
  );

  runStandardValidation(
    validateFields as StandardSchemaValidator,
    defaultValues
  );
}
```

`runStandardValidation` (`packages/core/src/utils/validator.ts`):

```ts
export function runStandardValidation<Schema extends StandardSchemaValidator>(
  schema: Schema,
  input: StandardSchemaV1.InferInput<Schema>
): StandardSchemaV1.InferOutput<Schema> {
  const result = schema['~standard'].validate(input);

  if (result instanceof Promise) {
    throw new TypeError('Schema validation must be synchronous', {
      cause: schema,
    });
  }

  if (result.issues) {
    throw new Error(JSON.stringify(result.issues, null, 2));
  }

  return result.value;
}
```

So a consumer schema like arktype `type({ firstName: 'string > 0' })` with `defaultValue: ''` **crashes form init**. A schema that accepts empty strings "works" but still does nothing after init. `validateFields` is then discarded; it is not stored on the instantiated step.

There is a leftover `// TODO add field validation` above `resolvedDeepPath` in `packages/core/src/steps/fields.ts`. That TODO is about a different helper. Do not expand it in this plan.

### Bugs 2 and 3 — default `isComplete` ignores `validateFields`; explicit `isComplete` already wins by accident

`createStepIsCompleteFn` (`packages/core/src/internals/step-schema.ts`):

```ts
private createStepIsCompleteFn<targetStep extends StepNumbers<value>>(
  targetStep: targetStep
) {
  return () => {
    const original = (this.#originalValue as Record<string, unknown>)[
      targetStep as string
    ] as { isComplete?: (data: Record<string, unknown>) => boolean } | undefined;

    if (!original || typeof original.isComplete !== 'function') {
      return true;
    }

    const stepValue = this.value[targetStep] as {
      fields: Record<string, { defaultValue: unknown }>;
    };
    const data = Object.fromEntries(
      Object.entries(stepValue.fields).map(([name, field]) => [
        name,
        field.defaultValue,
      ])
    );

    return Boolean(original.isComplete(data));
  };
}
```

Desired contract (this is the product behavior to implement):

| Config | Completeness |
| --- | --- |
| neither `isComplete` nor `validateFields` | always `true` (keep today's default) |
| only `validateFields` | `true` iff the validator **allows** the step's **current** field values (non-throwing) |
| `isComplete` provided | **only** `isComplete(currentValues)` — `validateFields` is ignored even if it would fail |

`isComplete` already overrides `validateFields` today because `validateFields` is never consulted. After the default-`validateFields` change, the override must stay explicit in `createStepIsCompleteFn` (check `isComplete` first).

`instantiateSteps` (`packages/core/src/steps/steps.ts`) must keep reading completeness and validation from `#originalValue`. Do **not** copy the raw `validateFields` schema onto the public instantiated step object. Completeness stays `value.step1.isComplete()`. When a validator was configured, the instantiated step also gets `value.step1.validate()` (see Feature A below).

### Feature A — `step.validate()` when `validateFields` is provided (required)

`BaseStepFunctions` (`packages/core/src/steps/steps.ts`) always adds `isComplete: () => boolean`. It does not add `validate`. `enrichValues` in `packages/core/src/internals/step-schema.ts` attaches `isComplete` next to `update` / `reset` / `createHelperFn` and never attaches a validator runner.

Desired contract:

| Config | Instantiated step API |
| --- | --- |
| no `validateFields` | no `validate` property (type **and** runtime) |
| `validateFields` present | `validate(): StepValidateResult<Output>` |

`validate()` is **not** `isComplete`. Completeness is a boolean. `validate()` returns the Standard Schema outcome for the step's **current** field values and must not throw:

```ts
type StepValidateResult<Output> =
  | { success: true; value: Output }
  | { success: false; issues: ReadonlyArray<StandardSchemaV1.Issue> };
```

A Promise-returning schema is `{ success: false, issues: [...] }` with one issue whose message says validation must be synchronous — or simply `{ success: false, issues: [{ message: 'Schema validation must be synchronous' }] }`. Do not throw.

Do **not** add `stepSchema.validate(step)` in this plan. Only the step object: `instance.stepSchema.value.step1.validate()`.

Attach the function in `enrichValues` the same way `isComplete` is attached (`packages/core/src/internals/step-schema.ts` around the `isComplete: this.createStepIsCompleteFn(targetStep)` line). Conditionally add it only when `#originalValue[step].validateFields` exists.

Type it on `BaseStepFunctions` as a conditional extra:

```ts
& (T['steps'][key] extends { validateFields: infer V }
  ? { validate: () => StepValidateResult<ResolveValidatorOutput<V>> }
  : {})
```

Use the existing `ResolveValidatorOutput` in `packages/core/src/utils/validator.ts` if it fits; otherwise `StandardSchemaV1.InferOutput`. If the conditional extra widens every step or makes `validate` appear on steps without a validator, STOP the type-only part of Feature A and keep the runtime function (runtime is required; the "missing on steps without a validator" type is required too — if you cannot make it absent, report and leave `validate` optional/`validate?:` only as a last resort, then say so in the changeset).

### Feature B — type-safe field defaults vs `validateFields` (skippable)

**Skip this feature if it is not possible in one focused attempt, or if it starts taking too long.** Do not block Features A or bugs 1–5 on it. Time box: one implementation pass plus at most two typecheck / existing-test fix cycles. If a third cycle is needed, or if steps *without* `validateFields` lose field inference, **revert the constraint and continue**. Write `SKIPPED Feature B: <one-line reason>` in the library `plans/README.md` status notes (or the changeset body is fine if you are not allowed to edit that index).

Today `validateFields` is loosely typed:

```ts
validateFields?: Constrain<TValidator, AnyValidator, DefaultValidator>;
```

`fields` and the validator are not related. A consumer can write `fields: { firstName: { defaultValue: '' } }` and `validateFields: type({ age: 'number' })` with no type error.

Desired type-level contract when `validateFields` is provided:

- Field keys and validator **input** keys must match (extra or missing keys are a type error).
- Each field's `defaultValue` must be assignable to that key's validator **input** type.

This is **shape / assignability**, not runtime refinement. arktype `type({ firstName: 'string > 0' })` still types the input as `string`, so `defaultValue: ''` remains valid at the type level. Runtime completeness / `validate()` still reject `''`. A real type error looks like `age: { defaultValue: '' }` against `type({ age: 'number' })`, or a key mismatch.

Suggested approach (try this first; do not invent a larger type system):

In `packages/core/src/steps/steps.ts` / `fields.ts`, constrain `fields` when a validator is present using `StandardSchemaV1.InferInput<TValidator>` (already in `packages/core/src/utils/validator.ts`) or `ResolveValidatorOutput` **input** if you add a matching input helper. Something in this family:

```ts
type ValidatorInput<V> = V extends StandardSchemaValidator<infer I, infer _O>
  ? I
  : never;

// When validateFields is set, each defaultValue must be assignable to ValidatorInput[key]
// and keyof fields must equal keyof ValidatorInput (no extra, no missing).
```

A `satisfies` / bidirectional constraint on `Config<TFields, TCasing, TValidator>` is enough. Do not change how `defaultValue` is stored at runtime.

If Feature B lands, add the one type-test file in the test plan. If it is skipped, do **not** add that file.

### Bug 4 — Selector remount / focus loss

`createStepSpecificComponentImpl` (`packages/react/src/step-schema.ts`) returns `(fn) => (props) => { ... }`. Inside that **React render function** it does:

```ts
const Field = field.create({ propsCreator, subscribe, getValue, selectorCtx, suspendStep });
const useSelector = createUseSelector(() => this.createResolvedCtx(...) as never, this.subscribe);
const Selector = selector.create(() => this.createResolvedCtx(...) as never, this.subscribe);
const useStep = this.createUseStep(step);
const SuspendStep = this.createStepSuspend(step);
```

`field.create` (`packages/react/src/field.tsx`) ends with `return memo(Field)`. A new component **type** every render means React unmounts the previous input and mounts a new one. Focus is lost.

The comment above that `field.create` call already says "Memoize Field component to prevent remounting on every render". `memo` does not help when the component type identity changes.

The same pattern exists in `createComponentImpl` (multi-step parent) for `useSelector` / `Selector` / `Field`.

`packages/react/src/field.tsx` also calls `selector.create(...)` inside `Field` when `selectorFn` is set. Fix that in the same step so a Field with `selectorFn` does not remount its selected children either.

`Selector` itself is not the broken equality check. It already uses deep equality. Do not rewrite Selector's compare logic.

`propsCreator` already reads live `this.value` / `this.getValue` / `this.update`. Hoisting `field.create` to the factory closure (when `createComponent` / `forField` is invoked, once per created component) is safe.

### Bug 5 — `isStepComplete` generic is `never` on named instances

Public method (`packages/core/src/steps/schema.ts`):

```ts
isStepComplete<targetStep extends StepNumbers<value>>(step: targetStep)
```

`StepNumbers<T> = Extract<keyof T, ValidStepKey>`.

`_instantiateSteps` (`packages/core/src/steps/steps.ts`) wraps the mapped steps in `StripWidenedStepIndex`, which **drops** keys for which `` `step${number}` extends key ``. Concrete keys like `'step1'` are kept. The widened index `` `step${number}` `` is stripped, leaving `{}`. Then `StepNumbers<{}>` is `never`.

The instance return type is `MultiStepFormReactInstance<DefineConfig<TSteps, TCasing>>` (`packages/react/src/define.ts`). Core `DefineConfig` is:

```ts
export type DefineConfig<
  TSteps extends StepConfig = StepConfig,
  TCasing extends CasingType = CasingType,
> = instantiateStepsConfig & NameTransformCasingOptions;
```

`TSteps` and `TCasing` are unused. `instantiateStepsConfig` defaults `TMap` to `StepConfig` (`Record<ValidStepKey, Config>`). Instantiating that config strips every key. That is why

```ts
bookAppointmentForm({ instance: 'admin' }).stepSchema.isStepComplete
```

asks for `never`.

The factory surface already special-cases `stepSchema.value` via `MultiStepFormReactFactoryStepSchema` and `DefineReactValue<TSteps, TCasing>`. The **instance** does not. `MultiStepFormSchema` already has `declare readonly stepNumbers: StepNumbers<def['steps']>` for this exact widening (`packages/core/src/schema.ts`). React `schema.ts` even comments:

```ts
// Read the public value property directly because inferring the class's constrained
// generic can widen exact step keys back to the generic StepConfig index signature.
```

`defineMultiStepForm` also has two step generics (`steps` and `contextualSteps`) that both constrain the `steps` property. Do not "fix" that dual-generic unless a type test still fails after `DefineConfig` threads `TSteps` and `isStepComplete` keys off `def['steps']`.

### Repo conventions to match

- Commits (library `AGENTS.md`): `type(scope): subject` — lowercase imperative, no period, no body, max 72 characters. Example: `fix(core): use validateFields for default step completeness`.
- Do not create a branch unless the operator asks. If they do, the name must be `fix/validate-fields-selector-step-keys` (allowed prefix `fix/`).
- One concrete error class per file if you add an error. This plan should **not** add a new error class. Completeness must not throw.
- Changesets: one patch changeset per version-impacting commit (`.changeset/*.md`). Core and React are separate packages.
- Tests: vitest. New test files test **one** bug or feature only — no extra assertions about labels, storage, overrides, or unrelated APIs.
- Type tests use `expectTypeOf` and `@ts-expect-error` like `packages/core/test/step-schema/overrides.types.test.ts`.
- React DOM tests use the jsdom `createRoot` + `act` harness from `packages/react/test/step-schema/for-field.test.tsx`.

## Commands you will need

Run these from the **library repo root**.

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Core tests (all) | `pnpm --filter @jfdevelops/multi-step-form-core test -- --run` | all pass |
| Core tests (this plan) | `pnpm --filter @jfdevelops/multi-step-form-core test -- --run packages/core/test/step-schema/validate-fields-does-not-throw-on-invalid-defaults.test.ts packages/core/test/step-schema/is-complete-uses-validate-fields.test.ts packages/core/test/step-schema/is-complete-overrides-validate-fields.test.ts packages/core/test/step-schema/step-validate-returns-standard-schema-result.test.ts packages/core/test/step-schema/step-validate-absent-without-validator.types.test.ts packages/core/test/step-schema/is-step-complete-accepts-declared-step-keys.types.test.ts` | those files pass. Also run `packages/core/test/ste…1490 tokens truncated…t accepts the defaults).
- Change the second test so mismatched validator keys **do not throw** at init. Do not add completeness assertions to that file (those belong in the new focused tests). A sufficient replacement assertion is: `expect(() => defineMultiStepForm({ ... }).configure()()).not.toThrow()`.

**Verify**: `pnpm --filter @jfdevelops/multi-step-form-core test -- --run packages/core/test/step-schema/validation.test.ts` → pass.

### Step 3: Default completeness from `validateFields`; let `isComplete` win

Change only `createStepIsCompleteFn` in `packages/core/src/internals/step-schema.ts`.

Target shape:

```ts
private createStepIsCompleteFn<targetStep extends StepNumbers<value>>(
  targetStep: targetStep
) {
  return () => {
    const original = (this.#originalValue as Record<string, unknown>)[
      targetStep as string
    ] as {
      isComplete?: (data: Record<string, unknown>) => boolean;
      validateFields?: StandardSchemaValidator;
    } | undefined;

    const stepValue = this.value[targetStep] as {
      fields: Record<string, { defaultValue: unknown }>;
    };
    const data = Object.fromEntries(
      Object.entries(stepValue.fields).map(([name, field]) => [
        name,
        field.defaultValue,
      ])
    );

    if (original && typeof original.isComplete === 'function') {
      return Boolean(original.isComplete(data));
    }

    if (original?.validateFields) {
      return allowsStandardValidation(original.validateFields, data);
    }

    return true;
  };
}
```

Import `allowsStandardValidation` from `@/utils/validator`.

Update the JSDoc on `isStepComplete` in `packages/core/src/steps/schema.ts` so it documents the three-row contract from "Current state". Also update the comment on `isComplete?` in `instantiateStepsConfig` (`packages/core/src/steps/steps.ts`) from "If omitted, the step is always considered complete" to "If omitted, completeness uses `validateFields` when provided, otherwise the step is always complete."

Do not change the existing tests in `field-metadata-and-is-complete.test.ts` except if they fail. They should still pass: no `isComplete` and no `validateFields` → `true`; custom `isComplete` still runs against current values.

**Verify**: write the three completeness tests from the test plan, then run them → all pass.

### Step 3b: Add `step.validate()` when a validator is configured

In `packages/core/src/utils/validator.ts`, add `StepValidateResult` (export it) and a helper that returns that result without throwing. Reuse the same `~standard.validate` call as `allowsStandardValidation`.

In `packages/core/src/internals/step-schema.ts`, add `createStepValidateFn` next to `createStepIsCompleteFn`. It reads `#originalValue[step].validateFields` and current field `defaultValue`s, then returns `StepValidateResult`.

In `enrichValues`, attach `validate` **only** when that original step has `validateFields`:

```ts
isComplete: this.createStepIsCompleteFn(targetStep),
...(hasValidateFields
  ? { validate: this.createStepValidateFn(targetStep) }
  : {}),
```

In `packages/core/src/steps/steps.ts`, add the conditional `validate` method to `BaseStepFunctions` as specified under Feature A.

**Verify**: write test files 6 and 7 from the test plan and run them → pass. Then run the full core test command → all pass.

### Step 3c: Type-safe defaults vs validator (SKIP if stuck)

**Skip rule (read first):** If this is not possible, or it is taking too long, skip it. Do not spend more than one focused pass plus two fix cycles. If steps without `validateFields` lose autocomplete / `defaultValue` inference, or existing type tests start failing for unrelated reasons, revert Feature B completely and continue with Step 4. Feature A and bugs 1–5 are done criteria either way.

If you proceed: constrain `fields` to the validator input as described under Feature B. Touch only `packages/core/src/steps/steps.ts` and/or `packages/core/src/steps/fields.ts` plus the one type-test file. Do not change runtime instantiate behavior.

**Verify (only if not skipped):** write test file 8 and run it → `'string'` / matching keys pass; wrong `defaultValue` type and mismatched keys are `@ts-expect-error`. Then `pnpm exec tsc -p packages/core/tsconfig.build.json --noEmit` → exit 0, and the existing core type tests still pass.

### Step 4: Type `isStepComplete` from declared step keys

Two coordinated type fixes. Do the smallest set that makes the type tests pass.

1. Thread `TSteps` through `DefineConfig` in `packages/core/src/define.ts`:

```ts
export type DefineConfig<
  TSteps extends StepConfig = StepConfig,
  TCasing extends CasingType = CasingType,
> = instantiateStepsConfig<TSteps> & NameTransformCasingOptions<TCasing>;
```

Check `NameTransformCasingOptions` — if it is not generic, keep `NameTransformCasingOptions` as it is today and only change the `instantiateStepsConfig<TSteps>` part. **Do not invent a `TCasing` argument that the type does not accept.**

2. Change `isStepComplete` (and only that method, unless a sibling method is required for the type test to compile) in `packages/core/src/steps/schema.ts` from `StepNumbers<value>` to declared keys:

```ts
isStepComplete<targetStep extends StepNumbers<def['steps']>>(step: targetStep)
```

`MultiStepFormSchema.stepNumbers` already uses `StepNumbers<def['steps']>`. Match that.

If, after (1) and (2), `createForm({ instance: 'admin' }).stepSchema.isStepComplete` is still `never`, then in `packages/react/src/define.ts` default the instance value generic:

```ts
export interface MultiStepFormReactInstance<
  def extends DefineConfig,
  value extends instantiateReactSteps = instantiateReactSteps<def>,
> extends MultiStepFormSchema<def, value>
```

and/or change the factory call return type from `MultiStepFormReactInstance<DefineConfig<TSteps, TCasing>>` to `MultiStepFormReactInstance<DefineConfig<TSteps, TCasing>, DefineReactValue<TSteps, TCasing>>`.

Do not start rewriting `StripWidenedStepIndex` or the dual `defineMultiStepForm` generics unless both of the above still leave the parameter as `never`. That is a STOP condition.

**Verify**: write the two type-test files from the test plan, then run them. `'step1'` must be accepted. `'step99'` must be a type error. `Parameters<typeof instance.stepSchema.isStepComplete>[0]` must be `'step1'` (or the declared union), not `never`.

### Step 5: Create Field / Selector / hooks once per created component

In `packages/react/src/step-schema.ts`:

`createStepSpecificComponentImpl` currently does `return (fn) => ((props) => { const Field = field.create(...); ... })`.

Change it so `field.create`, `selector.create`, `createUseSelector`, `createUseStep`, and `createStepSuspend` run in the **factory closure** (the function that receives `fn`, or better: once when `createStepSpecificComponentImpl` itself runs), **not** inside the React component that receives `props`.

Target shape:

```ts
return (fn: Function) => {
  const Field = field.create({ ... }); // once
  const useSelector = createUseSelector(...); // once
  const Selector = selector.create(...); // once
  const useStep = this.createUseStep(step); // once
  const SuspendStep = this.createStepSuspend(step); // once

  return ((props: props) => {
    // hooks from extraInput, resolvedCtx, fn(...)
  });
};
```

`propsCreator`, `getValue`, and the `selectorCtx` / `getCtx` thunks must remain functions that read **current** `this.value` when called, not values captured once at create time.

Apply the same hoist in `createComponentImpl` for the multi-step `Selector` / `useSelector` / `Field`.

In `packages/react/src/field.tsx`, if `selectorFn` is present, create the Selector component once in `field.create` (the outer factory), not inside `Field`'s render. Pass the live `selectorCtx` thunk into that stable Selector.

**Verify**: write `packages/react/test/step-schema/selector-does-not-remount-field-input.test.tsx` and run it → pass. Then run the full React test command → all pass.

### Step 6: Changesets and final gates

Add patch changesets:

- Core: `validateFields` no longer throws at init; default step completeness uses it; `isComplete` overrides it; steps with a validator expose `validate()`; `isStepComplete` accepts declared step keys on instances. Mention Feature B only if it landed.
- React: `Field` / `Selector` component types are stable across re-renders so inputs keep focus.

Run every command in "Commands you will need" except you may skip full typecheck if it is already known-red from plan 001 — then run the source build typecheck and both test suites.

**Verify**: `pnpm run build:packages` → exit 0. `git status` shows only in-scope files.

## Test plan

Create **seven** new files (eight if Feature B lands). Each file tests **only** the named bug or feature. Do not assert labels, storage, overrides, helper functions, or unrelated step keys in these files.

Model runtime core tests after the `describe('step isComplete')` block in `packages/core/test/field-metadata-and-is-complete.test.ts` (define → configure → instance → `isStepComplete` / `update`). Model the remount test after `packages/react/test/step-schema/for-field.test.tsx` (`renderInJsdom`, `createRoot`, `act`). Model type tests after `packages/core/test/step-schema/overrides.types.test.ts`.

### 1. `packages/core/test/step-schema/validate-fields-does-not-throw-on-invalid-defaults.test.ts`

Only this:

- Define a step whose `firstName.defaultValue` is `''` and `validateFields` is arktype `type({ firstName: 'string > 0' })` (or any Standard Schema that rejects `''`).
- Assert `() => defineMultiStepForm({...}).configure()()` does **not** throw.

Do not assert completeness in this file.

### 2. `packages/core/test/step-schema/is-complete-uses-validate-fields.test.ts`

Only this:

- Same validator as above. **No** `isComplete` on the step.
- After init, `instance.stepSchema.isStepComplete('step1')` is `false` and `instance.stepSchema.value.step1.isComplete()` is `false`.
- `update` `fields.firstName.defaultValue` to a non-empty string.
- Both completeness checks become `true`.

Do not also test the override case here.

### 3. `packages/core/test/step-schema/is-complete-overrides-validate-fields.test.ts`

Only this:

- `validateFields` rejects the current empty default.
- `isComplete: () => true`.
- `isStepComplete('step1')` is `true`.

Do not also test the no-`isComplete` path here.

### 4. `packages/react/test/step-schema/selector-does-not-remount-field-input.test.tsx`

Only this remount/focus bug:

- Create a named instance with `step1.firstName` default `''`.
- Create `FirstName` **outside** the parent render via `createComponent.forField` (or `stepSchema.value.step1.createComponent.forField`) that renders a real `<input>` using `field.defaultValue` and `field.onInputChange`.
- Create a parent via `createComponent({ stepData: ['step1'], render })` that wraps `FirstName` in library `Selector`, selecting a boolean derived from `firstName` (for example `empty: value === ''`) so the selected slice **changes** on the first character.
- Render the parent. Focus the input. Type one character through the input's `onChange` (inside `act`).
- Assert the **same** input DOM node is still in the document (`toBe` the node captured before typing) and `document.activeElement` is still that node.

Do not assert labels, other fields, or completeness.

### 5. Type tests — declared step keys, not `never`

Create **two** files so each package's regression is isolated. Each file only asserts `isStepComplete`'s parameter type.

`packages/core/test/step-schema/is-step-complete-accepts-declared-step-keys.types.test.ts`:

```ts
const instance = defineMultiStepForm({
  steps: {
    step1: { title: 'Step 1', fields: { firstName: { defaultValue: '' } } },
    step2: { title: 'Step 2', fields: { lastName: { defaultValue: '' } } },
  },
  instances: ['admin', 'client'],
}).configure()({ instance: 'admin' });

expectTypeOf(instance.stepSchema.isStepComplete)
  .parameter(0)
  .toEqualTypeOf<'step1' | 'step2'>();

instance.stepSchema.isStepComplete('step1');

// @ts-expect-error step99 is not a declared step
instance.stepSchema.isStepComplete('step99');
```

`packages/react/test/define/is-step-complete-accepts-declared-step-keys.types.test.ts`:

Same assertions against `@jfdevelops/react-multi-step-form`'s `defineMultiStepForm`. This is the consumer reproduction (`bookAppointmentForm({ instance: 'admin' }).stepSchema.isStepComplete`).

Do not assert `stepNumbers`, `withForm`, storage, or other factory APIs in these files.

### 6. `packages/core/test/step-schema/step-validate-returns-standard-schema-result.test.ts`

Only `validate()` behavior on a step that **has** `validateFields`:

- arktype (or Standard Schema) `type({ firstName: 'string > 0' })`, `defaultValue: ''`, no `isComplete`.
- `instance.stepSchema.value.step1.validate()` returns `{ success: false, issues: ... }` (`success` is `false`; `issues` is a non-empty array).
- After updating `firstName` to `'Taylor'`, `validate()` returns `{ success: true, value: { firstName: 'Taylor' } }` (or the schema's output shape).

Do not call `isStepComplete` in this file. Do not test a step without a validator here.

### 7. `packages/core/test/step-schema/step-validate-absent-without-validator.types.test.ts`

Only the absence of `validate` when no validator is configured:

```ts
const instance = defineMultiStepForm({
  steps: {
    step1: { title: 'Step 1', fields: { firstName: { defaultValue: '' } } },
  },
}).configure()();

// @ts-expect-error validate exists only when validateFields is provided
instance.stepSchema.value.step1.validate;
```

If you also want a positive type assertion, put it in this same file as a **second** `it` that only checks a step *with* `validateFields` has `validate` as a function. Do not add runtime completeness checks.

### 8. `packages/core/test/step-schema/validate-fields-defaults-match-validator.types.test.ts` (Feature B only)

**Do not create this file if Feature B was skipped.**

Only the type relationship between `fields` and `validateFields`:

```ts
defineMultiStepForm({
  steps: {
    step1: {
      title: 'Step 1',
      fields: { firstName: { defaultValue: '' } },
      validateFields: type({ firstName: 'string' }),
    },
  },
});

defineMultiStepForm({
  steps: {
    step1: {
      title: 'Step 1',
      fields: { firstName: { defaultValue: '' } },
      // @ts-expect-error defaultValue is not assignable to number
      validateFields: type({ firstName: 'number' }),
    },
  },
});

defineMultiStepForm({
  steps: {
    step1: {
      title: 'Step 1',
      fields: { firstName: { defaultValue: '' } },
      // @ts-expect-error validator keys do not match field keys
      validateFields: type({ lastName: 'string' }),
    },
  },
});
```

If the constraint lives on `fields` instead of `validateFields`, flip which property gets `@ts-expect-error` — the errors must still fire. Do not add runtime assertions.

**Verification**: the filtered test commands in the table above all pass, then both full package test suites pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] Instantiating a form whose `validateFields` rejects the default values does not throw (test file 1 passes).
- [ ] A step with only `validateFields` is incomplete until current values pass, and complete after they pass (test file 2 passes).
- [ ] A step with both `isComplete: () => true` and a failing `validateFields` is complete (test file 3 passes).
- [ ] Typing into a `forField` input wrapped in `Selector` keeps the same input node and focus (test file 4 passes).
- [ ] `createForm({ instance: 'admin' }).stepSchema.isStepComplete` accepts declared keys and rejects `'step99'`; the parameter type is not `never` (test files 5 pass).
- [ ] A step with `validateFields` has `validate()` that returns `{ success: false, issues }` then `{ success: true, value }` after a valid update (test file 6 passes).
- [ ] A step without `validateFields` does not type `validate` (test file 7 passes).
- [ ] Feature B either: test file 8 passes, **or** it was skipped under the Step 3c skip rule and no Feature B files remain.
- [ ] `pnpm --filter @jfdevelops/multi-step-form-core test -- --run` exits 0.
- [ ] `pnpm --filter @jfdevelops/react-multi-step-form test -- --run` exits 0.
- [ ] `pnpm exec tsc -p packages/core/tsconfig.build.json --noEmit` exits 0.
- [ ] `pnpm run build:packages` exits 0.
- [ ] `field.create(` / `selector.create(` / `createUseSelector(` do not appear inside the React `props =>` function body in `packages/react/src/step-schema.ts` (they may appear in the factory closure that *returns* that function).
- [ ] `runStandardValidation(` is gone from `instantiateFields` in `packages/core/src/steps/fields.ts`.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] Patch changesets exist for core and react.
- [ ] `plans/README.md` status row updated (in the repo where this plan is executed).

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" does not match the excerpts (the library has drifted).
- `validateFields` is commonly a function validator (`ValidatorFn`) rather than a Standard Schema, and `allowsStandardValidation` cannot accept it without a new public validator API. Do not silently wrap function validators.
- Fixing `DefineConfig` and the `isStepComplete` generic still leaves the instance parameter as `never`, and the next change would be rewriting `StripWidenedStepIndex` or the dual `steps` / `contextualSteps` generics on `defineMultiStepForm`.
- Hoisting `Field` / `Selector` breaks step overrides / Suspense (`suspendStep`) and the remount test cannot be made to pass without changing the Suspense contract.
- Completeness or `validate()` would need to become async to support Promise-returning Standard Schemas.
- Feature B is **not** a STOP. Skip it per Step 3c and continue.
- Making `validate` exist on every step (required, not optional) cannot be done without breaking steps that have no validator — report that; do not force `validate` onto those steps.
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file (including the booking app).

## Maintenance notes

- After this ships and the booking app bumps `@jfdevelops/multi-step-form-core` / `@jfdevelops/react-multi-step-form`, steps can use `validateFields: step1Schema` and drop `isComplete: (values) => step1Schema.allows(values)`. Call `step.validate()` when the UI needs issues, not only `isComplete()`. Remove the stray `adminBookingSchema.stepSchema.isStepComplete()` call in `form.tsx`. That app migration is **not** this plan.
- Reviewers should confirm `isComplete` is consulted **before** `validateFields`, and that `validateFields` never throws from completeness, `validate()`, or `instantiateFields`.
- Reviewers should confirm `validate` is absent on steps without `validateFields`.
- Reviewers should confirm `field.create` / `selector.create` are not inside a React render function. A later "optimization" that moves them back into render will reintroduce focus loss.
- If more step-keyed methods (`hasOverrides`, `getStepStatus`, `resolveStep`) still use `StepNumbers<value>` and start showing `never` on instances, retarget them the same way as `isStepComplete`. Do not do that in this plan unless a new type test you were required to write fails because of them.
- Do not reintroduce init-time `runStandardValidation` of defaults. Empty required fields are the normal starting state.
