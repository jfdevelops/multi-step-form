import { describe, it, expect } from 'vitest';
import { instantiateFields } from '@/steps/fields';
import { type } from 'arktype';

describe('createFields', () => {
  it('should create fields with the default casing', () => {
    const fields = instantiateFields({
      fields: {
        firstName: {
          defaultValue: '',
        },
      },
    });

    expect(fields).toStrictEqual({
      firstName: {
        defaultValue: '',
        label: 'First Name',
        nameTransformCasing: 'title',
        name: 'firstName',
        isRequired: false,
      },
    });
  });

  it('should create fields with the custom field name casing', () => {
    const fields = instantiateFields({
      fields: {
        firstName: {
          defaultValue: '',
          nameTransformCasing: 'kebab',
        },
      },
    });

    expect(fields).toStrictEqual({
      firstName: {
        defaultValue: '',
        label: 'first-name',
        nameTransformCasing: 'kebab',
        name: 'firstName',
        isRequired: false,
      },
    });
  });

  it('should create fields with the custom default casing', () => {
    const fields = instantiateFields({
      fields: {
        firstName: {
          defaultValue: '',
        },
      },
      defaultCasing: 'pascal',
    });

    expect(fields).toStrictEqual({
      firstName: {
        defaultValue: '',
        label: 'FirstName',
        nameTransformCasing: 'pascal',
        name: 'firstName',
        isRequired: false,
      },
    });
  });

  it('should create a field with a custom label', () => {
    const fields = instantiateFields({
      fields: {
        firstName: {
          defaultValue: '',
          label: 'Your first name',
        },
      },
    });

    expect(fields).toStrictEqual({
      firstName: {
        defaultValue: '',
        label: 'Your first name',
        nameTransformCasing: 'title',
        name: 'firstName',
        isRequired: false,
      },
    });
  });

  describe('when a date is provided as the defaultValue', () => {
    it('should create fields with the default type', () => {
      const now = new Date();
      const fields = instantiateFields({
        fields: {
          firstName: {
            defaultValue: now,
          },
        },
      });

      expect(fields).toStrictEqual({
        firstName: {
          defaultValue: now,
          label: 'First Name',
          nameTransformCasing: 'title',
          name: 'firstName',
          type: 'date',
          isRequired: false,
        },
      });
    });

    it('should create fields with the custom type', () => {
      const now = new Date();
      const fields = instantiateFields({
        fields: {
          firstName: {
            defaultValue: now,
            type: 'string',
          },
        },
      });

      expect(fields).toStrictEqual({
        firstName: {
          defaultValue: JSON.stringify(now),
          label: 'First Name',
          nameTransformCasing: 'title',
          name: 'firstName',
          type: 'string',
          isRequired: false,
        },
      });
    });
  });

  describe('when a validator is provided', () => {
    it('should validate the fields', () => {
      const fields = instantiateFields({
        fields: {
          firstName: {
            defaultValue: '',
          },
        },
        validateFields: type({ firstName: 'string' }),
      });

      expect(fields).toStrictEqual({
        firstName: {
          defaultValue: '',
          label: 'First Name',
          nameTransformCasing: 'title',
          name: 'firstName',
          isRequired: false,
        },
      });
    });

    it('does not validate initial field values', () => {
      expect(() =>
        instantiateFields({
          fields: { firstName: { defaultValue: '' } },
          validateFields: type({ firstName: 'number' }),
        })
      ).not.toThrow();
    });
  });
});
