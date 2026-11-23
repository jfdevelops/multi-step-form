---
title: Deferred execution and action hooks
description: Keep event callbacks current and schedule guarded form updates after React commits.
order: 30
---

Use deferred execution for event callbacks and `createHook` for post-commit form
reconciliation. They solve different timing problems and should not be treated
as interchangeable delays.

In this guide you will:

- Build a callback that uses committed props.
- Schedule a prepared update through `createHook`.
- Guard reconciliation to avoid repeated writes.
- Distinguish the three deferred-action mechanisms.

## Keep an event callback current

```tsx
import { useDeferredExecution } from '@jfdevelops/react-multi-step-form';

export function SaveButton({ email, onSave }: {
  email: string;
  onSave: (email: string) => void;
}) {
  const save = useDeferredExecution(onSave, email);

  return <button type='button' onClick={save}>Save current email</button>;
}
```

The returned callback has stable identity and invokes the latest committed
function and arguments. It does not call `onSave` during render or automatically
after a delay. React must commit updated props before they become the callback's
current values.

## Schedule a prepared action after commit

```tsx
import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';

const form = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Confirmation',
      fields: { prompt: { defaultValue: { open: false } } },
    },
  },
}).configure()();

const step = form.stepSchema.value.step1;
const patchPrompt = step.createUpdate.patch({ fields: ['fields.prompt.defaultValue'] });
const useOpenPrompt = step.createHook({
  function: patchPrompt,
  render({ run, useSelector }) {
    const open = useSelector(({ step1 }) => step1.fields.prompt.defaultValue.open);
    run.forConditions([!open], { open: true });

    return open;
  },
});

export const PromptState = step.createComponent({
  render: function PromptState() {
    const open = useOpenPrompt();

    return <output>{open ? 'Open' : 'Closed'}</output>;
  },
});
```

`run` queues the chosen function after commit. This hook observes the old value
on its first render, then the update notifies subscribers. The condition prevents
the reconciliation from repeatedly writing the same state.

`function` can also name a function in the step component input, such as
`'onInputChange'`, instead of receiving a prepared callable. That named update
wrapper takes its usual path-selection options. Prefer a prepared narrow action
when you want one clear contract.

## Choose the timing mechanism

| Mechanism | Captured input | Execution |
| --- | --- | --- |
| Update `deferExecution(...)` | Arguments from that call | When you call its returned function |
| `useDeferredExecution(callback, ...args)` | Latest committed callback and arguments | When the stable callback is invoked |
| `step.createHook({ function, render })` | Invocation registered by the hook | After React commit |

`run.forConditions` registers a guarded post-commit invocation. Conditions on
prepared update callables can also inspect the current selected value at
execution time. Use idempotent reconciliation rules that converge instead of
toggling values on every commit.

## Next steps

- [Reusable update scopes](../../../core/v1/utilities/action-factories.md)
- [Conditions](../../../core/v1/guides/conditions.md)
- [Component render input](component-utilities.md)
