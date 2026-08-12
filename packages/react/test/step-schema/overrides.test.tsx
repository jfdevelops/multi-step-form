import type { ComponentPropsWithRef, ReactElement } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { OverrideStatus } from '@jfdevelops/multi-step-form-core';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { defineMultiStepForm } from '../../src';

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
  it('loads default overrides from a server for every instance', async () => {
    const pretendServer = {
      getSharedName: vi.fn(async () => ({ firstName: 'Server default' })),
      getSharedAge: vi.fn(async () => ({ age: 42 })),
      getClientName: vi.fn(async () => ({ firstName: 'Client' })),
    };
    const createForm = defineMultiStepForm({
      instances: ['client', 'admin'],
      steps: {
        step1: {
          title: 'Step 1',
          fields: { firstName: { defaultValue: '' } },
        },
        step2: {
          title: 'Step 2',
          fields: { age: { defaultValue: 0 } },
        },
      },
    }).configure({
      defaultOverrides: {
        step1: async () => pretendServer.getSharedName(),
        step2: async () => pretendServer.getSharedAge(),
      },
    });
    const client = createForm({ instance: 'client' }).withOverrides({
      step1: async () => pretendServer.getClientName(),
    });
    const admin = createForm({ instance: 'admin' });

    await vi.waitFor(() => {
      expect(
        client.stepSchema.value.step1.fields.firstName.defaultValue,
      ).toBe('Client');
      expect(client.stepSchema.value.step2.fields.age.defaultValue).toBe(42);
      expect(admin.stepSchema.value.step1.fields.firstName.defaultValue).toBe(
        'Server default',
      );
      expect(admin.stepSchema.value.step2.fields.age.defaultValue).toBe(42);
    });
    expect(pretendServer.getSharedName).toHaveBeenCalledTimes(1);
    expect(pretendServer.getSharedAge).toHaveBeenCalledTimes(2);
    expect(pretendServer.getClientName).toHaveBeenCalledTimes(1);
  });

  it('creates typed value overrides and runs them when attached', async () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            profile: {
              defaultValue: {
                name: 'Taylor',
                active: false,
              },
              type: 'object.profile',
            },
          },
        },
      },
    }).configure();
    const override = createForm.createValueOverride({
      step: 'step1',
      values: ({ fields }) => {
        expectTypeOf(fields.profile.type).toEqualTypeOf<'object.profile'>();
        expectTypeOf(fields.profile.defaultValue).toEqualTypeOf<{
          name: string;
          active: boolean;
        }>();

        return {
          profile: {
            name: fields.profile.defaultValue.name,
            active: true,
          },
        };
      },
    });
    const schema = createForm().withOverrides({ step1: override });

    await vi.waitFor(() => {
      expect(
        schema.stepSchema.value.step1.fields.profile.defaultValue,
      ).toEqual({ name: 'Taylor', active: true });
    });
    expect(
      Reflect.apply(schema.stepSchema.getStepStatus, schema.stepSchema, [
        'step1',
      ]),
    ).toBe('resolved');
  });

  it('suspends the full step through Suspend', async () => {
    const deferred = createDeferred<{ firstName: string }>();
    const createForm = defineMultiStepForm({
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
    }).configure();

    const schema = createForm().withOverrides({
      step1: ({}) => deferred.promise,
    });

    const Step1 = schema.stepSchema.value.step1.createComponent({
      render: ({ Field, Suspend }) => (
        <Suspend fallback={<p data-testid='loading'>Loading</p>}>
          <Field name='firstName'>
            {({ defaultValue }) => <p data-testid='value'>{defaultValue}</p>}
          </Field>
        </Suspend>
      ),
    });

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
    const createForm = defineMultiStepForm({
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
    }).configure();

    const schema = createForm().withOverrides({
      step1: async () => {
        const values = await deferred.promise;

        return {
          firstName: values.firstName,
        };
      },
    });

    const Step1 = schema.stepSchema.value.step1.createComponent({
      render: ({ Field }) => (
        <Field
          name='firstName'
          suspend
          fallback={<p data-testid='field-loading'>Loading field</p>}
        >
          {({ defaultValue }) => <p data-testid='value'>{defaultValue}</p>}
        </Field>
      ),
    });

    const screen = await renderInJsdom(<Step1 />);

    expect(
      Reflect.apply(schema.stepSchema.getStepStatus, schema.stepSchema, [
        'step1',
      ]),
    ).toBe('loading');

    await act(async () => {
      deferred.resolve({
        firstName: 'Jordan',
      });
    });

    expect(screen.getByTestId('value').textContent).toBe('Jordan');
  });

  it('exposes the current override status through useStep', async () => {
    const deferred = createDeferred<{ firstName: string }>();
    const createForm = defineMultiStepForm({
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
    }).configure();

    const schema = createForm().withOverrides({
      step1: async () => {
        const values = await deferred.promise;

        return {
          firstName: values.firstName,
        };
      },
    });

    const Step1 = schema.stepSchema.value.step1.createComponent({
      render: ({ useStep }) => {
        const { data, status } = useStep();

        return (
          <>
            <p data-testid='status'>{status}</p>
            <p data-testid='value'>{data.fields.firstName.defaultValue}</p>
          </>
        );
      },
    });

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

  it('isolates primitive and object useStep selectors', async () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: { defaultValue: 'Taylor' },
            lastName: { defaultValue: 'Smith' },
            email: { defaultValue: 'taylor@example.com' },
            phoneNumber: { defaultValue: '555-0100' },
          },
        },
      },
    }).configure()();
    const firstNameRender = vi.fn();
    const contactDetailsRender = vi.fn();

    const FirstName = schema.stepSchema.value.step1.createComponent({
      render: ({ useStep }) => {
        const firstName = useStep({
          selector: ({ data }) => data.fields.firstName.defaultValue,
        });
        firstNameRender();

        return <p data-testid='selected-first-name'>{firstName}</p>;
      },
    });
    const ContactDetails = schema.stepSchema.value.step1.createComponent({
      render: ({ useStep }) => {
        const contactDetails = useStep({
          selector: ({ data }) => ({
            email: data.fields.email.defaultValue,
            phoneNumber: data.fields.phoneNumber.defaultValue,
          }),
        });
        contactDetailsRender();

        return <p data-testid='contact-details'>{contactDetails.email}</p>;
      },
    });
    const Controls = schema.stepSchema.value.step1.createComponent({
      render: ({ Field }) => (
        <>
          <Field name='lastName'>
            {({ onInputChange }) => (
              <button
                data-testid='update-last-name'
                onClick={() => onInputChange('Jones')}
              />
            )}
          </Field>
          <Field name='firstName'>
            {({ onInputChange }) => (
              <button
                data-testid='update-first-name'
                onClick={() => onInputChange('Jordan')}
              />
            )}
          </Field>
          <Field name='email'>
            {({ onInputChange }) => (
              <button
                data-testid='update-email'
                onClick={() => onInputChange('jordan@example.com')}
              />
            )}
          </Field>
        </>
      ),
    });

    const screen = await renderInJsdom(
      <>
        <FirstName />
        <ContactDetails />
        <Controls />
      </>,
    );

    expect(firstNameRender).toHaveBeenCalledTimes(1);
    expect(contactDetailsRender).toHaveBeenCalledTimes(1);

    await act(async () => screen.getByTestId('update-last-name').click());

    expect(firstNameRender).toHaveBeenCalledTimes(1);
    expect(contactDetailsRender).toHaveBeenCalledTimes(1);

    await act(async () => screen.getByTestId('update-first-name').click());

    expect(firstNameRender).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('selected-first-name').textContent).toBe(
      'Jordan',
    );
    expect(contactDetailsRender).toHaveBeenCalledTimes(1);

    await act(async () => screen.getByTestId('update-email').click());

    expect(contactDetailsRender).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('contact-details').textContent).toBe(
      'jordan@example.com',
    );
  });

  it('resolves overrides and isolates a status selector from field updates', async () => {
    const deferred = createDeferred<{ firstName: string }>();
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: { defaultValue: '' },
          },
        },
      },
    }).configure();

    const schema = createForm().withOverrides({
      step1: async () => deferred.promise,
    });
    const statusRender = vi.fn();

    const Status = schema.stepSchema.value.step1.createComponent({
      render: ({ useStep, Field }) => {
        const status = useStep({
          selector: (result) => result.status,
        });
        statusRender(status);

        return (
          <>
            <p data-testid='selected-status'>{status}</p>
            <Field name='firstName'>
              {({ onInputChange }) => (
                <button
                  data-testid='update-resolved-field'
                  onClick={() => onInputChange('Alex')}
                />
              )}
            </Field>
          </>
        );
      },
    });

    const screen = await renderInJsdom(<Status />);

    expect(
      Reflect.apply(schema.stepSchema.getStepStatus, schema.stepSchema, [
        'step1',
      ]),
    ).toBe('loading');

    await act(async () => deferred.resolve({ firstName: 'Jordan' }));

    expect(screen.getByTestId('selected-status').textContent).toBe('resolved');
    const renderCountAfterResolution = statusRender.mock.calls.length;

    await act(async () => screen.getByTestId('update-resolved-field').click());

    expect(statusRender).toHaveBeenCalledTimes(renderCountAfterResolution);
  });

  it('keeps non-overridden fields available after async step resolution', async () => {
    const deferred = createDeferred<{ firstName: string }>();
    const createForm = defineMultiStepForm({
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
        },
      },
    }).configure();

    const schema = createForm().withOverrides({
      step1: async () => {
        const values = await deferred.promise;

        return {
          firstName: values.firstName,
        };
      },
    });

    const Step1 = schema.stepSchema.value.step1.createComponent({
      render: ({ Field, Suspend }) => (
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
    });

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
    const createForm = defineMultiStepForm({
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
    }).configure();

    const schema = createForm().withOverrides({
      step1: async () => {
        throw new Error('Failed to load step defaults');
      },
    });

    const Step1 = schema.stepSchema.value.step1.createComponent({
      render: ({ useStep }) => {
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
    });

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
    const schema = defineMultiStepForm({
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
    }).configure()();

    schema.stepSchema.value.step1.createComponent({
      render: ({ useStep }) => {
        const defaultResult = useStep();
        const undefinedSelectorResult = useStep(undefined);
        const error = new CustomError('Failed to load step defaults');
        const customResult = useStep({
          error,
        });
        const firstName = useStep({
          selector: ({ data }) => data.fields.firstName.defaultValue,
        });
        const status = useStep({
          selector: (result) => result.status,
        });
        const customError = useStep({
          error,
          selector: (result) => result.error,
        });

        expectTypeOf(
          defaultResult.data.fields.firstName.defaultValue,
        ).toEqualTypeOf<string>();
        expectTypeOf(defaultResult.error).toEqualTypeOf<Error | undefined>();
        expectTypeOf(
          undefinedSelectorResult.data.fields.firstName.defaultValue,
        ).toEqualTypeOf<string>();
        expectTypeOf(customResult.error).toEqualTypeOf<
          CustomError | undefined
        >();
        expectTypeOf(firstName).toEqualTypeOf<string>();
        expectTypeOf(status).toEqualTypeOf<OverrideStatus>();
        expectTypeOf(customError).toEqualTypeOf<CustomError | undefined>();

        return null;
      },
    });
  });

  it('infers override fields at the react withOverrides entrypoint', () => {
    const createForm = defineMultiStepForm({
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
        },
      },
    }).configure();

    createForm().withOverrides({
      step1: ({ fields }) => {
        expectTypeOf(fields.firstName.defaultValue).toEqualTypeOf<string>();
        expectTypeOf(fields.phoneNumber.defaultValue).toEqualTypeOf<string>();
        expectTypeOf(
          fields.saveToAccount.defaultValue,
        ).toEqualTypeOf<boolean>();

        return {
          firstName: fields.firstName.defaultValue,
        };
      },
    });
  });

  it('preserves non-overridden fields through withForm and withContext', async () => {
    const deferred = createDeferred<{ firstName: string }>();
    const createForm = defineMultiStepForm({
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
        },
      },
    }).configure();

    const schema = createForm()
      .withOverrides({
        step1: async ({ fields }) => {
          expectTypeOf(
            fields.saveToAccount.defaultValue,
          ).toEqualTypeOf<boolean>();
          expectTypeOf(fields.firstName.defaultValue).toEqualTypeOf<string>();

          const values = await deferred.promise;

          return {
            firstName: values.firstName,
          };
        },
      })
      .withForm({
        render(
          { steps, isStepComplete },
          props: ComponentPropsWithRef<'form'>,
        ) {
          expectTypeOf(
            steps.step1.fields.firstName.defaultValue,
          ).toEqualTypeOf<string>();
          expectTypeOf(steps.step1.isComplete).toEqualTypeOf<() => boolean>();
          expectTypeOf(isStepComplete).parameter(0).toEqualTypeOf<'step1'>();

          return <form {...props} />;
        },
      })
      .withContext();

    const step1 = schema.stepSchema.value.step1;
    const Step1 = step1.createComponent({
      render: ({ Field, Form, Suspend }) => (
        <Suspend fallback={<p data-testid='loading'>Loading</p>}>
          <Form>
            <Field name='firstName'>
              {({ defaultValue }: any) => (
                <p data-testid='firstName'>{String(defaultValue)}</p>
              )}
            </Field>
            <Field name='saveToAccount'>
              {({ defaultValue }: any) => (
                <p data-testid='saveToAccount'>{String(defaultValue)}</p>
              )}
            </Field>
          </Form>
        </Suspend>
      ),
    });

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
