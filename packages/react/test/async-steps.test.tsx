import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, expectTypeOf, it, vi } from 'vitest';
import { defineMultiStepForm } from '../src';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

it('preserves React factories and useStep across lazy resolution and updates', async () => {
  const loader = vi.fn(async () => ({
    title: 'Loaded',
    fields: { firstName: { defaultValue: 'Taylor' } },
  }));
  const createForm = defineMultiStepForm({
    steps: { step1: loader },
  }).configure();
  const form = createForm();
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  expect(loader).not.toHaveBeenCalled();
  expect(form.stepSchema.isStepComplete('step1')).toBe(false);
  const factory = form.stepSchema.value.step1.createComponent;
  const Step = factory({
    render: ({ useStep }) => {
      const { data, status } = useStep();
      expectTypeOf<
        typeof data.fields.firstName.defaultValue
      >().toEqualTypeOf<string>();
      return (
        <p>
          {status === 'resolved' ? data.fields.firstName.defaultValue : status}
        </p>
      );
    },
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(<Step />);
    });
    await act(async () => {
      await form.stepSchema.resolveStep('step1');
    });
    expect(container.textContent).toBe('Taylor');
    expect(loader).toHaveBeenCalledTimes(1);
    expect(form.stepSchema.value.step1.createComponent).toBe(factory);
    await act(async () => {
      form.stepSchema.value.step1.reset({ fields: 'all' });
    });
    expect(container.textContent).toBe('Taylor');
    expect(form.stepSchema.value.step1.createComponent).toBe(factory);
  } finally {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
  }
});
