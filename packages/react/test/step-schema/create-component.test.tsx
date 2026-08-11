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
        render({
          ctx,
          Field,
          Form,
          Selector,
          Suspend,
          defaultValues,
          onInputChange,
          reset,
          update,
          useSelector,
          useStep,
        }) {
          expectTypeOf(ctx.step1.title).toEqualTypeOf<string>();
          expectTypeOf(defaultValues.firstName).toEqualTypeOf<string>();
          expectTypeOf(Field).toBeFunction();
          expectTypeOf(Form).toBeFunction();
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
            fields: { firstName: { defaultValue: 'Taylor' } },
          },
          step2: {
            title: 'Details',
            fields: { age: { defaultValue: 30 } },
          },
        },
      }).configure()();

      const AllSteps = schema.createComponent({
        stepData: 'all',
        render({ ctx }) {
          expectTypeOf(
            ctx.step1.fields.firstName.defaultValue,
          ).toEqualTypeOf<string>();
          expectTypeOf(
            ctx.step2.fields.age.defaultValue,
          ).toEqualTypeOf<number>();

          return (
            <span data-testid='all-steps'>
              {ctx.step1.fields.firstName.defaultValue}:{
                ctx.step2.fields.age.defaultValue
              }
            </span>
          );
        },
      });

      const screen = await renderInJsdom(<AllSteps />);

      expect(screen.getByTestId('all-steps').textContent).toBe('Taylor:30');
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
          ['step1'],
          undefined,
          MultiStepFormSchemaConfig.defaultFormAlias,
          ComponentPropsWithRef<'form'>,
          MultiStepFormSchemaConfig.defaultEnabledFor
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
          MultiStepFormSchemaConfig.defaultFormAlias,
          ComponentPropsWithRef<'form'>,
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
          ['step1'],
          undefined,
          MultiStepFormSchemaConfig.defaultFormAlias,
          ComponentPropsWithRef<'form'>,
          MultiStepFormSchemaConfig.defaultEnabledFor
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

      it('injects the Form component under the default alias', async () => {
        const schema = makeBaseSchema().withForm({
          render(_, props: ComponentPropsWithRef<'form'>) {
            return <form data-testid='injected-form' {...props} />;
          },
        });

        const spy = vi.fn();
        const Step1 = schema.stepSchema.value.step1.createComponent({
          render: ({ Form }) => {
            spy(Form);

            return (
              <Form>
                <span>content</span>
              </Form>
            );
          },
        });

        const screen = await renderInJsdom(<Step1 />);

        const lastCall = spy.mock.lastCall;
        expect(lastCall).toBeDefined();
        expect(lastCall![0]).toBeTypeOf('function');

        expect(screen.getByTestId('injected-form')).toBeDefined();
        expect(screen.getByText('content')).toBeDefined();
      });

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

      it('restores Form typing in CreateStepSpecificComponentCallback', () => {
        type CustomFormProps = {
          title: string;
          children?: ReactNode;
        };

        const schema = makeBaseSchema().withForm({
          render(_, { title, children }: CustomFormProps) {
            return <form aria-label={title}>{children}</form>;
          },
        });

        type ResolvedStep = typeof schema.stepSchema.value;
        type Steps = StepNumbers<ResolvedStep>;

        const callback: CreateStepSpecificComponentCallback<
          ResolvedStep,
          Steps,
          ['step1'],
          undefined,
          MultiStepFormSchemaConfig.defaultFormAlias,
          CustomFormProps,
          MultiStepFormSchemaConfig.defaultEnabledFor
        > = ({ Form }) => {
          // @ts-expect-error The custom form requires a title prop.
          <Form />;

          return <Form title='callback-typed-form'>content</Form>;
        };

        const Step1 = schema.stepSchema.value.step1.createComponent({
          render: callback,
        });

        expect(Step1).toBeTypeOf('function');
      });

      it('excludes Form from CreateStepSpecificComponentCallback when disabled for the step', () => {
        type CustomFormProps = {
          title: string;
          children?: ReactNode;
        };

        const schema = makeBaseSchema();

        type ResolvedStep = typeof schema.stepSchema.value;
        type Steps = StepNumbers<ResolvedStep>;

        const callback: CreateStepSpecificComponentCallback<
          ResolvedStep,
          Steps,
          ['step1'],
          undefined,
          MultiStepFormSchemaConfig.defaultFormAlias,
          CustomFormProps,
          ['step2']
        > = (input) => {
          // @ts-expect-error Form is only enabled for step2.
          const { Form } = input;

          return null;
        };

        expect(callback).toBeTypeOf('function');
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

      it('injects the Form under a custom alias', async () => {
        const schema = makeBaseSchema().withForm({
          alias: 'MyForm',
          render(_, props: ComponentPropsWithRef<'form'>) {
            return <form data-testid='alias-form' {...props} />;
          },
        });

        const spy = vi.fn();
        const Step1 = schema.stepSchema.value.step1.createComponent({
          render: ({ MyForm }) => {
            spy({ MyForm });

            return (
              <MyForm>
                <span>aliased</span>
              </MyForm>
            );
          },
        });

        const screen = await renderInJsdom(<Step1 />);

        const lastCall = spy.mock.lastCall;
        expect(lastCall).toBeDefined();
        expect(lastCall![0].MyForm).toBeTypeOf('function');
        // default 'Form' key should not be set when a custom alias is used
        expect(lastCall![0].Form).toBeUndefined();

        expect(screen.getByTestId('alias-form')).toBeDefined();
      });

      it('injects Form into all steps when enabledForSteps is "all"', async () => {
        const schema = makeBaseSchema().withForm({
          enabledForSteps: 'all',
          render(_, props: ComponentPropsWithRef<'form'>) {
            return <form data-testid='all-steps-form' {...props} />;
          },
        });

        const step1Spy = vi.fn();
        const step2Spy = vi.fn();
        const Step1 = schema.stepSchema.value.step1.createComponent({
          render: ({ Form }) => {
            step1Spy(Form);

            return <Form data-testid='s1-form' />;
          },
        });
        const Step2 = schema.stepSchema.value.step2.createComponent({
          render: ({ Form }) => {
            step2Spy(Form);

            return <Form data-testid='s2-form' />;
          },
        });

        await renderInJsdom(<Step1 />);
        const step1LastCall = step1Spy.mock.lastCall;
        expect(step1LastCall).toBeDefined();
        expect(step1LastCall![0]).toBeTypeOf('function');

        await renderInJsdom(<Step2 />);
        const step2LastCall = step2Spy.mock.lastCall;
        expect(step2LastCall).toBeDefined();
        expect(step2LastCall![0]).toBeTypeOf('function');
      });

      it('does not inject Form when the step is excluded by enabledForSteps', async () => {
        const schema = makeBaseSchema().withForm({
          enabledForSteps: ['step1'],
          render(_, props: ComponentPropsWithRef<'form'>) {
            return <form {...props} />;
          },
        });
        const step1Spy = vi.fn();
        const step2Spy = vi.fn();
        const Step1 = schema.stepSchema.value.step1.createComponent({
          render: ({ Form }) => {
            step1Spy(Form);

            return <Form />;
          },
        });
        const Step2 = schema.stepSchema.value.step2.createComponent({
          render: (input) => {
            step2Spy(input);

            return null;
          },
        });

        await renderInJsdom(<Step1 />);
        await renderInJsdom(<Step2 />);

        expect(step1Spy).toHaveBeenCalledWith(expect.any(Function));
        expect(step2Spy.mock.lastCall?.[0]).not.toHaveProperty('Form');
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
  it('creates a field component without custom props', async () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Contact',
          fields: {
            firstName: {
              defaultValue: 'Taylor',
              label: 'First name',
            },
          },
        },
      },
    }).configure()();

    const FirstName = schema.stepSchema.value.step1.createComponent.forField({
      field: 'firstName',
      render(field) {
        expectTypeOf(field.name).toEqualTypeOf<'firstName'>();
        expectTypeOf(field.defaultValue).toEqualTypeOf<string>();

        return (
          <button
            data-testid='first-name'
            onClick={() => field.onInputChange('Jordan')}
          >
            {field.defaultValue}
          </button>
        );
      },
    });

    const screen = await renderInJsdom(<FirstName suspend={false} />);
    const button = screen.getByTestId('first-name');

    expect(button.textContent).toContain('Taylor');

    await act(async () => {
      button.click();
    });

    expect(button.textContent).toContain('Jordan');
  });

  it('creates a field component with custom props', async () => {
    const schema = defineMultiStepForm({
      steps: {
        step2: {
          title: 'Details',
          fields: { age: { defaultValue: 30 } },
        },
      },
    }).configure()();

    const Age = schema.createComponent.forField({
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

    const screen = await renderInJsdom(<Age suffix='years' />);

    expect(screen.getByText('Age: 30 years')).toBeDefined();
  });
});
