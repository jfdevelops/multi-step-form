import type { ComponentPropsWithRef, ReactElement } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { createMultiStepFormSchema } from '../../src';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = [];

class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomError';
  }
}

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
  it('useStep returns resolved data immediately for fully sync step definitions', async () => {
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: 'Taylor',
            },
          },
        },
        step2: {
          title: 'Step 2',
          fields: {
            age: {
              defaultValue: 42,
            },
          },
        },
      },
    });

    const Step1 = schema.stepSchema.value.step1.createComponent(({ useStep }) => {
      const { data, status, error } = useStep();

      return (
        <>
          <p data-testid='status'>{status}</p>
          <p data-testid='value'>{data.fields.firstName.defaultValue}</p>
          <p data-testid='error'>{error === undefined ? 'none' : 'error'}</p>
        </>
      );
    });

    const screen = await renderInJsdom(<Step1 />);

    expect(screen.getByTestId('status').textContent).toBe('resolved');
    expect(screen.getByTestId('value').textContent).toBe('Taylor');
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  it('useStep resolves fully async step definitions without top-level schema await', async () => {
    const firstName = createDeferred<string>();
    const age = createDeferred<number>();
    const schema = createMultiStepFormSchema({
      steps: {
        step1: async () => ({
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: await firstName.promise,
            },
          },
        }),
        step2: async () => ({
          title: 'Step 2',
          fields: {
            age: {
              defaultValue: await age.promise,
            },
          },
        }),
      },
    });

    const Step1 = schema.stepSchema.value.step1.createComponent(({ useStep }) => {
      const { data, status } = useStep();

      return (
        <>
          <p data-testid='step1-status'>{status}</p>
          <p data-testid='step1-value'>
            {status === 'resolved'
              ? data.fields.firstName.defaultValue
              : 'pending'}
          </p>
        </>
      );
    });

    const Step2 = schema.stepSchema.value.step2.createComponent(({ useStep }) => {
      const { data, status } = useStep();

      return (
        <>
          <p data-testid='step2-status'>{status}</p>
          <p data-testid='step2-value'>
            {status === 'resolved' ? String(data.fields.age.defaultValue) : 'pending'}
          </p>
        </>
      );
    });

    const screen = await renderInJsdom(
      <>
        <Step1 />
        <Step2 />
      </>,
    );

    expect(screen.getByTestId('step1-value').textContent).toBe('pending');
    expect(screen.getByTestId('step2-value').textContent).toBe('pending');

    await act(async () => {
      firstName.resolve('Jordan');
      age.resolve(27);
    });

    expect(screen.getByTestId('step1-status').textContent).toBe('resolved');
    expect(screen.getByTestId('step2-status').textContent).toBe('resolved');
    expect(screen.getByTestId('step1-value').textContent).toBe('Jordan');
    expect(screen.getByTestId('step2-value').textContent).toBe('27');
  });

  it('useStep handles mixed sync and async step definitions', async () => {
    const asyncAge = createDeferred<number>();
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: 'Taylor',
            },
          },
        },
        step2: async () => ({
          title: 'Step 2',
          fields: {
            age: {
              defaultValue: await asyncAge.promise,
            },
          },
        }),
      },
    });

    const Step1 = schema.stepSchema.value.step1.createComponent(({ useStep }) => {
      const { data, status } = useStep();

      return (
        <>
          <p data-testid='mixed-step1-status'>{status}</p>
          <p data-testid='mixed-step1-value'>{data.fields.firstName.defaultValue}</p>
        </>
      );
    });

    const Step2 = schema.stepSchema.value.step2.createComponent(({ useStep }) => {
      const { data, status } = useStep();

      return (
        <>
          <p data-testid='mixed-step2-status'>{status}</p>
          <p data-testid='mixed-step2-value'>
            {status === 'resolved' ? String(data.fields.age.defaultValue) : 'pending'}
          </p>
        </>
      );
    });

    const screen = await renderInJsdom(
      <>
        <Step1 />
        <Step2 />
      </>,
    );

    expect(screen.getByTestId('mixed-step1-status').textContent).toBe(
      'resolved',
    );
    expect(screen.getByTestId('mixed-step1-value').textContent).toBe('Taylor');
    expect(screen.getByTestId('mixed-step2-value').textContent).toBe('pending');

    await act(async () => {
      asyncAge.resolve(31);
    });

    expect(screen.getByTestId('mixed-step2-status').textContent).toBe(
      'resolved',
    );
    expect(screen.getByTestId('mixed-step2-value').textContent).toBe('31');
  });

  it('useStep preserves persisted async step values after the step resolves', async () => {
    const storageKey = `react-async-step-persist-${Date.now()}`;
    const seedSchema = createMultiStepFormSchema({
      storage: {
        key: storageKey,
        store: window.localStorage,
      },
      steps: {
        step1: async () => ({
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: 'Taylor',
            },
          },
        }),
      },
    });

    await seedSchema.stepSchema.resolveStep('step1');
    seedSchema.stepSchema.value.step1.update({
      fields: ['fields.firstName.defaultValue'],
      updater: 'Jordan',
    });

    const deferred = createDeferred<{ title: string }>();
    const schema = createMultiStepFormSchema({
      storage: {
        key: storageKey,
        store: window.localStorage,
      },
      steps: {
        step1: async () => ({
          title: (await deferred.promise).title,
          fields: {
            firstName: {
              defaultValue: 'Taylor',
            },
          },
        }),
      },
    });

    const Step1 = schema.stepSchema.value.step1.createComponent(({ useStep }) => {
      const { data, status } = useStep();

      return (
        <>
          <p data-testid='persisted-status'>{status}</p>
          <p data-testid='persisted-value'>
            {data.fields.firstName.defaultValue}
          </p>
          <p data-testid='persisted-title'>{data.title}</p>
        </>
      );
    });

    const screen = await renderInJsdom(<Step1 />);

    expect(screen.getByTestId('persisted-value').textContent).toBe('Jordan');

    await act(async () => {
      deferred.resolve({
        title: 'Resolved Step 1',
      });
    });

    expect(screen.getByTestId('persisted-status').textContent).toBe('resolved');
    expect(screen.getByTestId('persisted-value').textContent).toBe('Jordan');
    expect(screen.getByTestId('persisted-title').textContent).toBe(
      'Resolved Step 1',
    );
  });

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
          overrides: ({}) => deferred.promise,
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

    const Step1 = schema.stepSchema.value.step1.createComponent(({ Field }) => (
      <Field
        name='firstName'
        suspend
        fallback={<p data-testid='field-loading'>Loading field</p>}
      >
        {({ defaultValue }) => <p data-testid='value'>{defaultValue}</p>}
      </Field>
    ));

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

  it('keeps non-overridden fields available after async step resolution', async () => {
    const deferred = createDeferred<{ firstName: string }>();
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
            saveToAccount: {
              defaultValue: false,
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
      ({ Field, Suspend }) => (
        <Suspend fallback={<p data-testid='loading'>Loading</p>}>
          <Field name='firstName'>
            {({ defaultValue }) => (
              <p data-testid='firstName'>{String(defaultValue)}</p>
            )}
          </Field>
          <Field name='saveToAccount'>
            {({ defaultValue }) => (
              <p data-testid='saveToAccount'>{String(defaultValue)}</p>
            )}
          </Field>
        </Suspend>
      ),
    );

    const screen = await renderInJsdom(<Step1 />);

    expect(screen.getByTestId('loading').textContent).toBe('Loading');

    await act(async () => {
      deferred.resolve({
        firstName: 'Jordan',
      });
    });

    expect(screen.getByTestId('firstName').textContent).toBe('Jordan');
    expect(screen.getByTestId('saveToAccount').textContent).toBe('false');
  });

  it('stores thrown override errors on the current step hook result', async () => {
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
            throw new Error('Failed to load step defaults');
          },
        },
      },
    });

    const Step1 = schema.stepSchema.value.step1.createComponent(
      ({ useStep }) => {
        const { error, status } = useStep();

        return (
          <>
            <p data-testid='status'>{status}</p>
            <p data-testid='error-message'>
              {error instanceof Error ? error.message : 'none'}
            </p>
          </>
        );
      },
    );

    const screen = await renderInJsdom(<Step1 />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('status').textContent).toBe('error');
    expect(screen.getByTestId('error-message').textContent).toBe(
      'Failed to load step defaults',
    );
  });

  it('types useStep errors as Error by default and allows an override', () => {
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

    schema.stepSchema.value.step1.createComponent(({ useStep }) => {
      const defaultResult = useStep();
      const customResult = useStep<CustomError>();

      expectTypeOf(
        defaultResult.data.fields.firstName.defaultValue,
      ).toEqualTypeOf<string>();
      expectTypeOf(defaultResult.error).toEqualTypeOf<Error | undefined>();
      expectTypeOf(customResult.error).toEqualTypeOf<CustomError | undefined>();

      return null;
    });
  });

  it('infers override fields at the react createMultiStepFormSchema entrypoint', () => {
    createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
            phoneNumber: {
              defaultValue: '',
            },
            saveToAccount: {
              defaultValue: false,
            },
          },
          overrides: ({ fields }) => {
            expectTypeOf(fields.firstName.defaultValue).toEqualTypeOf<string>();
            expectTypeOf(
              fields.phoneNumber.defaultValue,
            ).toEqualTypeOf<string>();
            expectTypeOf(
              fields.saveToAccount.defaultValue,
            ).toEqualTypeOf<boolean>();

            return {
              firstName: fields.firstName.defaultValue,
            };
          },
        },
      },
    });
  });

  it('preserves non-overridden fields through withForm and withContext', async () => {
    const deferred = createDeferred<{ firstName: string }>();
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
            saveToAccount: {
              defaultValue: false,
            },
          },
          overrides: async ({ fields }) => {
            expectTypeOf(
              fields.saveToAccount.defaultValue,
            ).toEqualTypeOf<boolean>();
            expectTypeOf(fields.firstName.defaultValue).toEqualTypeOf<string>();

            const values = await deferred.promise;

            return {
              firstName: values.firstName,
            };
          },
        },
      },
    })
      .withForm({
        render() {
          return function Form(props: ComponentPropsWithRef<'form'>) {
            return <form {...props} />;
          };
        },
      })
      .withContext();

    const Step1 = schema.stepSchema.value.step1.createComponent(
      ({ Field, Form, Suspend }) => (
        <Suspend fallback={<p data-testid='loading'>Loading</p>}>
          <Form>
            <Field name='firstName'>
              {({ defaultValue }) => (
                <p data-testid='firstName'>{String(defaultValue)}</p>
              )}
            </Field>
            <Field name='saveToAccount'>
              {({ defaultValue }) => (
                <p data-testid='saveToAccount'>{String(defaultValue)}</p>
              )}
            </Field>
          </Form>
        </Suspend>
      ),
    );

    const screen = await renderInJsdom(<Step1 />);

    expect(screen.getByTestId('loading').textContent).toBe('Loading');

    await act(async () => {
      deferred.resolve({
        firstName: 'Jordan',
      });
    });

    expect(screen.getByTestId('firstName').textContent).toBe('Jordan');
    expect(screen.getByTestId('saveToAccount').textContent).toBe('false');
  });
});
