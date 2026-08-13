import type { ReactElement } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = [];

afterEach(async () => {
  for (const { container, root } of mountedRoots.splice(0)) {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  }
});

async function renderInJsdom(ui: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ container, root });

  await act(async () => {
    root.render(ui);
  });

  return container;
}

it('preserves a selected field input node and focus after a slice update', async () => {
  const schema = defineMultiStepForm({
    steps: {
      step1: {
        title: 'Step 1',
        fields: { firstName: { defaultValue: '' } },
      },
    },
    instances: ['admin'],
  }).configure()({ instance: 'admin' });
  const FirstName = schema.createComponent.forField({
    step: 'step1',
    field: 'firstName',
    render({ defaultValue, onInputChange }) {
      return (
        <input
          data-testid='firstName'
          value={defaultValue}
          onChange={(event) => onInputChange(event.target.value)}
        />
      );
    },
  });
  const Form = schema.createComponent({
    stepData: ['step1'],
    render({ Selector }) {
      return (
        <Selector
          selector={(ctx) => ({
            empty: ctx.step1.fields.firstName.defaultValue === '',
          })}
        >
          {() => <FirstName />}
        </Selector>
      );
    },
  });
  const container = await renderInJsdom(<Form />);
  const originalInput = container.querySelector<HTMLInputElement>(
    '[data-testid="firstName"]',
  );

  expect(originalInput).not.toBeNull();
  originalInput!.focus();

  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;

    valueSetter?.call(originalInput, 'T');
    originalInput!.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const updatedInput = container.querySelector<HTMLInputElement>(
    '[data-testid="firstName"]',
  );

  expect(updatedInput).toBe(originalInput);
  expect(document.activeElement).toBe(originalInput);
});
