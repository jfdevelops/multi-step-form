import type { ReactElement } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { defineMultiStepForm } from '../src';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

async function renderInJsdom(ui: ReactElement) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(ui);
  });

  return {
    container,
    async unmount() {
      await act(async () => {
        root.unmount();
      });
    },
  };
}

describe('useSelector options', () => {
  it('selects a value with the non-deprecated options signature', async () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          fields: {
            firstName: { defaultValue: 'Taylor' },
          },
          title: 'Step 1',
        },
      },
    }).configure()();
    const Step = schema.stepSchema.value.step1.createComponent({
      render({ useSelector }) {
        const firstName = useSelector({
          selectorFn: ({ step1 }) => step1.fields.firstName.defaultValue,
        });

        return <output>{firstName}</output>;
      },
    });
    const rendered = await renderInJsdom(<Step />);

    expect(rendered.container.querySelector('output')?.textContent).toBe(
      'Taylor'
    );

    await rendered.unmount();
  });
});
