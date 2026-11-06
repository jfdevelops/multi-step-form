# `@jfdevelops/multi-step-form-builder-zod`

Lets form builder authors validate steps with [Zod](https://zod.dev) v4. Rules edited in the
builder compile to Zod schemas at runtime, and `toSource` emits the equivalent Zod code.

## Installation

```bash
pnpm add @jfdevelops/multi-step-form-builder-core @jfdevelops/multi-step-form-builder-zod zod
```

## Usage

```ts
import { createFormBuilder, createRegistry } from '@jfdevelops/multi-step-form-builder-core';
import { zodAdapter } from '@jfdevelops/multi-step-form-builder-zod';

const registry = createRegistry({ validators: [zodAdapter] });
const builder = createFormBuilder({ registry });

builder.validation.useLibrary(builder.getSnapshot().activeStepId!, 'zod');
```

Use the same registry with `compileDefinition` and `toSource`. A step validated with Zod behaves
like one using the built-in validator: empty values (`''`, `null`, `[]`) count as missing, and the
messages match.
