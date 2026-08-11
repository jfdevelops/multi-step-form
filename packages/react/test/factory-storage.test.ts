import { DEFAULT_STORAGE_KEY } from '@jfdevelops/multi-step-form-core';
import { afterEach, describe, expect, it } from 'vitest';
import { defineMultiStepForm } from '../src';

afterEach(() => {
  window.localStorage.clear();
});

describe('configured factory schema storage', () => {
  it('does not read from or write to the shared default browser key', () => {
    window.localStorage.setItem(
      DEFAULT_STORAGE_KEY,
      JSON.stringify({
        step1: {
          title: 'Persisted step',
          fields: { firstName: { defaultValue: 'Persisted' } },
        },
      }),
    );

    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Declared step',
          fields: { firstName: { defaultValue: 'Declared' } },
        },
      },
    }).configure();

    expect(
      createForm.stepSchema.value.step1.fields.firstName.defaultValue,
    ).toBe('Declared');

    createForm.stepSchema.value.step1.update({
      fields: ['fields.firstName.defaultValue'],
      updater: 'Factory update',
    });

    const persistedValue = JSON.parse(
      window.localStorage.getItem(DEFAULT_STORAGE_KEY)!,
    );
    expect(persistedValue.step1.fields.firstName.defaultValue).toBe(
      'Persisted',
    );
  });
});
