import { render } from 'vitest-browser-react';
import { describe, expect, test, vi } from 'vitest';
import {
  createMultiStepFormSchema,
  type CreateStepSpecificComponentCallback,
  type StepSpecificComponent,
} from '../../src';
import type {
  StepNumbers,
  StrippedResolvedStep,
} from '@jfdevelops/multi-step-form';
import type {
  MultiStepFormSchemaConfig,
  MultiStepFormSchemaConfig,
} from '@/form-config';
import { ComponentPropsWithRef } from 'react';

describe('creating components via "createComponent" fn', () => {
  describe('using step specific "createComponent" fn', () => {
    test('without custom ctx', async () => {
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

    test('with custom "ctx"', async () => {
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
      await expect
        .element(screen.getByText('Step 2 Title: Second step'))
        .toBeInTheDocument();
    });

    test.skip('with calling "onInputChange"', async () => {
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

      console.log('----------before-----------');
      console.log(schema.stepSchema.value);
      debugger;
      const Step1 = schema.stepSchema.value.step1.createComponent(
        function Step1({ ctx, onInputChange }) {
          expect(ctx).toBeDefined();
          expect(ctx).toHaveProperty('step1');
          // This check is to ensure that there are no other steps available
          expect(Object.keys(ctx)).toEqual(['step1']);

          expect(onInputChange).toBeTypeOf('function');
          debugger;
          onInputChange({
            fields: {
              nameTransformCasing: true,
            },
            updater: 'flat',
          });

          return (
            <div>
              <p>Step 1 Title: {ctx.step1.title}</p>
            </div>
          );
        }
      );
      console.log('-------------------after------------------');
      console.log(schema.stepSchema.value);

      expect(schema.stepSchema.value.step1.nameTransformCasing).toBe('flat');
      expect(Step1).toBeTypeOf('function');

      const screen = await render(<Step1 />);

      await expect
        .element(screen.getByText('Step 1 Title: First step'))
        .toBeInTheDocument();
    });

    describe.todo('with custom form instance', () => {
      test.todo('without custom ctx', async () => {});
      test.todo('with custom ctx', async () => {});
    });
  });
});
