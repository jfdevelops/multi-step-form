import { describe, it, expect } from 'vitest';
import { instantiateSteps } from '@/steps/steps';
import { InvalidStepConfigError } from '@/errors/invalid-step-config';
import { type } from 'arktype';

describe('instantiateSteps', () => {
  it('should instantiate steps with the default casing', () => {
    const steps = instantiateSteps({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
        },
        step2: {
          title: 'Step 2',
          fields: {
            lastName: {
              defaultValue: '',
            },
          },
        },
      },
    });

    expect(steps).toStrictEqual({
      step1: {
        title: 'Step 1',
        nameTransformCasing: 'title',
        fields: {
          firstName: {
            defaultValue: '',
            label: 'First Name',
            nameTransformCasing: 'title',
            name: 'firstName',
          },
        },
      },
      step2: {
        title: 'Step 2',
        nameTransformCasing: 'title',
        fields: {
          lastName: {
            defaultValue: '',
            label: 'Last Name',
            nameTransformCasing: 'title',
            name: 'lastName',
          },
        },
      },
    });
  });

  it('should instantiate steps with custom nameTransformCasing', () => {
    const steps = instantiateSteps({
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
        step2: {
          title: 'Step 2',
          nameTransformCasing: 'pascal',
          fields: {
            lastName: {
              defaultValue: '',
            },
          },
        },
      },
    });

    expect(steps).toStrictEqual({
      step1: {
        title: 'Step 1',
        nameTransformCasing: 'kebab',
        fields: {
          firstName: {
            defaultValue: '',
            label: 'first-name',
            nameTransformCasing: 'kebab',
            name: 'firstName',
          },
        },
      },
      step2: {
        title: 'Step 2',
        nameTransformCasing: 'pascal',
        fields: {
          lastName: {
            defaultValue: '',
            label: 'LastName',
            nameTransformCasing: 'pascal',
            name: 'lastName',
          },
        },
      },
    });
  });

  it('should instantiate steps with description', () => {
    const steps = instantiateSteps({
      steps: {
        step1: {
          title: 'Step 1',
          description: 'This is step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
        },
        step2: {
          title: 'Step 2',
          fields: {
            lastName: {
              defaultValue: '',
            },
          },
        },
      },
    });

    expect(steps).toStrictEqual({
      step1: {
        title: 'Step 1',
        description: 'This is step 1',
        nameTransformCasing: 'title',
        fields: {
          firstName: {
            defaultValue: '',
            label: 'First Name',
            nameTransformCasing: 'title',
            name: 'firstName',
          },
        },
      },
      step2: {
        title: 'Step 2',
        nameTransformCasing: 'title',
        fields: {
          lastName: {
            defaultValue: '',
            label: 'Last Name',
            nameTransformCasing: 'title',
            name: 'lastName',
          },
        },
      },
    });
  });

  it('should instantiate steps without description', () => {
    const steps = instantiateSteps({
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
    });

    expect(steps.step1).not.toHaveProperty('description');
    expect(steps.step1).toStrictEqual({
      title: 'Step 1',
      nameTransformCasing: 'title',
      fields: {
        firstName: {
          defaultValue: '',
          label: 'First Name',
          nameTransformCasing: 'title',
          name: 'firstName',
        },
      },
    });
  });

  describe('when a validator is provided', () => {
    it('should validate the fields', () => {
      const steps = instantiateSteps({
        steps: {
          step1: {
            title: 'Step 1',
            fields: {
              firstName: {
                defaultValue: '',
              },
            },
            validateFields: type({ firstName: 'string' }),
          },
        },
      });

      expect(steps).toStrictEqual({
        step1: {
          title: 'Step 1',
          nameTransformCasing: 'title',
          fields: {
            firstName: {
              defaultValue: '',
              label: 'First Name',
              nameTransformCasing: 'title',
              name: 'firstName',
            },
          },
        },
      });
    });

    it('should error if the fields are invalid', () => {
      expect(() =>
        instantiateSteps({
          steps: {
            step1: {
              title: 'Step 1',
              fields: {
                firstName: {
                  defaultValue: '',
                },
              },
              validateFields: type({ firstName: 'number' }),
            },
          },
        })
      ).toThrowError(Error);
    });
  });

  describe('error cases', () => {
    it('should error if no steps are provided', () => {
      expect(() =>
        instantiateSteps({
          steps: {},
        })
      ).toThrowError(InvalidStepConfigError);
    });

    it('should error if step key is not in the correct format', () => {
      expect(() =>
        instantiateSteps({
          steps: {
            invalidKey: {
              title: 'Step 1',
              fields: {
                firstName: {
                  defaultValue: '',
                },
              },
            },
          },
        })
      ).toThrowError(InvalidStepConfigError);
    });

    it('should error if title is missing', () => {
      expect(() =>
        instantiateSteps({
          steps: {
            step1: {
              fields: {
                firstName: {
                  defaultValue: '',
                },
              },
            } as any,
          },
        })
      ).toThrowError(InvalidStepConfigError);
    });

    it('should error if title is not a string', () => {
      expect(() =>
        instantiateSteps({
          steps: {
            step1: {
              title: 123 as any,
              fields: {
                firstName: {
                  defaultValue: '',
                },
              },
            },
          },
        })
      ).toThrowError(InvalidStepConfigError);
    });

    it('should error if description is not a string', () => {
      expect(() =>
        instantiateSteps({
          steps: {
            step1: {
              title: 'Step 1',
              description: 123 as any,
              fields: {
                firstName: {
                  defaultValue: '',
                },
              },
            },
          },
        })
      ).toThrowError(InvalidStepConfigError);
    });

    it('should error if nameTransformCasing is invalid', () => {
      expect(() =>
        instantiateSteps({
          steps: {
            step1: {
              title: 'Step 1',
              nameTransformCasing: 'invalid' as any,
              fields: {
                firstName: {
                  defaultValue: '',
                },
              },
            },
          },
        })
      ).toThrowError(InvalidStepConfigError);
    });
  });
});
