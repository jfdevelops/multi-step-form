import type { MultiStepFormSchemaConfig } from '@/form-config';
import {
  InvalidComponentError,
  InvalidStepError,
  type StepNumbers,
  type StrippedResolvedStep,
} from '@jfdevelops/multi-step-form-core';
import {
  ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
  act,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  afterEach,
  describe,
  expect,
  expectTypeOf,
  it,
  test,
  vi,
} from 'vitest';
import {
  defineMultiStepForm,
  type CreateStepSpecificComponentCallback,
  type StepSpecificComponent,
} from '../../src';

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

describe('creating components via "createComponent" fn', () => {
  describe('using instance "createComponent" fn', () => {
    it('provides the same single-step render input as the step factory', async () => {
      const schema = defineMultiStepForm({
        steps: {
          step1: {
            title: 'Step 1',
            fields: { firstName: { defaultValue: 'Taylor' } },
          },
        },
      }).configure()();

      const Step1 = schema.createComponent({
        stepData: ['step1'],
        render(input) {
          const {
            ctx,
            Field,
            Selector,
            Suspend,
            defaultValues,
            onInputChange,
            reset,
            update,
            useSelector,
            useStep,
          } = input;

          expectTypeOf(ctx.step1.title).toEqualTypeOf<string>();
          expectTypeOf(defaultValues.firstName).toEqualTypeOf<string>();
          expectTypeOf(Field).toBeFunction();
          expectTypeOf(Selector).toBeFunction();
          expectTypeOf(Suspend).toBeFunction();
          expectTypeOf(onInputChange).toBeFunction();
          expectTypeOf(reset).toBeFunction();
          expectTypeOf(update).toBeFunction();
          expectTypeOf(useSelector).toBeFunction();
          expectTypeOf(useStep).toBeFunction();

          return (
            <Field name='firstName'>
              {({ defaultValue }) => (
                <span data-testid='instance-field'>{defaultValue}</span>
              )}
            </Field>
          );
        },
      });

      const screen = await renderInJsdom(<Step1 />);

      expect(screen.getByTestId('instance-field').textContent).toBe('Taylor');
    });

    it('provides strongly typed data for every step when stepData is all', async () => {
      const schema = defineMultiStepForm({
        steps: {
          step1: {
            title: 'Contact',
            fields: {
              firstName: { defaultValue: 'Taylor' },
              email: { defaultValue: 'client@example.com' },
            },
          },
          step2: {
            title: 'Details',
            fields: {
              age: { defaultValue: 30 },
              email: { defaultValue: 'admin@example.com' },
            },
          },
        },
      }).configure()();

      const AllSteps = schema.createComponent({
        stepData: 'all',
        render({ ctx, defaultValues, Selector, useSelector }) {
          const selectedAge = useSelector(
            (steps) => steps.step2.fields.age.defaultValue,
          );

          expectTypeOf(
            ctx.step1.fields.firstName.defaultValue,
          ).toEqualTypeOf<string>();
          expectTypeOf(
            ctx.step2.fields.age.defaultValue,
          ).toEqualTypeOf<number>();
          expectTypeOf(defaultValues.grouped.step1.firstName).toEqualTypeOf<
            string
          >();
          expectTypeOf(defaultValues.grouped.step2.age).toEqualTypeOf<number>();
          expectTypeOf(defaultValues.flat.firstName).toEqualTypeOf<string>();
          expectTypeOf(defaultValues.flat.age).toEqualTypeOf<number>();
          expectTypeOf(defaultValues.flat.email.step1).toEqualTypeOf<string>();
          expectTypeOf(defaultValues.flat.email.step2).toEqualTypeOf<string>();
          expectTypeOf(Selector).toBeFunction();
          expectTypeOf(selectedAge).toEqualTypeOf<number>();

          return (
            <>
              <span data-testid='all-steps'>
                {defaultValues.flat.firstName}:{defaultValues.grouped.step2.age}
                :{selectedAge}
              </span>
              <Selector
                selector={(steps) =>
                  steps.step1.fields.firstName.defaultValue
                }
              >
                {(firstName) => (
                  <span data-testid='all-steps-selector'>{firstName}</span>
                )}
              </Selector>
            </>
          );
        },
      });

      const screen = await renderInJsdom(<AllSteps />);

      expect(screen.getByTestId('all-steps').textContent).toBe('Taylor:30:30');
      expect(screen.getByTestId('all-steps-selector').textContent).toBe(
        'Taylor',
      );
    });

    it('provides grouped and flat default values for multiple selected steps', async () => {
      const schema = defineMultiStepForm({
        steps: {
          step1: {
            title: 'Contact',
            fields: {
              firstName: { defaultValue: 'Taylor' },
              email: { defaultValue: 'client@example.com' },
            },
          },
          step2: {
            title: 'Details',
            fields: {
              age: { defaultValue: 30 },
              email: { defaultValue: 'admin@example.com' },
            },
          },
          step3: {
            title: 'Unselected',
            fields: { accepted: { defaultValue: false } },
          },
        },
      }).configure()();

      const SelectedSteps = schema.createComponent({
        stepData: ['step1', 'step2'],
        render({ defaultValues, Field }) {
          expectTypeOf<keyof typeof defaultValues.grouped>().toEqualTypeOf<
            'step1' | 'step2'
          >();
          expectTypeOf(defaultValues.flat.firstName).toEqualTypeOf<string>();
          expectTypeOf(defaultValues.flat.age).toEqualTypeOf<number>();
          expectTypeOf(defaultValues.flat.email.step1).toEqualTypeOf<string>();
          expectTypeOf(defaultValues.flat.email.step2).toEqualTypeOf<string>();

          if (false) {
            // @ts-expect-error Unselected step defaults are not included.
            defaultValues.grouped.step3;
            // @ts-expect-error Unselected field defaults are not included.
            defaultValues.flat.accepted;
            // @ts-expect-error Field paths must belong to a selected step.
            <Field name='step3.accepted'>{() => null}</Field>;
            // @ts-expect-error Field paths must contain the owning step.
            <Field name='firstName'>{() => null}</Field>;
          }

          return (
            <>
              <span data-testid='selected-default-values'>
                {defaultValues.grouped.step1.firstName}:
                {defaultValues.flat.age}:{defaultValues.flat.email.step1}:
                {defaultValues.flat.email.step2}
              </span>
              <Field name='step1.firstName'>
                {(field) => {
                  expectTypeOf(field.name).toEqualTypeOf<'step1.firstName'>();
                  expectTypeOf(field.defaultValue).toEqualTypeOf<string>();

                  return (
                    <button
                      data-testid='multi-step-field'
                      onClick={() => field.onInputChange('Jordan')}
                    >
                      {field.name}:{field.defaultValue}
                    </button>
                  );
                }}
              </Field>
            </>
          );
        },
      });

      const screen = await renderInJsdom(<SelectedSteps />);

      expect(screen.getByTestId('selected-default-values').textContent).toBe(
        'Taylor:30:client@example.com:admin@example.com',
      );
      const field = screen.getByTestId('multi-step-field');

      expect(field.textContent).toBe('step1.firstName:Taylor');

      await act(async () => {
        field.click();
      });

      expect(field.textContent).toBe('step1.firstName:Jordan');
    });

    it('preserves step helpers for a partial object step selector', async () => {
      const schema = defineMultiStepForm({
        steps: {
          step1: {
            title: 'Contact',
            fields: { firstName: { defaultValue: 'Taylor' } },
          },
          step2: {
            title: 'Details',
            fields: { age: { defaultValue: 30 } },
          },
        },
      }).configure()();

      const Step1 = schema.createComponent({
        stepData: { step1: true },
        render({ ctx, reset, update }) {
          expectTypeOf(update.step1).toBeFunction();
          expectTypeOf(reset.step1).toBeFunction();

          return (
            <span data-testid='object-step-selector'>
              {ctx.step1.fields.firstName.defaultValue}
            </span>
          );
        },
      });

      const screen = await renderInJsdom(<Step1 />);

      expect(screen.getByTestId('object-step-selector').textContent).toBe(
        'Taylor',
      );
    });

    it('only accepts an object with a render property', () => {
      const schema = defineMultiStepForm({
        steps: {
          step1: {
            title: 'Step 1',
            fields: { firstName: { defaultValue: '' } },
          },
        },
      }).configure()();

      if (false) {
        // @ts-expect-error createComponent no longer accepts a callback argument.
        schema.stepSchema.value.step1.createComponent(() => null);
        // @ts-expect-error instance createComponent requires render in its config object.
        schema.createComponent({ stepData: ['step1'] });
      }

      expect(() =>
        Reflect.apply(
          schema.stepSchema.value.step1.createComponent,
          undefined,
          [() => null],
        ),
      ).toThrow(InvalidComponentError);
      expect(() =>
        Reflect.apply(schema.createComponent, schema, [() => null]),
      ).toThrow(InvalidComponentError);
    });
  });

  describe('using step specific "createComponent" fn', () => {
    it('should only use the default "ctx"', async () => {
      const schema = defineMultiStepForm({
        steps: {
          step1: {
            title: 'First step',
            fields: {
              foo: {
                defaultValue: '',
              },
            },
          },
          step2: {
            title: 'Second step',
            fields: {
              bar: {
                defaultValue: 0,
              },
            },
          },
          step3: {
            title: 'test',
            fields: {
              test: {
                defaultValue: {
                  nested: {
                    foo: {
                      bar: 0,
                    },
                  },
                  more: [],
                },
              },
              test2: {
                defaultValue: '',
              },
            },
          },
        },
      }).configure()();

      type ResolvedStep = typeof schema.stepSchema.value;
      type Steps = StepNumbers<ResolvedStep>;
      const componentSpy = vi.fn<
        CreateStepSpecificComponentCallback<
          ResolvedStep,
          Steps,
          ['step1']
        >
      >(({ ctx }) => (
        <div>
          <p>Step 1 Title: {ctx.step1.title}</p>
        </div>
      ));

      const Step1 = schema.stepSchema.value.step1.createComponent({
        render: componentSpy,
      });

      expect(Step1).toBeTypeOf('function');

      const screen = await renderInJsdom(<Step1 />);

      const lastCall = componentSpy.mock.lastCall;

      expect(lastCall).toBeDefined();

      const [{ ctx }] = lastCall!;

      expect(ctx).toBeDefined();
      expect(ctx).toHaveProperty('step1');
      expect(Object.keys(ctx)).toEqual(['step1']);

      expect(screen.getByText('Step 1 Title: First step')).toBeDefined();
    });

    it.skip('should use the provided custom "ctx"', async () => {
      const schema = defineMultiStepForm({
        steps: {
          step1: {
            title: 'First step',
            fields: {
              foo: {
                defaultValue: '',
              },
            },
          },
          step2: {
            title: 'Second step',
            fields: {
              bar: {
                defaultValue: 0,
              },
            },
          },
        },
      }).configure()();

      type ResolvedStep = typeof schema.stepSchema.value;
      type Steps = StepNumbers<ResolvedStep>;

      const componentSpy = vi.fn<
        CreateStepSpecificComponentCallback<
          ResolvedStep,
          Steps,
          ['step1'],
          undefined,
          string,
          undefined,
          MultiStepFormSchemaConfig.defaultEnabledFor,
          {},
          { step2: StrippedResolvedStep<ResolvedStep['step2'], false> }
        >
      >(({ ctx }) => (
        <div>
          <p>Step 1 Title: {ctx.step1.title}</p>
          <p>Step 2 Title: {ctx.step2.title}</p>
        </div>
      ));
      const ctxDataSpy = vi.fn<
        Exclude<
          StepSpecificComponent.options<
            ResolvedStep,
            'step1',
            { step2: StrippedResolvedStep<ResolvedStep['step2'], false> }
          >['ctxData'],
          undefined
        >
      >(({ ctx }) => ({ step2: ctx.step2 }));
      const Step1 = schema.stepSchema.value.step1.createComponent({
        ctxData: ctxDataSpy,
        render: componentSpy,
      });
      console.log('-------------------after------------------');
      console.log(schema.stepSchema.value);

      expect(schema.stepSchema.value.step1.nameTransformCasing).toBe('flat');
      expect(Step1).toBeTypeOf('function');

      const screen = await renderInJsdom(<Step1 />);

      // ctxData assertions
      const lastCtxDataCall = ctxDataSpy.mock.lastCall;

      expect(lastCtxDataCall).toBeDefined();

      const [input] = lastCtxDataCall!;

      expect(input).toBeDefined();
      expect(input).toHaveProperty('ctx');

      // component fn assertions
      const lastComponentCall = componentSpy.mock.lastCall;

      expect(lastComponentCall).toBeDefined();

      const [{ ctx }] = lastComponentCall!;

      expect(ctx).toBeDefined();
      expect(ctx).toHaveProperty('step1');
      expect(ctx).toHaveProperty('step2');
      expect(Object.keys(ctx)).toEqual(['step1', 'step2']);

      // render assertions
      expect(screen.getByText('Step 1 Title: First step')).toBeDefined();
    });

    it('should use "onInputChange" to update a value for the specified field', async () => {
      const schema = defineMultiStepForm({
        steps: {
          step1: {
            title: 'First step',
            fields: {
              foo: {
                defaultValue: '',
              },
              sibling: {
                defaultValue: '',
              },
            },
          },
          step2: {
            title: 'Second step',
            fields: {
              bar: {
                defaultValue: 0,
              },
            },
          },
        },
      }).configure()();

      type ResolvedStep = typeof schema.stepSchema.value;
      type Steps = StepNumbers<ResolvedStep>;

      const componentSpy = vi.fn<
        CreateStepSpecificComponentCallback<
          ResolvedStep,
          Steps,
          ['step1']
        >
      >(({ ctx, onInputChange }) => (
        <div>
          <p>Step 1 Title: {ctx.step1.title}</p>
          <input
            type='text'
            data-testid='foo'
            value={ctx.step1.fields.foo.defaultValue}
            onChange={(e) =>
              onInputChange({
                fields: ['fields.foo.defaultValue'],
                updater: e.target.value,
              })
            }
          />
        </div>
      ));

      const Step1 = schema.stepSchema.value.step1.createComponent({
        render: componentSpy,
      });

      expect(Step1).toBeTypeOf('function');

      const screen = await renderInJsdom(<Step1 />);

      const lastCall = componentSpy.mock.lastCall;

      expect(lastCall).toBeDefined();

      const [{ ctx, onInputChange, update }] = lastCall!;

      expect(ctx).toBeDefined();
      expect(ctx).toHaveProperty('step1');
      expect(Object.keys(ctx)).toEqual(['step1']);

      expect(screen.getByText('Step 1 Title: First step')).toBeDefined();

      expect(onInputChange).toBeDefined();
      onInputChange({
        fields: ['fields.foo.defaultValue'],
        updater: 'New value',
      });
      expect(schema.stepSchema.value.step1.fields.foo.defaultValue).toBe(
        'New value',
      );
      expect(update).toBeTypeOf('function');
      update({
        targetStep: 'step1',
        fields: ['fields.sibling.defaultValue'],
        updater: () => 'Updated directly',
      });
      expect(schema.stepSchema.value.step1.fields.sibling.defaultValue).toBe(
        'Updated directly',
      );
      update.step1({
        fields: ['fields.sibling.defaultValue'],
        updater: () => 'Updated through step helper',
      });
      expect(schema.stepSchema.value.step1.fields.sibling.defaultValue).toBe(
        'Updated through step helper',
      );
    });

    describe.todo('with custom form instance', () => {
      test.todo('without custom ctx', async () => {});
      test.todo('with custom ctx', async () => {});
    });

    describe('with .withForm()', () => {
      function makeBaseSchema() {
        return defineMultiStepForm({
          steps: {
            step1: {
              title: 'Step 1',
              fields: { firstName: { defaultValue: '' } },
            },
            step2: {
              title: 'Step 2',
              fields: { lastName: { defaultValue: '' } },
            },
          },
        }).configure()();
      }

      it('supports render without custom props', () => {
        const schema = makeBaseSchema().withForm({
          render({ id }) {
            return <form id={id} />;
          },
        });

        schema.stepSchema.value.step1.createComponent({
          render: ({ Form }) => <Form />,
        });
      });

      it('keeps render context steps up to date', async () => {
        window.localStorage.clear();

        type CustomFormProps = {
          children?: ReactNode;
        };
        const renderSpy = vi.fn();
        const schema = makeBaseSchema().withForm({
          render({ id, steps }, { children }: CustomFormProps) {
            const firstName = steps.step1.fields.firstName.defaultValue;
            renderSpy(firstName);

            return (
              <form id={id}>
                <span data-testid='live-first-name'>{firstName}</span>
                {children}
              </form>
            );
          },
        });
        const Step1 = schema.stepSchema.value.step1.createComponent({
          render: ({ Form }) => <Form />,
        });

        const screen = await renderInJsdom(<Step1 />);

        expect(screen.getByTestId('live-first-name').textContent).toBe('');

        await act(async () => {
          schema.stepSchema.value.step1.update({
            fields: ['fields.firstName.defaultValue'],
            updater: 'Taylor',
          });
        });

        expect(screen.getByTestId('live-first-name').textContent).toBe(
          'Taylor',
        );
        expect(renderSpy).toHaveBeenLastCalledWith('Taylor');
      });

      it('provides live hook-free current-step and progress callbacks', async () => {
        const schema = makeBaseSchema().withForm({
          render({ steps, getCurrentStepData, getProgress, isStepComplete }) {
            const currentStep = getCurrentStepData({
              targetStep: 'step1',
            });
            const progress = getProgress({
              targetStep: 'step1',
              progressTextTransformer(
                { targetStep, totalSteps },
                props: { className: string },
              ) {
                return (
                  <div {...props}>
                    {targetStep} of {totalSteps}
                  </div>
                );
              },
            });

            expect(Reflect.has(steps.step1, 'update')).toBe(false);
            expect(Reflect.has(steps.step1, 'reset')).toBe(false);
            expect(Reflect.has(steps.step1, 'createComponent')).toBe(false);
            expect(Reflect.has(steps.step1, 'createHelperFn')).toBe(false);
            expect(() =>
              Reflect.apply(isStepComplete, undefined, ['step3']),
            ).toThrow(InvalidStepError);
            expect(() =>
              Reflect.apply(getCurrentStepData, undefined, [
                { targetStep: 'step3' },
              ]),
            ).toThrow(InvalidStepError);

            if (false) {
              // @ts-expect-error Only concrete schema step keys are accepted.
              getProgress({ targetStep: 'step3' });
            }

            if (!currentStep.hasData) {
              const NoCurrentData = currentStep.NoCurrentData;

              return <NoCurrentData className='no-current-data' />;
            }

            expectTypeOf(
              currentStep.data.fields.firstName.defaultValue,
            ).toEqualTypeOf<string>();
            expect(Reflect.has(currentStep.data, 'update')).toBe(false);

            return (
              <div>
                <span data-testid='callback-first-name'>
                  {currentStep.data.fields.firstName.defaultValue}
                </span>
                <span data-testid='callback-progress'>{progress.value}</span>
                <span data-testid='callback-is-complete'>
                  {String(isStepComplete('step1'))}
                </span>
                <progress.ProgressText className='progress-text' />
              </div>
            );
          },
        });
        const Step1 = schema.stepSchema.value.step1.createComponent({
          render: ({ Form }) => <Form />,
        });

        const screen = await renderInJsdom(<Step1 />);

        expect(screen.getByTestId('callback-progress').textContent).toBe('50');
        expect(screen.getByTestId('callback-is-complete').textContent).toBe(
          'true',
        );
        expect(screen.getByText('step1 of 2')).toBeDefined();

        await act(async () => {
          schema.stepSchema.value.step1.update({
            fields: ['fields.firstName.defaultValue'],
            updater: 'Morgan',
          });
        });

        expect(screen.getByTestId('callback-first-name').textContent).toBe(
          'Morgan',
        );
      });

      it('infers Form props from the second parameter of withForm.render', () => {
        type CustomFormProps = {
          title: string;
          children?: ReactNode;
        };

        const schema = makeBaseSchema().withForm({
          render(context, { title, children }: CustomFormProps) {
            type HasWidenedStepIndex =
              `step${number}` extends keyof typeof context.steps ? true : false;

            expectTypeOf<HasWidenedStepIndex>().toEqualTypeOf<false>();
            expectTypeOf(
              context.steps.step1.fields.firstName.defaultValue,
            ).toEqualTypeOf<string>();
            expectTypeOf(
              context.steps.step1.fields.firstName.nameTransformCasing,
            ).toEqualTypeOf<'title'>();
            expectTypeOf(
              context.steps.step1.fields.firstName.label,
            ).toEqualTypeOf<'First Name'>();
            expectTypeOf(context.steps.step1.isComplete).toEqualTypeOf<
              () => boolean
            >();
            expectTypeOf(context.isStepComplete)
              .parameter(0)
              .toEqualTypeOf<'step1' | 'step2'>();

            // @ts-expect-error Only concrete schema step keys are accepted.
            context.isStepComplete('step3');

            return <form aria-label={title}>{children}</form>;
          },
        });

        schema.stepSchema.value.step1.createComponent({
          render: ({ Form }) => {
            const TypedForm = Form;
            expectTypeOf(TypedForm).toEqualTypeOf<
              (props: CustomFormProps) => ReactNode
            >();

            // @ts-expect-error The custom form requires a title prop.
            <TypedForm />;

            return <TypedForm title='typed-form'>content</TypedForm>;
          },
        });
      });

      it('renders correctly when the step component uses the injected Form', async () => {
        const schema = makeBaseSchema().withForm({
          render(_, props: ComponentPropsWithRef<'form'>) {
            return <form data-testid='form-renders-correctly' {...props} />;
          },
        });

        const Step1 = schema.stepSchema.value.step1.createComponent({
          render: ({ Form }) => (
            <Form>
              <span data-testid='form-inner-child'>child content</span>
            </Form>
          ),
        });

        const screen = await renderInJsdom(<Step1 />);

        expect(screen.getByTestId('form-renders-correctly')).toBeDefined();
        expect(screen.getByTestId('form-inner-child')).toBeDefined();
      });

      it('infers step suspense helpers from the step field defaults', () => {
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
          step1: () => ({
            firstName: '',
          }),
        });

        schema.stepSchema.value.step1.createComponent({
          render: ({ useStep, Suspend, Field }) => {
            const { status } = useStep();

            status satisfies 'idle' | 'loading' | 'resolved' | 'error';

            return (
              <Suspend fallback={null}>
                <Field name='firstName'>
                  {({ defaultValue }) => defaultValue}
                </Field>
              </Suspend>
            );
          },
        });
      });
    });
  });
});

describe('creating reusable components via "createComponent.forField"', () => {
  it('creates a selectable field component for explicit instances without custom props', async () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Contact',
          fields: {
            firstName: {
              defaultValue: 'Taylor',
              label: 'First name',
            },
            lastName: {
              defaultValue: 'Client',
              label: 'Last name',
            },
            email: {
              defaultValue: 'client@example.com',
            },
          },
        },
      },
      instances: ['client', 'admin'],
    }).configure();
    const client = createForm({ instance: 'client' })
      .withOverrides({
        step1: async () => ({
          firstName: 'Client override',
          lastName: 'Wrong client field',
        }),
      })
      .withForm({ render: () => null })
      .withContext();
    const admin = createForm({ instance: 'admin' }).withOverrides({
      step1: async () => ({
        firstName: 'Wrong admin field',
        lastName: 'Admin override',
      }),
    });

    const Name = createForm.stepSchema.value.step1.createComponent.forField({
      fields: ['firstName', 'lastName'],
      render(field) {
        expectTypeOf(field.name).toEqualTypeOf<'firstName' | 'lastName'>();
        expectTypeOf(field.defaultValue).toEqualTypeOf<string>();

        return <p>{field.defaultValue}</p>;
      },
    });

    if (false) {
      // @ts-expect-error Factory field components must choose an instance explicitly.
      <Name field='firstName' />;
      // @ts-expect-error Only fields declared by step1 can be selected.
      <Name instance={client} field='email' />;
    }

    const screen = await renderInJsdom(
      <>
        <Name
          instance={client}
          field='firstName'
          suspend
          fallback={<p>Loading client</p>}
        />
        <Name
          instance={admin}
          field='lastName'
          suspend
          fallback={<p>Loading admin</p>}
        />
      </>,
    );

    expect(screen.getByText('Client override')).toBeDefined();
    expect(screen.getByText('Admin override')).toBeDefined();
  });

  it('creates a bound field component for an explicit instance with custom props', async () => {
    const createForm = defineMultiStepForm({
      steps: {
        step2: {
          title: 'Details',
          fields: { age: { defaultValue: 30 } },
        },
      },
    }).configure();
    const instance = createForm();

    const Age = createForm.createComponent.forField({
      step: 'step2',
      field: 'age',
      render(field, props: { suffix: string }) {
        expectTypeOf(field.name).toEqualTypeOf<'age'>();
        expectTypeOf(field.defaultValue).toEqualTypeOf<number>();

        return (
          <p>
            Age: {field.defaultValue} {props.suffix}
          </p>
        );
      },
    });

    const screen = await renderInJsdom(
      <Age instance={instance} suffix='years' />,
    );

    expect(screen.getByText('Age: 30 years')).toBeDefined();
  });
});
