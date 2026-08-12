import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { defineMultiStepForm } from '../src';
import { createMockStorage } from './utils/create-mock-storage';

describe('field metadata: placeholder, isRequired, errorMessage', () => {
  it('resolves isRequired to false by default', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: { firstName: { defaultValue: '' } },
        },
      },
    }).configure();

    const instance = createForm();

    expect(instance.stepSchema.value.step1.fields.firstName.isRequired).toBe(
      false,
    );
    expect(instance.stepSchema.value.step1.fields.firstName.label).toBe(
      'First Name',
    );
  });

  it('appends a trailing "*" to the auto-derived label when isRequired is true and no label is given', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: { firstName: { defaultValue: '', isRequired: true } },
        },
      },
    }).configure();

    const instance = createForm();

    expect(instance.stepSchema.value.step1.fields.firstName.label).toBe(
      'First Name*',
    );
    expect(instance.stepSchema.value.step1.fields.firstName.isRequired).toBe(
      true,
    );

    expectTypeOf(
      instance.stepSchema.value.step1.fields.firstName.label,
    ).toBeString();
  });

  it('does not append "*" when an explicit label is provided, even if isRequired is true', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
              isRequired: true,
              label: 'Given name',
            },
          },
        },
      },
    }).configure();

    const instance = createForm();

    expect(instance.stepSchema.value.step1.fields.firstName.label).toBe(
      'Given name',
    );
  });

  it('carries through placeholder and errorMessage when provided', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
              placeholder: 'Jane',
              errorMessage: 'First name is required',
            },
          },
        },
      },
    }).configure();

    const instance = createForm();
    const field = instance.stepSchema.value.step1.fields.firstName;

    expect(field.placeholder).toBe('Jane');
    expect(field.errorMessage).toBe('First name is required');
    expectTypeOf(field.placeholder).toEqualTypeOf<string>();
    expectTypeOf(field.errorMessage).toEqualTypeOf<string>();
  });

  it('makes all field metadata available to public helper callbacks', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            email: {
              defaultValue: '',
              placeholder: 'name@example.com',
              isRequired: true,
              errorMessage: 'Enter a valid email',
              type: 'string.email',
            },
          },
        },
      },
    }).configure();
    const instance = createForm();
    const readMetadata = instance.stepSchema.value.step1.createHelperFn(
      ({ ctx }) => {
        const field = ctx.step1.fields.email;

        expectTypeOf(field.placeholder).toEqualTypeOf<string>();
        expectTypeOf(field.isRequired).toEqualTypeOf<true>();
        expectTypeOf(field.errorMessage).toEqualTypeOf<string>();
        expectTypeOf(field.type).toEqualTypeOf<'string.email'>();

        return field;
      },
    );

    expect(readMetadata()).toMatchObject({
      placeholder: 'name@example.com',
      isRequired: true,
      errorMessage: 'Enter a valid email',
      type: 'string.email',
    });
  });

  it('keeps every field metadata property intact after a storage-backed update round trip', () => {
    const mockStorage = createMockStorage();
    const transform = vi.fn((value: Date) => value.toISOString().slice(0, 10));

    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
              placeholder: 'Jane',
              label: 'Given name',
              isRequired: true,
              errorMessage: 'First name is required',
              type: 'string.custom',
              nameTransformCasing: 'camel',
            },
            birthDate: {
              defaultValue: new Date('2024-01-01'),
              type: 'string',
              transform,
            },
          },
        },
      },
    }).configure({
      storage: {
        key: `field-metadata-storage-test-${Date.now()}`,
        store: mockStorage,
      },
    });
    const instance = createForm();
    const expectedMetadata = {
      firstName: {
        name: 'firstName',
        placeholder: 'Jane',
        label: 'Given name',
        isRequired: true,
        errorMessage: 'First name is required',
        type: 'string.custom',
        nameTransformCasing: 'camel',
      },
      birthDate: {
        name: 'birthDate',
        transform,
        type: 'string',
      },
    };

    // Sanity check: the metadata is present before anything touches storage.
    expect(instance.stepSchema.value.step1.fields.firstName).toMatchObject(
      expectedMetadata.firstName,
    );
    expect(instance.stepSchema.value.step1.fields.birthDate).toMatchObject(
      expectedMetadata.birthDate,
    );

    // An update persists the step to storage and immediately syncs back from it —
    // the exact path that used to drop metadata lost in the JSON round trip.
    instance.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    });

    const firstName = instance.stepSchema.value.step1.fields.firstName;
    const birthDate = instance.stepSchema.value.step1.fields.birthDate;

    expect(firstName).toMatchObject(expectedMetadata.firstName);
    expect(firstName.defaultValue).toBe('Taylor');
    expect(birthDate).toMatchObject(expectedMetadata.birthDate);
    expect(typeof birthDate.transform).toBe('function');
    expect(birthDate.transform).toBe(transform);

    // A fresh sync from storage (e.g. what "mount" triggers) must also preserve it.
    instance.stepSchema.sync();

    expect(
      instance.stepSchema.value.step1.fields.firstName,
    ).toMatchObject(expectedMetadata.firstName);
    expect(instance.stepSchema.value.step1.fields.birthDate).toMatchObject(
      expectedMetadata.birthDate,
    );
    expect(instance.stepSchema.value.step1.fields.birthDate.transform).toBe(
      transform,
    );
  });
});

describe('step isComplete', () => {
  it('is always complete when no "isComplete" is configured', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: { firstName: { defaultValue: '' } },
        },
      },
    }).configure();

    const instance = createForm();

    expect(instance.stepSchema.isStepComplete('step1')).toBe(true);
    expect(instance.stepSchema.value.step1.isComplete()).toBe(true);
  });

  it('evaluates "isComplete" against the step current field values', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: { firstName: { defaultValue: '' } },
          isComplete: (data) => data.firstName.length > 0,
        },
      },
    }).configure();

    const instance = createForm();

    expect(instance.stepSchema.isStepComplete('step1')).toBe(false);

    instance.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    });

    expect(instance.stepSchema.isStepComplete('step1')).toBe(true);
    expect(instance.stepSchema.value.step1.isComplete()).toBe(true);
  });
});
