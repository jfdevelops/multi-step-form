# @jfdevelops/react-multi-step-form

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
