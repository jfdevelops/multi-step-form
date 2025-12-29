# @jfdevelops/multi-step-form-core

## 1.0.0-alpha.17

### Patch Changes

- 374bcdd: Fixes storage module storing array's of object improperly

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
