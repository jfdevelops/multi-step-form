import { it, expect } from 'vitest';
import { defineMultiStepForm } from '../src';

it('should use the custom storage key', () => {
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
  }).configure({
    storage: {
      key: 'custom-key',
    },
  })();

  expect(schema.storage.key).toBe('custom-key');
  expect(schema.stepSchema.__getStorage().key).toBe('custom-key');
});
