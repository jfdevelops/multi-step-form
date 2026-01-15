import { createMultiStepFormSchema } from '@/schema';
import { MultiStepFormStepSchema } from '@/steps';
import { describe, expect, it } from 'vitest';

describe('hasData', () => {
  it('should return true if the value is a valid step config', () => {
    const config = createMultiStepFormSchema({
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

    expect(MultiStepFormStepSchema.hasData(config.stepSchema.value)).toBe(true);
  });


  it('should return false if the value is not a valid step config', () => {
    const config = {
      
    };

    expect(MultiStepFormStepSchema.hasData(config)).toBe(false);
  });


});
