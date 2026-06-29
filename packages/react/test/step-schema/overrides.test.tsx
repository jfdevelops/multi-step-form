import type { ReactElement } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createMultiStepFormSchema } from '../../src';

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
  window.localStorage.clear();
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
    getByTestId(testId: string) {
      const element = container.querySelector<HTMLElement>(
        `[data-testid="${testId}"]`,
      );

      if (!element) {
        throw new Error(`Unable to find element by test id: ${testId}`);
      }

      return element;
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

describe('step overrides', () => {
  it('suspends the full step through Suspend', async () => {
    const deferred = createDeferred<{ firstName: string }>();
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
      },
    });

    const Step1 = schema.stepSchema.value.step1.createComponent(
      ({ Field, Suspend }) => (
        <Suspend fallback={<p data-testid='loading'>Loading</p>}>
          <Field name='firstName'>
            {({ defaultValue }) => <p data-testid='value'>{defaultValue}</p>}
          </Field>
        </Suspend>
      ),
    );

    const screen = await renderInJsdom(<Step1 />);

    expect(screen.getByTestId('loading').textContent).toBe('Loading');

    await act(async () => {
      deferred.resolve({
        firstName: 'Taylor',
      });
    });

    expect(screen.getByTestId('value').textContent).toBe('Taylor');
  });

  it('supports field-level suspension', async () => {
    const deferred = createDeferred<{ firstName: string }>();
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
          overrides: async () => {
            const values = await deferred.promise;

            return {
              firstName: values.firstName,
            };
          },
        },
      },
    });

    const Step1 = schema.stepSchema.value.step1.createComponent(
      ({ Field }) => (
        <Field
          name='firstName'
          suspend
          fallback={<p data-testid='field-loading'>Loading field</p>}
        >
          {({ defaultValue }) => <p data-testid='value'>{defaultValue}</p>}
        </Field>
      ),
    );

    const screen = await renderInJsdom(<Step1 />);

    expect(schema.stepSchema.getStepStatus('step1')).toBe('loading');

    await act(async () => {
      deferred.resolve({
        firstName: 'Jordan',
      });
    });

    expect(screen.getByTestId('value').textContent).toBe('Jordan');
  });

  it('exposes the current override status through useStep', async () => {
    const deferred = createDeferred<{ firstName: string }>();
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
          overrides: async () => {
            const values = await deferred.promise;

            return {
              firstName: values.firstName,
            };
          },
        },
      },
    });

    const Step1 = schema.stepSchema.value.step1.createComponent(
      ({ useStep }) => {
        const { data, status } = useStep();

        return (
          <>
            <p data-testid='status'>{status}</p>
            <p data-testid='value'>{data.fields.firstName.defaultValue}</p>
          </>
        );
      },
    );

    const screen = await renderInJsdom(<Step1 />);

    expect(screen.getByTestId('value').textContent).toBe('');

    await act(async () => {
      deferred.resolve({
        firstName: 'Jordan',
      });
    });

    expect(screen.getByTestId('status').textContent).toBe('resolved');
    expect(screen.getByTestId('value').textContent).toBe('Jordan');
  });
});
