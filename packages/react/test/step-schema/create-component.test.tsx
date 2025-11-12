import { render } from 'vitest-browser-react';
import { describe, expect, test } from 'vitest';
import { createMultiStepFormSchema } from '../../src';

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

      const Step1 = schema.stepSchema.value.step1.createComponent(
        function Step1({ ctx }) {
          expect(ctx).toBeDefined();
          expect(ctx).toHaveProperty('step1');
          // This check is to ensure that there are no other steps available
          expect(Object.keys(ctx)).toEqual(['step1']);

          return (
            <div>
              <p>Step 1 Title: {ctx.step1.title}</p>
            </div>
          );
        }
      );

      expect(Step1).toBeTypeOf('function');

      const screen = await render(<Step1 />);

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
      const Step1 = schema.stepSchema.value.step1.createComponent(
        {
          ctxData(input) {
            expect(input).toBeDefined();
            expect(input).toHaveProperty('ctx');

            return input.ctx;
          },
        },
        function Step1({ ctx }) {
          expect(ctx).toBeDefined();
          expect(ctx).toHaveProperty('step1');
          expect(ctx).toHaveProperty('step2');
          // This check is to ensure that there are no other steps available
          expect(Object.keys(ctx)).toEqual(['step1', 'step2']);

          return (
            <div>
              <p>Step 1 Title: {ctx.step1.title}</p>
              <p>Step 2 Title: {ctx.step2.title}</p>
            </div>
          );
        }
      );

      expect(Step1).toBeTypeOf('function');

      const screen = await render(<Step1 />);

      await expect
        .element(screen.getByText('Step 1 Title: First step'))
        .toBeInTheDocument();
      await expect
        .element(screen.getByText('Step 2 Title: Second step'))
        .toBeInTheDocument();
    });

    describe.todo('with custom form instance', () => {
      test.todo('without custom ctx', async () => {});
      test.todo('with custom ctx', async () => {});
    });
  });
});
