import { describe, expect, it } from 'vitest';
import { MultiStepFormStepSchema } from '../../src';

describe('multi step form step schema: update', () => {
  it.skip('should update the specified data immutably', () => {
    const stepSchema = new MultiStepFormStepSchema({
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
        step3: {
          title: 'Step 3',
          fields: {
            age: {
              defaultValue: 25,
            },
          },
        },
      },
    });

    // Capture pre-update references
    const beforeValueRef = stepSchema.value;
    const beforeStep1Ref = stepSchema.value.step1;
    const beforeCasing = beforeStep1Ref.nameTransformCasing;

    // Sanity check before update
    expect(beforeCasing).toBe('title');

    // Invoke the in-place update
    stepSchema.update({
      targetStep: 'step1',
      fields: ['nameTransformCasing'],
      updater() {
        return 'camel' as const;
      },
    });

    // ✅ Verify that the outer object reference is stable
    expect(stepSchema).toBe(stepSchema);

    // ✅ Verify immutability: the top-level value is a new object
    expect(stepSchema.value).not.toBe(beforeValueRef);

    // ✅ Verify that the specific step object is replaced (immutable update)
    expect(stepSchema.value.step1).not.toBe(beforeStep1Ref);

    // ✅ Verify data updated correctly
    expect(stepSchema.value.step1.nameTransformCasing).toBe('camel');

    // ✅ Verify the old reference wasn't affected
    expect(beforeStep1Ref.nameTransformCasing).toBe('title');
  });

  it("should update the target step using the classes' update method", () => {
    const stepSchema = new MultiStepFormStepSchema({
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
        step3: {
          title: 'Step 3',
          fields: {
            age: {
              defaultValue: 25,
            },
          },
        },
      },
    });

    expect(stepSchema.value.step1.nameTransformCasing).toBe('title');

    stepSchema.update({
      targetStep: 'step1',
      fields: ['nameTransformCasing'],
      updater() {
        return 'camel' as const;
      },
    });

    expect(stepSchema.value.step1.nameTransformCasing).toBe('camel');
  });

  it("should update target step using the step's update method", () => {
    const stepSchema = new MultiStepFormStepSchema({
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
        step3: {
          title: 'Step 3',
          fields: {
            age: {
              defaultValue: 25,
            },
          },
        },
      },
    });

    expect(stepSchema.value.step2.title).toBe('Step 2');

    stepSchema.value.step2.update({
      fields: {
        title: true,
      },
      updater() {
        return 'Step 2 Updated';
      },
    });

    expect(stepSchema.value.step2.title).toBe('Step 2 Updated');
  });

  it("should update the target step's object values with known keys", () => {
    const stepSchema = new MultiStepFormStepSchema({
      steps: {
        step1: {
          fields: {
            userInfo: {
              defaultValue: {
                firstName: '',
                lastName: '',
                age: 20,
              },
            },
          },
          title: 'Step 1',
        },
      },
    });

    expect(stepSchema.value.step1.fields.userInfo.defaultValue).toStrictEqual({
      firstName: '',
      lastName: '',
      age: 20,
    });
    stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.userInfo.defaultValue'],
      updater() {
        return {
          age: 21,
          firstName: 'Bob',
          lastName: 'Smith',
        };
      },
    });

    expect(stepSchema.value.step1.fields.userInfo.defaultValue).toStrictEqual({
      age: 21,
      firstName: 'Bob',
      lastName: 'Smith',
    });
  });

  describe('mode config (shallow)', () => {
    it('should another key', () => {
      const stepSchema = new MultiStepFormStepSchema({
        steps: {
          step1: {
            fields: {
              userInfo: {
                defaultValue: {
                  firstName: '',
                  lastName: '',
                  age: 20,
                },
              },
            },
            title: 'Step 1',
          },
        },
      });

      expect(stepSchema.value.step1.fields.userInfo.defaultValue).toStrictEqual(
        {
          firstName: '',
          lastName: '',
          age: 20,
        }
      );
      stepSchema.update({
        targetStep: 'step1',
        strict: false,
        fields: ['fields.userInfo.defaultValue'],
        updater: {
          age: 21,
          firstName: 'Bob',
          lastName: 'Smith',
          foo: 'bar',
        },
      });

      expect(stepSchema.value.step1.fields.userInfo.defaultValue).toStrictEqual(
        {
          age: 21,
          firstName: 'Bob',
          lastName: 'Smith',
          foo: 'bar',
        }
      );
    });

    it('should update partially', () => {
      const stepSchema = new MultiStepFormStepSchema({
        steps: {
          step1: {
            fields: {
              userInfo: {
                defaultValue: {
                  firstName: '',
                  lastName: '',
                  age: 20,
                },
              },
            },
            title: 'Step 1',
          },
        },
      });

      expect(stepSchema.value.step1.fields.userInfo.defaultValue).toStrictEqual(
        {
          firstName: '',
          lastName: '',
          age: 20,
        }
      );
      stepSchema.update({
        targetStep: 'step1',
        partial: true,
        fields: ['fields.userInfo.defaultValue'],
        updater: {
          age: 21,
        },
      });

      expect(stepSchema.value.step1.fields.userInfo.defaultValue).toStrictEqual(
        {
          age: 21,
          firstName: '',
          lastName: '',
        }
      );
    });

    it("shouldn't update partially when strict is true and an unknown key is being added", () => {
      const stepSchema = new MultiStepFormStepSchema({
        steps: {
          step1: {
            fields: {
              userInfo: {
                defaultValue: {
                  firstName: '',
                  lastName: '',
                  age: 20,
                },
              },
            },
            title: 'Step 1',
          },
        },
      });

      expect(stepSchema.value.step1.fields.userInfo.defaultValue).toStrictEqual(
        {
          firstName: '',
          lastName: '',
          age: 20,
        }
      );
      expect(() =>
        stepSchema.update({
          targetStep: 'step1',
          partial: true,
          strict: true,
          fields: ['fields.userInfo.defaultValue'],
          updater: {
            age: 21,
            // @ts-ignore
            foo: 'bar',
          },
        })
      ).toThrowError();
    });
  });

  describe('mode config (deep)', () => {
    it('should add another key', () => {
      const stepSchema = new MultiStepFormStepSchema({
        steps: {
          step1: {
            fields: {
              userInfo: {
                defaultValue: {
                  id: 1,
                  name: {
                    first: '',
                    last: '',
                  },
                  contact: {
                    email: '',
                    phone: '',
                    address: {
                      street: '',
                      city: '',
                      state: '',
                    },
                  },
                },
              },
            },
            title: 'Step 1',
          },
        },
      });

      stepSchema.update({
        targetStep: 'step1',
        strict: false,
        fields: ['fields.userInfo.defaultValue'],
        updater: {
          id: 1,
          name: {
            first: 'Bob',
            last: 'Smith',
            middle: 'John',
          },
          contact: {
            email: 'foo@test.foo',
            phone: '5555555555',
            address: {
              street: '123 Some St',
              city: 'Some City',
              state: 'NY',
              zip: '12345',
            },
          },
        },
      });

      const { contact, name } =
        stepSchema.value.step1.fields.userInfo.defaultValue;

      expect(name).toHaveProperty('middle', 'John');
      expect(contact.address).toHaveProperty('zip', '12345');
    });

    it('should update partially', () => {
      const stepSchema = new MultiStepFormStepSchema({
        steps: {
          step1: {
            fields: {
              userInfo: {
                defaultValue: {
                  id: 1,
                  name: {
                    first: '',
                    last: '',
                  },
                  contact: {
                    email: '',
                    phone: '',
                    address: {
                      street: '',
                      city: '',
                      state: '',
                    },
                  },
                },
              },
            },
            title: 'Step 1',
          },
        },
      });

      stepSchema.update({
        targetStep: 'step1',
        partial: true,
        fields: ['fields.userInfo.defaultValue'],
        updater: {
          name: {
            first: 'Bob',
          },
          contact: {
            address: {
              city: 'Some City',
            },
          },
        },
      });

      const { contact, name } =
        stepSchema.value.step1.fields.userInfo.defaultValue;

      expect(name).toStrictEqual({
        first: 'Bob',
        last: '',
      });
      expect(contact.address).toStrictEqual({
        street: '',

        city: 'Some City',
        state: '',
      });
    });

    it("shouldn't update partially when strict is true and an unknown key is being added", () => {
      const stepSchema = new MultiStepFormStepSchema({
        steps: {
          step1: {
            fields: {
              userInfo: {
                defaultValue: {
                  id: 1,
                  name: {
                    first: '',
                    last: '',
                  },
                },
              },
            },
            title: 'Step 1',
          },
        },
      });

      expect(() =>
        stepSchema.update({
          targetStep: 'step1',
          partial: true,
          strict: true,
          fields: ['fields.userInfo.defaultValue'],
          updater: {
            name: {
              first: 'Bob',
            },
            // @ts-ignore
            foo: 'bar',
          },
        })
      ).toThrowError();
    });
  });
});
