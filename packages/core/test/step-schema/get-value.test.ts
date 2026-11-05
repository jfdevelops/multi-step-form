import { defineMultiStepForm } from '../../src';
import { describe, it, expect } from 'vitest';

describe('MultiStepFormStepSchema#getValue()', () => {
  describe('nested path resolution', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          fields: {
            field: {
              defaultValue: {
                nested: {
                  deep: {
                    value: 'found',
                  },
                },
              },
            },
          },
          title: 'Step 1',
        },
      },
    }).configure()();

    it('should get value at parent path', () => {
      expect(schema.stepSchema.getValue('step1', 'field')).toStrictEqual({
        nested: {
          deep: {
            value: 'found',
          },
        },
      });
    });

    it('should get value at intermediate nested path', () => {
      expect(schema.stepSchema.getValue('step1', 'field.nested')).toStrictEqual({
        deep: {
          value: 'found',
        },
      });
    });

    it('should get value at deepest nested path', () => {
      expect(schema.stepSchema.getValue('step1', 'field.nested.deep.value')).toBe(
        'found'
      );
    });
  });

  describe('different data types', () => {
    it('should handle primitive types', () => {
      const schema = defineMultiStepForm({
        steps: {
          step1: {
            fields: {
              string: { defaultValue: 'text' },
              number: { defaultValue: 42 },
              boolean: { defaultValue: true },
              zero: { defaultValue: 0 },
              falseValue: { defaultValue: false },
              emptyString: { defaultValue: '' },
            },
            title: 'Step 1',
          },
        },
      }).configure()();

      expect(schema.stepSchema.getValue('step1', 'string')).toBe('text');
      expect(schema.stepSchema.getValue('step1', 'number')).toBe(42);
      expect(schema.stepSchema.getValue('step1', 'boolean')).toBe(true);
      expect(schema.stepSchema.getValue('step1', 'zero')).toBe(0);
      expect(schema.stepSchema.getValue('step1', 'falseValue')).toBe(false);
      expect(schema.stepSchema.getValue('step1', 'emptyString')).toBe('');
    });

    it('should handle null and undefined', () => {
      const schema = defineMultiStepForm({
        steps: {
          step1: {
            fields: {
              nullValue: { defaultValue: null },
              undefinedValue: { defaultValue: undefined },
            },
            title: 'Step 1',
          },
        },
      }).configure()();

      expect(schema.stepSchema.getValue('step1', 'nullValue')).toBeNull();
      expect(schema.stepSchema.getValue('step1', 'undefinedValue')).toBeUndefined();
    });

    it('should handle arrays', () => {
      const schema = defineMultiStepForm({
        steps: {
          step1: {
            fields: {
              array: { defaultValue: [1, 2, 3] },
              emptyArray: { defaultValue: [] },
            },
            title: 'Step 1',
          },
        },
      }).configure()();

      expect(schema.stepSchema.getValue('step1', 'array')).toStrictEqual([1, 2, 3]);
      expect(schema.stepSchema.getValue('step1', 'emptyArray')).toStrictEqual([]);
    });

    it('should handle objects', () => {
      const schema = defineMultiStepForm({
        steps: {
          step1: {
            fields: {
              object: { defaultValue: { key: 'value' } },
            },
            title: 'Step 1',
          },
        },
      }).configure()();

      expect(schema.stepSchema.getValue('step1', 'object')).toStrictEqual({
        key: 'value',
      });
    });

    it('should handle empty objects', () => {
      const schema = defineMultiStepForm({
        steps: {
          step1: {
            fields: {
              emptyObject: { defaultValue: {} },
            },
            title: 'Step 1',
          },
        },
      }).configure()();

      // @ts-expect-error - TypeScript can't infer types for empty object defaultValues
      expect(schema.stepSchema.getValue('step1', 'emptyObject')).toStrictEqual({});
    });
  });

  describe('nested structures with arrays', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          fields: {
            data: {
              defaultValue: {
                items: [1, 2, 3],
                metadata: {
                  count: 3,
                },
                users: [
                  { id: 1, name: 'Alice' },
                  { id: 2, name: 'Bob' },
                ],
              },
            },
          },
          title: 'Step 1',
        },
      },
    }).configure()();

    it('should get nested array values', () => {
      expect(schema.stepSchema.getValue('step1', 'data.items')).toStrictEqual([
        1, 2, 3,
      ]);
      expect(schema.stepSchema.getValue('step1', 'data.users')).toStrictEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('should get nested object values', () => {
      expect(schema.stepSchema.getValue('step1', 'data.metadata')).toStrictEqual({
        count: 3,
      });
      expect(schema.stepSchema.getValue('step1', 'data.metadata.count')).toBe(3);
    });
  });

  describe('multiple steps', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          fields: {
            value: { defaultValue: 'step1' },
            nested: {
              defaultValue: {
                deep: { value: 'deep1' },
              },
            },
          },
          title: 'Step 1',
        },
        step2: {
          fields: {
            value: { defaultValue: 'step2' },
          },
          title: 'Step 2',
        },
      },
    }).configure()();

    it('should get values from different steps', () => {
      expect(schema.stepSchema.getValue('step1', 'value')).toBe('step1');
      expect(schema.stepSchema.getValue('step2', 'value')).toBe('step2');
      expect(schema.stepSchema.getValue('step1', 'nested.deep.value')).toBe('deep1');
    });
  });

  describe('multiple fields at same level', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          fields: {
            user: {
              defaultValue: {
                name: 'John',
                age: 30,
              },
            },
            address: {
              defaultValue: {
                city: 'New York',
              },
            },
          },
          title: 'Step 1',
        },
      },
    }).configure()();

    it('should get values from different sibling fields', () => {
      expect(schema.stepSchema.getValue('step1', 'user.name')).toBe('John');
      expect(schema.stepSchema.getValue('step1', 'address.city')).toBe('New York');
      expect(schema.stepSchema.getValue('step1', 'user')).toStrictEqual({
        name: 'John',
        age: 30,
      });
    });
  });

  describe('very deep nesting', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          fields: {
            a: {
              defaultValue: {
                b: {
                  c: {
                    d: {
                      e: {
                        f: {
                          g: { value: 'deep' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          title: 'Step 1',
        },
      },
    }).configure()();

    it('should get value from very deep nested path', () => {
      expect(
        schema.stepSchema.getValue('step1', 'a.b.c.d.e.f.g.value')
      ).toBe('deep');
    });
  });
});
