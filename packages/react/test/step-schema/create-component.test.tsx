import type { MultiStepFormSchemaConfig } from '@/form-config';
import type {
  StepNumbers,
  StrippedResolvedStep
} from '@jfdevelops/multi-step-form';
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
        componentSpy as never
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
            Steps,
            ['step1'],
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
        componentSpy as never
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
        componentSpy as never
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
        'New value'
      );
    });

    describe.todo('with custom form instance', () => {
      test.todo('without custom ctx', async () => {});
      test.todo('with custom ctx', async () => {});
    });
  });
});
