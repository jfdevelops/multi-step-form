import { defineMultiStepForm } from '@/define';
import { MultiStepFormStepSchema } from '@/steps';
import { describe, expect, it } from 'vitest';

describe('hasData', () => {
  it('should return true if the value is a valid step config', () => {
    const config = defineMultiStepForm({
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

    expect(MultiStepFormStepSchema.hasData(config.stepSchema.value)).toBe(true);
  });


  it('should return false if the value is not a valid step config', () => {
    const config = {
      
    };

    expect(MultiStepFormStepSchema.hasData(config)).toBe(false);
  });


});
