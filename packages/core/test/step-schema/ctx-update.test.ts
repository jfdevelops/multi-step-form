import { type } from 'arktype';
import { beforeEach, describe, expect, it } from 'vitest';
import { MultiStepFormStepSchema } from '../../src';
import { createMockStorage } from '../utils/create-mock-storage';


describe('multi step form step schema: ctx update', () => {
  // Generate unique storage keys for each test to prevent data persistence
  let testCounter = 0;

  beforeEach(() => {
    testCounter++;
  });

  it('should have up-to-date ctx when helper function is called after updates', () => {
    const mockStorage = createMockStorage();
    const stepSchema = new MultiStepFormStepSchema({
      storage: {
        key: `ctx-update-test-${testCounter}-1-${Date.now()}`,
        store: mockStorage,
      },
      steps: {
        step1: {
          fields: {
            firstName: {
              defaultValue: '',
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
    });

    // Create a helper function that reads from ctx
    const getStep1Title = stepSchema.value.step1.createHelperFn(
      ({ ctx }) => ctx.step1.title
    );

    // Verify initial value
    expect(getStep1Title()).toBe('Step 1');

    // Update step1's title
    stepSchema.value.step1.update({
      fields: ['title'],
      updater: () => 'Step 1 Updated',
    });

    // Verify ctx reflects the updated value
    expect(getStep1Title()).toBe('Step 1 Updated');

    // Update again
    stepSchema.value.step1.update({
      fields: ['title'],
      updater: () => 'Step 1 Updated Again',
    });

    // Verify ctx is still up to date
    expect(getStep1Title()).toBe('Step 1 Updated Again');
  });

  it('should have up-to-date ctx when helper function accesses multiple steps', () => {
    const mockStorage = createMockStorage();
    const stepSchema = new MultiStepFormStepSchema({
      storage: {
        key: `ctx-update-test-${testCounter}-2-${Date.now()}`,
        store: mockStorage,
      },
      steps: {
        step1: {
          fields: {
            firstName: {
              defaultValue: '',
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
    });

    // Create a helper function that reads from multiple steps in ctx
    const getCombinedTitle = stepSchema.createHelperFn(
      { stepData: ['step1', 'step2'] },
      ({ ctx }) => `${ctx.step1.title} - ${ctx.step2.title}`
    );

    // Verify initial values
    expect(getCombinedTitle()).toBe('Step 1 - Step 2');

    // Update step1's title
    stepSchema.value.step1.update({
      fields: ['title'],
      updater: () => 'Step 1 Updated',
    });

    // Verify ctx reflects the updated value
    expect(getCombinedTitle()).toBe('Step 1 Updated - Step 2');

    // Update step2's title
    stepSchema.value.step2.update({
      fields: ['title'],
      updater: () => 'Step 2 Updated',
    });

    // Verify ctx reflects both updated values
    expect(getCombinedTitle()).toBe('Step 1 Updated - Step 2 Updated');
  });

  it('should have up-to-date ctx when helper function accesses field values', () => {
    const mockStorage = createMockStorage();
    const stepSchema = new MultiStepFormStepSchema({
      storage: {
        key: `ctx-update-test-${testCounter}-3-${Date.now()}`,
        store: mockStorage,
      },
      steps: {
        step1: {
          fields: {
            firstName: {
              defaultValue: 'John',
            },
          },
          title: 'Step 1',
        },
        step2: {
          fields: {
            lastName: {
              defaultValue: 'Doe',
            },
          },
          title: 'Step 2',
        },
      },
    });

    // Create a helper function that reads field values from ctx
    const getFullName = stepSchema.createHelperFn(
      { stepData: ['step1', 'step2'] },
      ({ ctx }) => {
        const firstName = ctx.step1.fields.firstName.defaultValue;
        const lastName = ctx.step2.fields.lastName.defaultValue;
        return `${firstName} ${lastName}`;
      }
    );

    // Verify initial values
    expect(getFullName()).toBe('John Doe');

    // Update step1's firstName field
    stepSchema.value.step1.update({
      fields: ['fields.firstName.defaultValue'],
      updater: () => 'Jane',
    });

    // Verify ctx reflects the updated field value
    expect(getFullName()).toBe('Jane Doe');

    // Update step2's lastName field
    stepSchema.value.step2.update({
      fields: ['fields.lastName.defaultValue'],
      updater: () => 'Smith',
    });

    // Verify ctx reflects both updated field values
    expect(getFullName()).toBe('Jane Smith');
  });

  it('should have up-to-date ctx when helper function is created at schema level', () => {
    const mockStorage = createMockStorage();
    const stepSchema = new MultiStepFormStepSchema({
      storage: {
        key: `ctx-update-test-${testCounter}-4-${Date.now()}`,
        store: mockStorage,
      },
      steps: {
        step1: {
          fields: {
            firstName: {
              defaultValue: '',
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
    });

    // Create a helper function at the schema level
    const getStep1Title = stepSchema.createHelperFn(
      { stepData: ['step1'] },
      ({ ctx }) => ctx.step1.title
    );

    // Verify initial value
    expect(getStep1Title()).toBe('Step 1');

    // Update step1's title
    stepSchema.update({
      targetStep: 'step1',
      fields: ['title'],
      updater: () => 'Step 1 Updated',
    });

    // Verify ctx reflects the updated value
    expect(getStep1Title()).toBe('Step 1 Updated');
  });

  it('should have up-to-date ctx when helper function has validator and input', () => {
    const mockStorage = createMockStorage();
    const stepSchema = new MultiStepFormStepSchema({
      storage: {
        key: `ctx-update-test-${testCounter}-5-${Date.now()}`,
        store: mockStorage,
      },
      steps: {
        step1: {
          fields: {
            firstName: {
              defaultValue: '',
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
    });

    // Create a helper function with validator
    const combineTitleWithInput = stepSchema.value.step1.createHelperFn(
      {
        validator: type({ suffix: 'string' }),
      },
      ({ ctx, data }) => `${ctx.step1.title} - ${data.suffix}`
    );

    // Verify initial value
    expect(combineTitleWithInput({ data: { suffix: 'test' } })).toBe(
      'Step 1 - test'
    );

    // Update step1's title
    stepSchema.value.step1.update({
      fields: ['title'],
      updater: () => 'Step 1 Updated',
    });

    // Verify ctx reflects the updated value even with input
    expect(combineTitleWithInput({ data: { suffix: 'test' } })).toBe(
      'Step 1 Updated - test'
    );
  });
});
