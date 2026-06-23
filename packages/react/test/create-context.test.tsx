import { ComponentPropsWithRef, type ReactElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createMultiStepFormSchema } from '../src';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

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

  return {
    getByText(text: string) {
      const candidates = [
        container,
        ...Array.from(container.querySelectorAll<HTMLElement>('*')),
      ];
      const element = candidates.find((candidate) =>
        candidate.textContent?.includes(text),
      );

      if (!element) {
        throw new Error(`Unable to find element with text: ${text}`);
      }

      return element as HTMLElement;
    },
  };
}

describe('createMultiStepFormContext', () => {
  it('rerenders current step data after a public step update', async () => {
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
        },
        step2: {
          title: 'Step 2',
          fields: {
            age: {
              defaultValue: 0,
            },
          },
        },
      },
    })
      .withForm({
        render() {
          return (props: ComponentPropsWithRef<'form'>) => (
            <form {...props} />
          );
        },
      })
      .withContext();

    const { useCurrentStepData } = schema.context;

    function TestComponent() {
      const { data, hasData, NoCurrentData } = useCurrentStepData({
        targetStep: 'step1',
      });

      if (!hasData) {
        return <NoCurrentData />;
      }

      return <p>First name: {data.fields.firstName?.defaultValue}</p>;
    }

    const screen = await renderInJsdom(<TestComponent />);

    await act(async () => {
      schema.stepSchema.value.step1.update({
        fields: ['fields.firstName.defaultValue'],
        updater: 'Taylor',
      });
    });

    expect(screen.getByText('First name: Taylor')).toBeDefined();
  });
});
