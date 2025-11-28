# @jfdevelops/react-multi-step-form

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
