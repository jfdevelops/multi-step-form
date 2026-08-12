import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineMultiStepForm } from '../src';

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
