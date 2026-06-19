import type { MultiStepFormSchemaConfig } from '@/form-config';
import type {
  StepNumbers,
  StrippedResolvedStep,
} from '@jfdevelops/multi-step-form-core';
import { ComponentPropsWithRef } from 'react';
import { describe, expect, it, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  createMultiStepFormSchema,
  type CreateStepSpecificComponentCallback,
  type MultiStepFormSchema,
  type StepSpecificComponent,
} from '../../src';

describe('creating components via "createComponent" fn', () => {
  describe('using step specific "createComponent" fn', () => {
    it('should only use the default "ctx"', async () => {
      const schema = createMultiStepFormSchema({
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
      });

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

      const Step1 = schema.stepSchema.value.step1.createComponent(
        componentSpy as never,
      );

      expect(Step1).toBeTypeOf('function');

      const screen = await render(<Step1 />);

      const lastCall = componentSpy.mock.lastCall;

      expect(lastCall).toBeDefined();

      const [{ ctx }] = lastCall!;

      expect(ctx).toBeDefined();
      expect(ctx).toHaveProperty('step1');
      expect(Object.keys(ctx)).toEqual(['step1']);

      await expect
        .element(screen.getByText('Step 1 Title: First step'))
        .toBeInTheDocument();
    });

    it.skip('should use the provided custom "ctx"', async () => {
      const schema = createMultiStepFormSchema({
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
      });

      type ResolvedStep = MultiStepFormSchema.resolvedStep<typeof schema>;
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
            MultiStepFormSchemaConfig.defaultFormAlias,
            unknown,
            { step2: StrippedResolvedStep<ResolvedStep['step2'], false> }
          >['ctxData'],
          undefined
        >
      >(({ ctx }) => ctx);
      const Step1 = schema.stepSchema.value.step1.createComponent(
        {
          ctxData: ctxDataSpy as never,
        },
        componentSpy as never,
      );
      console.log('-------------------after------------------');
      console.log(schema.stepSchema.value);

      expect(schema.stepSchema.value.step1.nameTransformCasing).toBe('flat');
      expect(Step1).toBeTypeOf('function');

      const screen = await render(<Step1 />);

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
      await expect
        .element(screen.getByText('Step 1 Title: First step'))
        .toBeInTheDocument();
    });

    it('should use "onInputChange" to update a value for the specified field', async () => {
      const schema = createMultiStepFormSchema({
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
      });

      type ResolvedStep = MultiStepFormSchema.resolvedStep<typeof schema>;
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

      const Step1 = schema.stepSchema.value.step1.createComponent(
        componentSpy as never,
      );

      expect(Step1).toBeTypeOf('function');

      const screen = await render(<Step1 />);

      const lastCall = componentSpy.mock.lastCall;

      expect(lastCall).toBeDefined();

      const [{ ctx, onInputChange }] = lastCall!;

      expect(ctx).toBeDefined();
      expect(ctx).toHaveProperty('step1');
      expect(Object.keys(ctx)).toEqual(['step1']);

      await expect
        .element(screen.getByText('Step 1 Title: First step'))
        .toBeInTheDocument();

      expect(onInputChange).toBeDefined();
      onInputChange({
        fields: ['fields.foo.defaultValue'],
        updater: 'New value',
      });
      expect(schema.stepSchema.value.step1.fields.foo.defaultValue).toBe(
        'New value',
      );
    });

    describe.todo('with custom form instance', () => {
      test.todo('without custom ctx', async () => {});
      test.todo('with custom ctx', async () => {});
    });

    describe('with .withForm()', () => {
      function makeBaseSchema() {
        return createMultiStepFormSchema({
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
        });
      }

      it('injects the Form component under the default alias', async () => {
        const schema = makeBaseSchema().withForm({
          render() {
            return (props: ComponentPropsWithRef<'form'>) => (
              <form data-testid='injected-form' {...props} />
            );
          },
        });

        const spy = vi.fn(({ Form }: any) => (
          // Do not pass data-testid here so the inner data-testid='injected-form' is preserved
          <Form>
            <span>content</span>
          </Form>
        ));

        const Step1 = schema.stepSchema.value.step1.createComponent(
          spy as never,
        );

        const screen = await render(<Step1 />);

        const lastCall = spy.mock.lastCall;
        expect(lastCall).toBeDefined();
        expect(lastCall![0].Form).toBeTypeOf('function');

        await expect
          .element(screen.getByTestId('injected-form'))
          .toBeInTheDocument();
        await expect.element(screen.getByText('content')).toBeInTheDocument();
      });

      it('renders correctly when the step component uses the injected Form', async () => {
        const schema = makeBaseSchema().withForm({
          render() {
            return (props: ComponentPropsWithRef<'form'>) => (
              <form data-testid='form-renders-correctly' {...props} />
            );
          },
        });

        const Step1 = schema.stepSchema.value.step1.createComponent(
          ({ Form }: any) => (
            <Form>
              <span data-testid='form-inner-child'>child content</span>
            </Form>
          ),
        );

        const screen = await render(<Step1 />);

        await expect
          .element(screen.getByTestId('form-renders-correctly'))
          .toBeInTheDocument();
        await expect
          .element(screen.getByTestId('form-inner-child'))
          .toBeInTheDocument();
      });

      it('injects the Form under a custom alias', async () => {
        const schema = makeBaseSchema().withForm({
          alias: 'MyForm',
          render() {
            return (props: ComponentPropsWithRef<'form'>) => (
              <form data-testid='alias-form' {...props} />
            );
          },
        });

        const spy = vi.fn(({ MyForm }: any) => (
          <MyForm>
            <span>aliased</span>
          </MyForm>
        ));

        const Step1 = schema.stepSchema.value.step1.createComponent(
          spy as never,
        );

        const screen = await render(<Step1 />);

        const lastCall = spy.mock.lastCall;
        expect(lastCall).toBeDefined();
        expect(lastCall![0].MyForm).toBeTypeOf('function');
        // default 'Form' key should not be set when a custom alias is used
        expect(lastCall![0].Form).toBeUndefined();

        await expect
          .element(screen.getByTestId('alias-form'))
          .toBeInTheDocument();
      });

      it('injects Form into all steps when enabledForSteps is "all"', async () => {
        const schema = makeBaseSchema().withForm({
          enabledForSteps: 'all',
          render() {
            return (props: ComponentPropsWithRef<'form'>) => (
              <form data-testid='all-steps-form' {...props} />
            );
          },
        });

        const step1Spy = vi.fn(({ Form }: any) => (
          <Form data-testid='s1-form' />
        ));
        const step2Spy = vi.fn(({ Form }: any) => (
          <Form data-testid='s2-form' />
        ));

        const Step1 = schema.stepSchema.value.step1.createComponent(
          step1Spy as never,
        );
        const Step2 = schema.stepSchema.value.step2.createComponent(
          step2Spy as never,
        );

        await render(<Step1 />);
        const step1LastCall = step1Spy.mock.lastCall;
        expect(step1LastCall).toBeDefined();
        expect(step1LastCall![0].Form).toBeTypeOf('function');

        await render(<Step2 />);
        const step2LastCall = step2Spy.mock.lastCall;
        expect(step2LastCall).toBeDefined();
        expect(step2LastCall![0].Form).toBeTypeOf('function');
      });

      // NOTE: Step-specific enabledForSteps (e.g. ['step1']) is not currently testable
      // because the core validator receives numeric step keys [1, 2] but the type system
      // exposes string keys ('step1', 'step2'), causing a validation mismatch at runtime.
      it.todo(
        'does not inject Form when the step is excluded by enabledForSteps',
      );
    });
  });
});
