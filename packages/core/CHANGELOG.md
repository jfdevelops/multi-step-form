# @jfdevelops/multi-step-form-core

## 1.0.0-beta.5

### Patch Changes

- 638a38f: Prevent `withOverrides` from being chained a second time on the same instance, removing the race where a superseded instance's override resolver could still run.
- 94b45a4: Fix storage sync discarding function-valued field metadata (e.g. a date field's `transform`) by restoring it from the in-memory fields instead of the JSON-parsed storage value.

## 1.0.0-beta.4

### Patch Changes

- 6bd7a7d: Add the core `createValueOverride` factory API and immediately run overrides attached with `withOverrides`.
- cdd4ad8: Add configured `defaultOverrides` that run for every form instance.
- aa86af0: Preserve complete resolved field metadata across public core and React helpers.

## 1.0.0-beta.3

### Patch Changes

- 6fea1ed: Preserve step-specific helpers for partial object selectors and isolate configured factory schemas from shared browser storage.

## 1.0.0-beta.2

### Major Changes

- 1c4e6d9: Restore the complete schema surface on form definitions, including a type-only exact step union, while keeping configured instances independent.

  Return `NoCurrentData` and `ProgressText` components from render-context helpers, align single-step instance components with step-specific render inputs, and replace every `createComponent` overload with the object-only `{ render }` API.

## 1.0.0-beta.1

### Major Changes

- c9d8633: Replace the curried `withForm.render` API with `render(context, customProps)`, keep the strongly typed render context subscribed to current step data, and add reactive `getCurrentStepData`, `getProgress`, and `isStepComplete` callbacks so render implementations do not need to call the equivalent hooks. Preserve each step's exact `isComplete` function, remove widened `step${number}` indexes from render context and context-hook targets, preserve contextual typing and custom prop inference through override chains and injected form call sites, and resolve omitted casing to the exact default casing and label types.

  Normalize resolved core step keys before generating step helpers so `update`, `reset`, completion, and helper functions carry only concrete schema steps and are not intersected with duplicate copies during React form enrichment.

  Remove the legacy `createMultiStepFormSchema` factory in favor of the single `defineMultiStepForm(...).configure(...)` flow. Preserve exact field metadata and strongly typed `isComplete` inputs through definition factories, normalize array transformation types to honest arrays of schema step values, and migrate package tests, examples, and documentation to the definition API.

  Strip internal update/reset/component helpers from the runtime `withForm.render` step projection, validate dynamic `isStepComplete` targets with `InvalidStepError`, and make step-specific `enabledForSteps` validation use the same concrete string keys exposed by the public API.

  Remove function-valued properties entirely from resolved updater payloads instead of exposing them as required `never` properties, and make partial path updates recursively accept partial array items.

  Preserve unrelated step state during resets, persist synchronous override failures, recover from malformed stored JSON using form defaults, consistently validate dynamic render-context step targets, and retain exact custom field metadata and resolved step keys through public definition chains.

### Patch Changes

- cad92bf: Make `hasKey()` safely report `false` when storage is unavailable, matching the other storage operations during SSR.

## 1.0.0-beta.0

### Major Changes

- a44ace5: Add `defineMultiStepForm`, an instances-first factory: `defineMultiStepForm({ steps, instances? }).configure({ storage?, update?, nameTransformCasing? })` creates independent named instances that share step/field definitions and helper functions.

  - Storage is optional and per-instance via `configure({ storage: { key, configure: { instances } } })`, with an optional `update.updateStorage` gate (`boolean` or `(instance) => boolean`).
  - Field metadata: `placeholder`, `isRequired` (default `false`), and `errorMessage`. Required fields without an explicit `label` get a trailing `*` on the resolved label.
  - Step `isComplete(data)` predicate, exposed as `step.isComplete()` / `stepSchema.isStepComplete(...)`.
  - New `InvalidInstanceError` and `NoActiveInstanceError`.

  BREAKING CHANGE: step-level `overrides` is removed from the step config — attach overrides per instance with `instance.withOverrides(...)`. For `defineMultiStepForm`, `nameTransformCasing` moves to `.configure()`.

- 85e4f84: Exit alpha prerelease mode and enter beta.

## 1.0.0-alpha.37

### Patch Changes

- cb22d7e: Add a typed custom error foundation with scoped context and customizable message rendering.
- daecb01: Expose custom error classes and their supporting types from the public API.
- 53e536d: Migrate invalid key failures to the scoped custom error pattern.
- 2d71e9f: Add static custom-error invariants and migrate package invariant failures to structured error classes.
- 6ef9644: Fix whole-step updates to validate only the target step and report structured mismatch details.

## 1.0.0-alpha.36

### Patch Changes

- 81ccf36: fix: expose the helper-style `update` API to step-specific components

## 1.0.0-alpha.35

### Patch Changes

- 9c04b45: fix: restore override field inference in react schema factory

  Aligns the React schema factory with the core factory so step `overrides` callbacks receive properly inferred `fields` data. Also adds regression coverage to ensure partial override patches still preserve untouched step fields through `withForm()` and `withContext()`.

## 1.0.0-alpha.34

### Patch Changes

- 2276a41: fix: tighten override field inference and preserve omitted field defaults

  Resolved override data now exposes exact step field keys without a generic string index, which restores field inference in both core and React step consumers. This also adds regression coverage to ensure partial override patches do not remove untouched step fields at runtime.

## 1.0.0-alpha.33

### Minor Changes

- 14ba84a: feat(core): add step-level overrides with full type inference

  - Added `overrides` callback support on step definitions with strongly-typed `data` parameter (resolved step data with widened field defaults)
  - Added `StepOverrides`, `StepOverridePatch`, `StepOverrideResult`, and `StepResolvedData` public types
  - Added `StepDefaultValues` mapped type with index-signature filtering to produce accurate per-field primitive types
  - Supports both sync and async override functions

## 1.0.0-alpha.32

### Patch Changes

- c9e561d: fix runtime `steps.as(...)` results to expose the typed `value` property alongside `parse()` and `allows()`

## 1.0.0-alpha.31

### Minor Changes

- 04c486e: feat: add parsers for scalar step-schema `as` transformations

## 1.0.0-alpha.30

### Patch Changes

- 1b13492: fix: correct step-schema `as` return types

## 1.0.0-alpha.29

### Patch Changes

- 2b40eaf: fix: omit disabled field labels and restore reactive field selector props

  Disabled field labels are now omitted from the resolved field config and from React `Field` children props instead of being exposed as `false` or `undefined`. This also fixes React field selector children so `selected.value` updates with the latest form state.

## 1.0.0-alpha.28

### Patch Changes

- 9cc12f1: fix: restore missing types removed during type system rewrite (#182)

  - Added `StrippedResolvedStep<T, withFunctions>` to `@jfdevelops/multi-step-form-core`
  - Added `CreateStepSpecificComponentCallback` to `@jfdevelops/react-multi-step-form`
  - Added `MultiStepFormSchema.resolvedStep<T>` utility type to the `MultiStepFormSchema` namespace
  - Exported `StepSpecificComponent` and related types from the react package public API via `export * from './steps'`

- 160d9a9: Fixes type import errors and `createComponent` not being available per step

## 1.0.0-alpha.27

### Patch Changes

- e128be0: Moved types and functions out of namespaces (`fields` and `steps`) to fix import issue

## 1.0.0-alpha.26

### Patch Changes

- 4deca4f: Attempt at fixing import issue...again

## 1.0.0-alpha.25

### Patch Changes

- ffed50d: Fixes import issue (I think)

## 1.0.0-alpha.24

### Patch Changes

- ef9ff3c: # Type System Revamp

  - Reduced the amount of generics down to 2 for external types
  - Removed `First` and `Last` types as these weren't being used and was slowing down the TS server due to heavy recursion

  # Removed unused functions

  - `MultiStepFormStepSchema.first()`
  - `MultiStepFormStepSchema.last()`

## 1.0.0-alpha.23

### Patch Changes

- 5a99db7: Fixes resovled `type` inference

## 1.0.0-alpha.22

### Patch Changes

- 5b8612c: Adds full support for deep fields for the `<Field />` component (previously, only type support was available)

## 1.0.0-alpha.21

### Patch Changes

- e215a55: Ensures `<Selector />`'s children will rerender each its `value` changes

## 1.0.0-alpha.20

### Patch Changes

- dcbf92e: Fixes `Date`s not being able to be `update`d

## 1.0.0-alpha.19

### Patch Changes

- 883d7f7: Performing a partial update preserves that data's structure

## 1.0.0-alpha.18

### Patch Changes

- d18c881: Makes sure packages actually get built

## 1.0.0-alpha.17

### Patch Changes

- fe74361: Fixes storage module storing array's of object improperly

## 1.0.0-alpha.16

### Patch Changes

- cddc63c: Fixes extra keys getting added to result when calling `reset`
- a206091: By default, it will be `true` if `partial === true` OR `strict === false`

## 1.0.0-alpha.15

### Patch Changes

- 7f33ec1: Adds 2 new options for `update`

  - `partial`: allows the target object to be updated partially

    - Defaults to `false`

  - `strict`: ensures the target object can't have extra keys

    - Defaults to `true`

## 1.0.0-alpha.14

### Patch Changes

- 44fef3a: Brings `resetFn` support to `createHelperFn`

## 1.0.0-alpha.13

### Patch Changes

- a8a9502: Adds convenient `reset` method

## 1.0.0-alpha.12

### Patch Changes

- 915b62b: Renames core package to `@jfdevelops/multi-step-form-core`

## 1.0.0-alpha.11

### Patch Changes

- 2cf0908: Fixes `ctx` not being up to date when `createHelperFn` is called
- 5217d0b: Fixes the deep path normalization to make updating work properly

## 1.0.0-alpha.10

### Patch Changes

- # Adds Deep Keys Support
  - core: `MultiStepFormStepSchema.getValue()`
  - react: `<Field />` component's `name` prop
    - `defaultValue` and `onInputChange` support the deep values as well

## 1.0.0-alpha.9

### Patch Changes

- Updating an array set as a `defaultValue` during schema initialization, now updates properly

## 1.0.0-alpha.8

### Patch Changes

- `form.render`'s first param, `data.steps` is now the right type and value

  providing a custom `storage.key` actually works

## 1.0.0-alpha.7

### Patch Changes

- Changes storage module so that the actions (get, add, remove) are only ran if `window` is defined OR a specific store is provided and `window` is defined

## 1.0.0-alpha.6

### Patch Changes

- Adds option to storage for throwing an error when `window` is `undefined`

## 1.0.0-alpha.5

### Patch Changes

- Adds support for the `update` method in the `createHelperFn` callback in the react package

## 1.0.0-alpha.4

### Patch Changes

- This update brings changes to the following functions:

  - `createHelperFn`
  - `update`

  ### `createHelperFn`

  - adds ability to create custom `ctx`
  - makes `update` available in callback

  `update`

  - changes function signature

## 1.0.0-alpha.3

### Patch Changes

- Adds new option to `createComponent` for creating custom `ctx` that will be available in the `fn`
