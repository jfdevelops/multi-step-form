import type { ComponentPropsWithRef, ReactElement } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
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
}

function createSchema() {
  return defineMultiStepForm({
    steps: {
      step1: {
        title: 'Step 1',
        fields: { firstName: { defaultValue: 'Taylor' } },
      },
    },
  }).configure()();
}

describe('createComponent Form availability', () => {
  it('does not provide Form without withForm', async () => {
    const schema = createSchema();
    let receivedInput: unknown;
    const Component = schema.createComponent({
      stepData: ['step1'],
      render(input) {
        expectTypeOf(input).not.toHaveProperty('Form');
        receivedInput = input;

        return null;
      },
    });

    await renderInJsdom(<Component />);

    expect(receivedInput).not.toHaveProperty('Form');
  });

  it('provides Form after withForm', async () => {
    const schema = createSchema().withForm({
      render(_, props: ComponentPropsWithRef<'form'>) {
        return <form {...props} />;
      },
    });
    let receivedForm: unknown;
    const Component = schema.createComponent({
      stepData: ['step1'],
      render({ Form }) {
        expectTypeOf(Form).toBeFunction();
        receivedForm = Form;

        return null;
      },
    });

    await renderInJsdom(<Component />);

    expect(receivedForm).toBeTypeOf('function');
  });

  it('provides Form under a custom alias', async () => {
    const schema = createSchema().withForm({
      alias: 'CustomForm',
      render(_, props: ComponentPropsWithRef<'form'>) {
        return <form {...props} />;
      },
    });
    let receivedForm: unknown;
    const Component = schema.createComponent({
      stepData: ['step1'],
      render({ CustomForm }) {
        expectTypeOf(CustomForm).toBeFunction();
        receivedForm = CustomForm;

        return null;
      },
    });

    await renderInJsdom(<Component />);

    expect(receivedForm).toBeTypeOf('function');
  });
});
