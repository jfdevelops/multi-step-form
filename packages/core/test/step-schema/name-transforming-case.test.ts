import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

describe('multi step form step schema: name transform casing', () => {
  it('uses the schema-wide casing for field labels', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: { title: 'Step 1', fields: { firstName: { defaultValue: '' } } },
      },
    }).configure({ nameTransformCasing: 'camel' })();

    type Label = typeof schema.stepSchema.value.step1.fields.firstName.label;
    expectTypeOf<Label>().toEqualTypeOf<'firstName'>();
    expect(schema.stepSchema.value.step1.fields.firstName.label).toBe(
      'firstName',
    );
  });

  it('defaults schema-wide field labels to title casing', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: { title: 'Step 1', fields: { firstName: { defaultValue: '' } } },
      },
    }).configure()();

    type Label = typeof schema.stepSchema.value.step1.fields.firstName.label;
    expectTypeOf<Label>().toEqualTypeOf<'First Name'>();
    expect(schema.stepSchema.value.step1.fields.firstName.label).toBe(
      'First Name',
    );
  });

  it('prefers the step casing over the schema-wide casing', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          nameTransformCasing: 'snake',
          fields: { firstName: { defaultValue: '' } },
        },
      },
    }).configure({ nameTransformCasing: 'camel' })();

    expect(schema.stepSchema.value.step1.fields.firstName.label).toBe(
      'first_name',
    );
  });

  it('should assign a default name transform casing to the step', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
        },
      },
    }).configure()();
    const { nameTransformCasing, fields } = schema.stepSchema.value.step1;

    expect(nameTransformCasing).toBe('title');
    expect(fields.firstName.nameTransformCasing).toBe('title');
    expect(fields.firstName.label).toBe('First Name');
  });

  it('should override the default name transform casing for the step', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          nameTransformCasing: 'kebab',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
        },
      },
    }).configure()();
    const { nameTransformCasing, fields } = schema.stepSchema.value.step1;

    expect(nameTransformCasing).toBe('kebab');
    expect(fields.firstName.nameTransformCasing).toBe('kebab');
    expect(fields.firstName.label).toBe('first-name');
  });

  it('should override the default name transform casing for a field', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          fields: {
            firstName: {
              defaultValue: '',
              nameTransformCasing: 'camel',
            },
          },
          title: 'Step 1',
        },
        step2: {
          fields: {
            lastName: {
              defaultValue: '',
            },
          },
          title: 'Step 2',
        },
      },
    }).configure()();

    expect(schema.stepSchema.value.step1.fields.firstName.nameTransformCasing).toBe(
      'camel'
    );
    expect(schema.stepSchema.value.step1.fields.firstName.label).toBe('firstName');
    expect(schema.stepSchema.value.step2.fields.lastName.nameTransformCasing).toBe(
      'title'
    );
  });
});
