import { describe, expect, it, vi } from 'vitest';
import { defineMultiStepForm } from '../../src';
import { createMockStorage } from '../utils/create-mock-storage';

describe('multi step form step schema: update', () => {
  it('updates only the target step when fields is all', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          fields: {
            firstName: { defaultValue: '' },
          },
          title: 'Step 1',
        },
        step3: {
          fields: {
            time: { defaultValue: '08:00' },
          },
          title: 'Step 3',
        },
      },
    }).configure()();
    const {
      update: _update,
      reset: _reset,
      createHelperFn: _createHelperFn,
      ...step3
    } = schema.stepSchema.value.step3;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    schema.stepSchema.update({
      targetStep: 'step3',
      updater: {
        ...step3,
        fields: {
          ...step3.fields,
          time: { ...step3.fields.time, defaultValue: '09:00' },
        },
      },
    });

    expect(schema.stepSchema.value.step1.title).toBe('Step 1');
    expect(schema.stepSchema.value.step1.fields.firstName.defaultValue).toBe('');
    expect(schema.stepSchema.value.step3.fields.time.defaultValue).toBe('09:00');
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('includes update context and formatted details in mismatch errors', () => {
    const schema = defineMultiStepForm({
      steps: {
        step3: {
          fields: {
            location: { defaultValue: '' },
            time: { defaultValue: '08:00' },
          },
          title: 'Step 3',
        },
      },
    }).configure()();
    const invalidStepUpdate = {
      fields: {
        location: { defaultValue: 'Office' },
      },
      title: 'Step 3',
    };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      schema.stepSchema.update({
        targetStep: 'step3',
        // @ts-expect-error This intentionally omits a required field to exercise runtime validation.
        updater: invalidStepUpdate,
      })
    ).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining(
          '[update]: value mismatches for targetStep="step3", fields="all", strict=true, partial=false'
        ),
      })
    );

    expect(() =>
      schema.stepSchema.update({
        targetStep: 'step3',
        // @ts-expect-error This intentionally omits a required field to exercise runtime validation.
        updater: invalidStepUpdate,
      })
    ).toThrowError(/Missing key at "fields\.time"/);
    consoleError.mockRestore();
  });

  it.skip('should update the specified data immutably', () => {
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
        step3: {
          title: 'Step 3',
          fields: {
            age: {
              defaultValue: 25,
            },
          },
        },
      },
    }).configure()();

    // Capture pre-update references
    const beforeValueRef = schema.stepSchema.value;
    const beforeStep1Ref = schema.stepSchema.value.step1;
    const beforeCasing = beforeStep1Ref.nameTransformCasing;

    // Sanity check before update
    expect(beforeCasing).toBe('title');

    // Invoke the in-place update
    schema.stepSchema.update({
      targetStep: 'step1',
      fields: ['nameTransformCasing'],
      updater: 'camel'
    });

    // ✅ Verify that the outer object reference is stable
    expect(schema.stepSchema).toBe(schema.stepSchema);

    // ✅ Verify immutability: the top-level value is a new object
    expect(schema.stepSchema.value).not.toBe(beforeValueRef);

    // ✅ Verify that the specific step object is replaced (immutable update)
    expect(schema.stepSchema.value.step1).not.toBe(beforeStep1Ref);

    // ✅ Verify data updated correctly
    expect(schema.stepSchema.value.step1.nameTransformCasing).toBe('camel');

    // ✅ Verify the old reference wasn't affected
    expect(beforeStep1Ref.nameTransformCasing).toBe('title');
  });

  it("should update the target step using the classes' update method", () => {
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
        step3: {
          title: 'Step 3',
          fields: {
            age: {
              defaultValue: 25,
            },
          },
        },
      },
    }).configure()();

    expect(schema.stepSchema.value.step1.nameTransformCasing).toBe('title');

    schema.stepSchema.update({
      targetStep: 'step1',
      fields: ['nameTransformCasing'],
      updater() {
        return 'camel' as const;
      },
    });

    expect(schema.stepSchema.value.step1.nameTransformCasing).toBe('camel');
  });

  it("should update target step using the step's update method", () => {
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
        step3: {
          title: 'Step 3',
          fields: {
            age: {
              defaultValue: 25,
            },
          },
        },
      },
    }).configure()();

    expect(schema.stepSchema.value.step2.title).toBe('Step 2');

    schema.stepSchema.value.step2.update({
      fields: {
        title: true,
      },
      updater() {
        return 'Step 2 Updated';
      },
    });

    expect(schema.stepSchema.value.step2.title).toBe('Step 2 Updated');
  });

  it("should update the target step's object values with known keys", () => {
    const schema = defineMultiStepForm({
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
    }).configure()();

    expect(
      schema.stepSchema.value.step1.fields.userInfo.defaultValue
    ).toStrictEqual({
      firstName: '',
      lastName: '',
      age: 20,
    });
    schema.stepSchema.update({
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

    expect(
      schema.stepSchema.value.step1.fields.userInfo.defaultValue
    ).toStrictEqual({
      age: 21,
      firstName: 'Bob',
      lastName: 'Smith',
    });
  });

  it('should update Date values', () => {
    const initialDate = new Date('2024-01-01');
    const updatedDate = new Date('2024-12-31');

    const schema = defineMultiStepForm({
      steps: {
        step1: {
          fields: {
            birthDate: {
              defaultValue: initialDate,
            },
          },
          title: 'Step 1',
        },
      },
    }).configure()();

    expect(
      schema.stepSchema.value.step1.fields.birthDate.defaultValue
    ).toBeInstanceOf(Date);
    expect(schema.stepSchema.value.step1.fields.birthDate.defaultValue).toEqual(
      initialDate
    );

    schema.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.birthDate.defaultValue'],
      updater: updatedDate,
    });

    expect(
      schema.stepSchema.value.step1.fields.birthDate.defaultValue
    ).toBeInstanceOf(Date);
    expect(schema.stepSchema.value.step1.fields.birthDate.defaultValue).toEqual(
      updatedDate
    );
  });

  it('should update Date values stored in storage (serialized as strings)', () => {
    const mockStorage = createMockStorage();
    const initialDate = new Date('2024-01-01');
    const updatedDate = new Date('2024-12-31');

    // Create schema with Date and store it (Date gets serialized to string)
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          fields: {
            birthDate: {
              defaultValue: initialDate,
              type: 'date',
            },
          },
          title: 'Step 1',
        },
      },
    }).configure({
      storage: {
        key: `date-storage-test-${Date.now()}`,
        store: mockStorage,
      },
    })();

    expect(
      schema.stepSchema.value.step1.fields.birthDate.defaultValue
    ).toBeInstanceOf(Date);
    expect(schema.stepSchema.value.step1.fields.birthDate.defaultValue).toEqual(
      initialDate
    );

    schema.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.birthDate.defaultValue'],
      updater: updatedDate,
    });

    expect(
      schema.stepSchema.value.step1.fields.birthDate.defaultValue
    ).toBeInstanceOf(Date);
    expect(schema.stepSchema.value.step1.fields.birthDate.defaultValue).toEqual(
      updatedDate
    );
  });

  describe('mode config (shallow)', () => {
    it('should another key', () => {
      const schema = defineMultiStepForm({
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
      }).configure()();

      expect(
        schema.stepSchema.value.step1.fields.userInfo.defaultValue
      ).toStrictEqual({
        firstName: '',
        lastName: '',
        age: 20,
      });
      schema.stepSchema.update({
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

      expect(
        schema.stepSchema.value.step1.fields.userInfo.defaultValue
      ).toStrictEqual({
        age: 21,
        firstName: 'Bob',
        lastName: 'Smith',
        foo: 'bar',
      });
    });

    it('should update partially', () => {
      const schema = defineMultiStepForm({
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
      }).configure()();

      expect(
        schema.stepSchema.value.step1.fields.userInfo.defaultValue
      ).toStrictEqual({
        firstName: '',
        lastName: '',
        age: 20,
      });
      schema.stepSchema.update({
        targetStep: 'step1',
        partial: true,
        fields: ['fields.userInfo.defaultValue'],
        updater: {
          age: 21,
        },
      });

      expect(
        schema.stepSchema.value.step1.fields.userInfo.defaultValue
      ).toStrictEqual({
        age: 21,
        firstName: '',
        lastName: '',
      });
    });

    it("shouldn't update partially when strict is true and an unknown key is being added", () => {
      const schema = defineMultiStepForm({
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
      }).configure()();

      expect(
        schema.stepSchema.value.step1.fields.userInfo.defaultValue
      ).toStrictEqual({
        firstName: '',
        lastName: '',
        age: 20,
      });
      expect(() =>
        schema.stepSchema.update({
          targetStep: 'step1',
          partial: true,
          strict: true,
          silentErrors: false,
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
      const schema = defineMultiStepForm({
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
      }).configure()();

      schema.stepSchema.update({
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
        schema.stepSchema.value.step1.fields.userInfo.defaultValue;

      expect(name).toHaveProperty('middle', 'John');
      expect(contact.address).toHaveProperty('zip', '12345');
    });

    it('should update partially', () => {
      const schema = defineMultiStepForm({
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
      }).configure()();

      schema.stepSchema.update({
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
        schema.stepSchema.value.step1.fields.userInfo.defaultValue;

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
      const schema = defineMultiStepForm({
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
      }).configure()();

      expect(() =>
        schema.stepSchema.update({
          targetStep: 'step1',
          partial: true,
          strict: true,
          silentErrors: false,
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

  describe('silent errors', () => {
    describe('default behavior', () => {
      it('should silent errors when "partial === true"', () => {
        const schema = defineMultiStepForm({
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
        }).configure()();
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        schema.stepSchema.update({
          targetStep: 'step1',
          partial: true,
          fields: ['fields.userInfo.defaultValue'],
          updater: {
            age: 21,
          },
        });

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
      });

      it('should silent errors when "strict === false"', () => {
        const schema = defineMultiStepForm({
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
        }).configure()();

        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        schema.stepSchema.update({
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

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
      });

      it('should silent errors when "strict === false" AND "partial === true"', () => {
        const schema = defineMultiStepForm({
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
        }).configure()();

        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        schema.stepSchema.update({
          targetStep: 'step1',
          strict: false,
          partial: true,
          fields: ['fields.userInfo.defaultValue'],
          updater: {
            age: 21,
            firstName: 'Bob',
            lastName: 'Smith',
            foo: 'bar',
          },
        });

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
      });
    });

    describe('"silentErrors" === false', () => {
      it('shouldn\'t silent errors when "partial === true"', () => {
        const schema = defineMultiStepForm({
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
        }).configure()();
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        schema.stepSchema.update({
          targetStep: 'step1',
          partial: true,
          silentErrors: false,
          fields: ['fields.userInfo.defaultValue'],
          updater: {
            age: 21,
          },
        });

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
      });

      it('shouldn\'t silent errors when "strict === false"', () => {
        const schema = defineMultiStepForm({
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
        }).configure()();

        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        schema.stepSchema.update({
          targetStep: 'step1',
          strict: false,
          silentErrors: false,
          fields: ['fields.userInfo.defaultValue'],
          updater: {
            age: 21,
            firstName: 'Bob',
            lastName: 'Smith',
            foo: 'bar',
          },
        });

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
      });
    });
  });
});
