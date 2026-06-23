# @jfdevelops/react-multi-step-form

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
