# @jfdevelops/react-multi-step-form

## 1.0.0-beta.5

### Minor Changes

- d99989d: Add a `fields` selector to `createComponent.forField` so reusable selectable components can narrow their accepted field prop and render data.

### Patch Changes

- 638be2f: Preserve the full step field union when `createComponent.forField` omits `fields`, while narrowing only when an explicit `fields` selector is provided.
- 92040f3: Allow reusable factory field components to bind to any created multi-step form schema, including schemas finalized with `withForm()` and `withContext()`.

## 1.0.0-beta.4

### Major Changes

- 90eaceb: Require reusable field components created from configured factories to receive the form instance they render against, preventing shared components from reading whichever instance was most recently active.

  Allow `createComponent.forField` to omit its configured field and return a reusable component with a required, strongly typed `field` prop for selecting any field in the target step.

  Restore React render utilities for components selecting multiple steps or all steps, including configured form aliases and reactive selectors. These components now expose documented `defaultValues.grouped` and `defaultValues.flat` views.

  Preserve duplicate field names in `defaultValues.flat` by grouping their values under the selected step keys instead of overwriting an earlier step.

  Expose `Field` to components selecting multiple steps or all steps, using qualified names such as `step1.firstName` to route field subscriptions, suspense, updates, and resets without ambiguity.

### Patch Changes

- aa44c0b: Preserve the internal Field type namespace in published declarations so consumer render callbacks retain strongly typed field props.

## 1.0.0-beta.3

### Patch Changes

- a382686: Restore the complete schema surface, including the exact type-only step union and `stepSchema`, on the callable factory returned by `defineMultiStepForm().configure()` while keeping factory and instance state isolated.
- e7365ed: Only expose and inject a `Form` component in `createComponent` render input after the schema has been configured with `.withForm()`.
- 6fea1ed: Preserve step-specific helpers for partial object selectors and isolate configured factory schemas from shared browser storage.
- a26edfb: Restore the full strongly typed `stepData` selector on schema-level `createComponent`, including `'all'`, exact step tuples, and object notation.
- Updated dependencies [6fea1ed]
  - @jfdevelops/multi-step-form-core@1.0.0-beta.3

## 1.0.0-beta.2

### Major Changes

- 1c4e6d9: Restore the complete schema surface on form definitions, including a type-only exact step union, while keeping configured instances independent.

  Return `NoCurrentData` and `ProgressText` components from render-context helpers, align single-step instance components with step-specific render inputs, and replace every `createComponent` overload with the object-only `{ render }` API.

### Minor Changes

- 60064bc: Add strongly typed `createComponent.forField` factories at schema, step, definition, and configured-factory levels. Configured factories reuse the component definition across active instances while keeping each instance's state and subscriptions isolated.

### Patch Changes

- 86d5405: Correct `createComponent.forField` return props so generated components forward Field options other than the internally owned `name` and `children`, while continuing to infer and accept custom render props.
- Updated dependencies [1c4e6d9]
  - @jfdevelops/multi-step-form-core@1.0.0-beta.2

## 1.0.0-beta.1

### Major Changes

- c9d8633: Replace the curried `withForm.render` API with `render(context, customProps)`, keep the strongly typed render context subscribed to current step data, and add reactive `getCurrentStepData`, `getProgress`, and `isStepComplete` callbacks so render implementations do not need to call the equivalent hooks. Preserve each step's exact `isComplete` function, remove widened `step${number}` indexes from render context and context-hook targets, preserve contextual typing and custom prop inference through override chains and injected form call sites, and resolve omitted casing to the exact default casing and label types.

  Normalize resolved core step keys before generating step helpers so `update`, `reset`, completion, and helper functions carry only concrete schema steps and are not intersected with duplicate copies during React form enrichment.

  Remove the legacy `createMultiStepFormSchema` factory in favor of the single `defineMultiStepForm(...).configure(...)` flow. Preserve exact field metadata and strongly typed `isComplete` inputs through definition factories, normalize array transformation types to honest arrays of schema step values, and migrate package tests, examples, and documentation to the definition API.

  Strip internal update/reset/component helpers from the runtime `withForm.render` step projection, validate dynamic `isStepComplete` targets with `InvalidStepError`, and make step-specific `enabledForSteps` validation use the same concrete string keys exposed by the public API.

  Remove function-valued properties entirely from resolved updater payloads instead of exposing them as required `never` properties, and make partial path updates recursively accept partial array items.

  Preserve unrelated step state during resets, persist synchronous override failures, recover from malformed stored JSON using form defaults, consistently validate dynamic render-context step targets, and retain exact custom field metadata and resolved step keys through public definition chains.

### Patch Changes

- Updated dependencies [c9d8633]
- Updated dependencies [cad92bf]
  - @jfdevelops/multi-step-form-core@1.0.0-beta.1

## 1.0.0-beta.0

### Major Changes

- 8f3b1b1: Add the React `defineMultiStepForm` factory (mirroring core instances/storage) and migrate to per-instance `.withOverrides(...)` instead of step-level `overrides`.

  BREAKING CHANGE: step-level `overrides` on the step config is removed — use `createForm({ instance }).withOverrides(...)` (chainable with `.withForm()` / `.withContext()`).

- 85e4f84: Exit alpha prerelease mode and enter beta.

### Patch Changes

- Updated dependencies [a44ace5]
- Updated dependencies [85e4f84]
  - @jfdevelops/multi-step-form-core@1.0.0-beta.0

## 1.0.0-alpha.55

### Patch Changes

- 15beff8: Add optional selector options to `useStep` for granular subscriptions while preserving complete-result subscriptions when no selector is provided.
- 86cf157: Prevent suspended fields from remounting their children during reactive updates, preserving DOM identity and focus.

## 1.0.0-alpha.54

### Patch Changes

- 25e6275: Stabilize React package test worker startup on Windows.
- 2d71e9f: Add static custom-error invariants and migrate package invariant failures to structured error classes.
- Updated dependencies [cb22d7e]
- Updated dependencies [daecb01]
- Updated dependencies [53e536d]
- Updated dependencies [2d71e9f]
- Updated dependencies [6ef9644]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.37

## 1.0.0-alpha.53

### Patch Changes

- 81ccf36: fix: expose the helper-style `update` API to step-specific components
- Updated dependencies [81ccf36]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.36

## 1.0.0-alpha.52

### Patch Changes

- d6ce32e: fix: compare Date objects by timestamp in selectors

## 1.0.0-alpha.51

### Patch Changes

- 9c04b45: fix: restore override field inference in react schema factory

  Aligns the React schema factory with the core factory so step `overrides` callbacks receive properly inferred `fields` data. Also adds regression coverage to ensure partial override patches still preserve untouched step fields through `withForm()` and `withContext()`.

- Updated dependencies [9c04b45]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.35

## 1.0.0-alpha.50

### Minor Changes

- a8a6ff4: feat(react): type `useStep` errors and expose override failures per step

  `useStep()` now exposes override resolution errors on the current step and defaults the `error` property to `Error | undefined`. Callers can also override the error type at the hook call site with `useStep<MyError>()`.

### Patch Changes

- 2276a41: fix: tighten override field inference and preserve omitted field defaults

  Resolved override data now exposes exact step field keys without a generic string index, which restores field inference in both core and React step consumers. This also adds regression coverage to ensure partial override patches do not remove untouched step fields at runtime.

- Updated dependencies [2276a41]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.34

## 1.0.0-alpha.49

### Minor Changes

- 5468bc4: feat(react): add step-level overrides, suspend, and useStep support

### Patch Changes

- Updated dependencies [14ba84a]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.33

## 1.0.0-alpha.48

### Patch Changes

- Updated dependencies [c9e561d]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.32

## 1.0.0-alpha.47

### Patch Changes

- Updated dependencies [04c486e]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.31

## 1.0.0-alpha.46

### Patch Changes

- Updated dependencies [1b13492]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.30

## 1.0.0-alpha.45

### Patch Changes

- 2b40eaf: fix: omit disabled field labels and restore reactive field selector props

  Disabled field labels are now omitted from the resolved field config and from React `Field` children props instead of being exposed as `false` or `undefined`. This also fixes React field selector children so `selected.value` updates with the latest form state.

- Updated dependencies [2b40eaf]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.29

## 1.0.0-alpha.44

### Patch Changes

- 59c70b0: fix: preserve custom `Form` inference in built package declarations

  Ensures the generated declaration files keep the `withForm()` schema type enriched with the custom form config, so consumers importing the published package receive the same `Form` props inference as source-level tests.

## 1.0.0-alpha.43

### Patch Changes

- fdfdfc9: fix: restore `Form` inference in step component callback types

  Restores the custom `Form` component typing for `step.createComponent(...)` callbacks when using `withForm({ render })`, and also restores the exported `CreateStepSpecificComponentCallback` helper type so it carries the same inferred `Form` props.

## 1.0.0-alpha.42

### Patch Changes

- 6342d93: fix: restore custom `Form` type in `createComponent` callback when using `withForm({ render })`

  When `withForm()` was called with only `render` (no `alias` or `enabledForSteps`), the `Form` parameter in the `createComponent` callback was incorrectly typed as the generic HTML form element instead of the user's custom form component. This has been fixed.

## 1.0.0-alpha.41

### Patch Changes

- 645b4c5: feat: expose `defaultValues` in `createComponent` callback

  `defaultValues` is now available directly in the `createComponent` callback, providing the same flat map of field default values that was previously only accessible via the removed `useFormInstance.render` input.

## 1.0.0-alpha.40

### Minor Changes

- cac1881: refactor: remove `useFormInstance` from `createComponent` and type `Form` by default

  - Removes the `useFormInstance` option from the second `createComponent` overload — the `Form` component from an external form library can now be composed manually in the callback instead
  - `Form` (the default `<form>` wrapper) is now always present in the `createComponent` callback type when no custom `withForm()` config is supplied, matching existing runtime behaviour
  - Simplifies `StepSpecificComponent.options` from 5 type params to 3
  - Removes `formInstanceOptions`, `DEFAULT_FORM_INSTANCE_ALIAS`, and `defaultFormInstanceAlias` from the public API

## 1.0.0-alpha.39

### Patch Changes

- 73efa2c: fix: rerender whole-schema consumers after form data updates (#189)

## 1.0.0-alpha.38

### Patch Changes

- 1656b9c: fix: rerender form context consumers after step data updates (#189)
- 67d04aa: fix: resolve current step data from form context (#189)

## 1.0.0-alpha.37

### Patch Changes

- 9cc12f1: fix: restore missing types removed during type system rewrite (#182)

  - Added `StrippedResolvedStep<T, withFunctions>` to `@jfdevelops/multi-step-form-core`
  - Added `CreateStepSpecificComponentCallback` to `@jfdevelops/react-multi-step-form`
  - Added `MultiStepFormSchema.resolvedStep<T>` utility type to the `MultiStepFormSchema` namespace
  - Exported `StepSpecificComponent` and related types from the react package public API via `export * from './steps'`

- 160d9a9: Fixes type import errors and `createComponent` not being available per step
- Updated dependencies [9cc12f1]
- Updated dependencies [160d9a9]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.28

## 1.0.0-alpha.36

### Patch Changes

- e128be0: Moved types and functions out of namespaces (`fields` and `steps`) to fix import issue
- Updated dependencies [e128be0]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.27

## 1.0.0-alpha.35

### Patch Changes

- Updated dependencies [4deca4f]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.26

## 1.0.0-alpha.34

### Patch Changes

- Updated dependencies [ffed50d]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.25

## 1.0.0-alpha.33

### Patch Changes

- Updated dependencies [ef9ff3c]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.24

## 1.0.0-alpha.32

### Patch Changes

- Updated dependencies [5a99db7]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.23

## 1.0.0-alpha.31

### Patch Changes

- 5b8612c: Adds full support for deep fields for the `<Field />` component (previously, only type support was available)
- Updated dependencies [5b8612c]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.22

## 1.0.0-alpha.30

### Patch Changes

- e215a55: Ensures `<Selector />`'s children will rerender each its `value` changes
- Updated dependencies [e215a55]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.21

## 1.0.0-alpha.29

### Patch Changes

- ed7b13a: Ensures the latest selector value is used in `createUseSelector`

## 1.0.0-alpha.28

### Patch Changes

- 22ced19: Adds `options` argument to `onInputChange` and `reset` (`<Field />` props)
- Updated dependencies [dcbf92e]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.20

## 1.0.0-alpha.27

### Patch Changes

- a12650c: Adds new `selectorFn` prop to the `Field` component. Providing a value for the `selectorFn` will internally wrap the `<Field />`'s children with a `<Selector />`.

## 1.0.0-alpha.26

### Patch Changes

- 94c7f38: Caches `ctx` value in `useSelector` and `<Selector />`

## 1.0.0-alpha.25

### Patch Changes

- Updated dependencies [883d7f7]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.19

## 1.0.0-alpha.24

### Patch Changes

- 06e7d7d: Fixes `form` being `undefined`

## 1.0.0-alpha.23

### Patch Changes

- d18c881: Makes sure packages actually get built
- Updated dependencies [d18c881]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.18

## 1.0.0-alpha.22

### Patch Changes

- 8537ac7: Makes step data reactive in `createComponent` function
- Updated dependencies [fe74361]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.17

## 1.0.0-alpha.21

### Patch Changes

- fcad2df: Fixes `ctx.{currentStep}` being `undefined` when calling step specific `createComponent` function with a custom `useFormInstance` and no `ctxData`

## 1.0.0-alpha.20

### Patch Changes

- Updated dependencies [cddc63c]
- Updated dependencies [a206091]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.16

## 1.0.0-alpha.19

### Patch Changes

- d0a9fdb: Fixes `createStepSpecificComponentImpl`'s `input` when calling with `formInstance` and `ctxData`

## 1.0.0-alpha.18

### Patch Changes

- Updated dependencies [7f33ec1]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.15

## 1.0.0-alpha.17

### Patch Changes

- 44fef3a: Brings `resetFn` support to `createHelperFn`
- Updated dependencies [44fef3a]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.14

## 1.0.0-alpha.16

### Patch Changes

- a8a9502: Adds convenient `reset` method
- Updated dependencies [a8a9502]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.13

## 1.0.0-alpha.15

### Patch Changes

- 915b62b: Renames core package to `@jfdevelops/multi-step-form-core`
- Updated dependencies [915b62b]
  - @jfdevelops/multi-step-form-core@1.0.0-alpha.12

## 1.0.0-alpha.14

### Patch Changes

- Updated dependencies [2cf0908]
- Updated dependencies [5217d0b]
  - @jfdevelops/multi-step-form@1.0.0-alpha.11

## 1.0.0-alpha.13

### Patch Changes

- e4ff33e: Update version to work with npm

## 1.0.0-alpha.12

### Patch Changes

- 2d59e87: `onInputChange` of the `<Field />` component has access to the most up to date data for that field

## 1.0.0-alpha.11

### Patch Changes

- 600b08e: Fixes `name` prop in `<Field />` component not supporting deep keys

## 1.0.0-alpha.10

### Patch Changes

- # Adds Deep Keys Support
  - core: `MultiStepFormStepSchema.getValue()`
  - react: `<Field />` component's `name` prop
    - `defaultValue` and `onInputChange` support the deep values as well
- Updated dependencies
  - @jfdevelops/multi-step-form@1.0.0-alpha.10

## 1.0.0-alpha.9

### Patch Changes

- Updating an array set as a `defaultValue` during schema initialization, now updates properly
- Updated dependencies
  - @jfdevelops/multi-step-form@1.0.0-alpha.9

## 1.0.0-alpha.8

### Patch Changes

- `form.render`'s first param, `data.steps` is now the right type and value

  providing a custom `storage.key` actually works

- Updated dependencies
  - @jfdevelops/multi-step-form@1.0.0-alpha.8

## 1.0.0-alpha.7

### Patch Changes

- Changes storage module so that the actions (get, add, remove) are only ran if `window` is defined OR a specific store is provided and `window` is defined
- Updated dependencies
  - @jfdevelops/multi-step-form@1.0.0-alpha.7

## 1.0.0-alpha.6

### Patch Changes

- Adds option to storage for throwing an error when `window` is `undefined`
- Updated dependencies
  - @jfdevelops/multi-step-form@1.0.0-alpha.6

## 1.0.0-alpha.5

### Patch Changes

- Adds support for the `update` method in the `createHelperFn` callback in the react package
- Updated dependencies
  - @jfdevelops/multi-step-form@1.0.0-alpha.5

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

- Updated dependencies
  - @jfdevelops/multi-step-form@1.0.0-alpha.4

## 1.0.0-alpha.3

### Patch Changes

- Adds new option to `createComponent` for creating custom `ctx` that will be available in the `fn`
- Updated dependencies
  - @jfdevelops/multi-step-form@1.0.0-alpha.3
