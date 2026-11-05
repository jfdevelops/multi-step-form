import { type } from 'arktype';
import { expect, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

it('does not throw when validateFields rejects initial field values', () => {
  expect(() =>
    defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: { firstName: { defaultValue: '' } },
          validateFields: type({ firstName: 'string > 0' }),
        },
      },
    }).configure()(),
  ).not.toThrow();
});
