import { expectTypeOf, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

it('accepts only declared step keys on named instances', () => {
  const instance = defineMultiStepForm({
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
    instances: ['admin', 'client'],
  }).configure()({ instance: 'admin' });

  expectTypeOf(instance.stepSchema.isStepComplete)
    .parameter(0)
    .toEqualTypeOf<'step1' | 'step2'>();

  instance.stepSchema.isStepComplete('step1');
});
