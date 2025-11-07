import {
  createMultiStepFormContext,
  createMultiStepFormSchema,
  type MultiStepFormSchema,
} from '@multi-step-form/react';
import type { ComponentPropsWithRef } from 'react';

//@ts-ignore
export const schema = createMultiStepFormSchema({
  steps: {
    step1: {
      title: 'Personal Information',
      fields: {
        firstName: {
          defaultValue: '',
        },
        lastName: {
          defaultValue: '',
        },
        email: {
          defaultValue: '',
          type: 'string.email',
        },
      },
    },
    step2: {
      title: 'Account/Preferences',
      fields: {
        username: {
          defaultValue: '',
        },
        password: {
          defaultValue: '',
        },
        language: {
          defaultValue: 'en',
          label: 'Preferred Language',
        },
      },
    },
    step3: {
      title: 'Confirmation',
      fields: {
        newsLetterOptIn: {
          defaultValue: false,
          type: 'boolean.switch',
        },
      },
    },
  },
  storage: {
    key: 'MultiStepFormBasicExample',
  },
  form: {
    alias: 'MyCoolCustomForm',
    enabledForSteps: ['step1', 'step2'],
    render(
      { id },
      {
        title,
        description,
        ...props
      }: ComponentPropsWithRef<'form'> & {
        title: string;
        description?: string;
      }
    ) {
      return (
        <div className='flex flex-col gap-y-4'>
          <div className='flex flex-col gap-y2'>
            <h1 className='font-bold text-xl'>{title}</h1>
            {description && <p>{description}</p>}
          </div>
          <form id={id} {...props} />
        </div>
      );
    },
  },
});


export const {
  useCanRestartForm,
  useMultiStepFormData,
  useProgress,
  useCurrentStepData,
} =
  // @ts-ignore
  createMultiStepFormContext(schema);

export type StepNumber = keyof MultiStepFormSchema.resolvedStep<typeof schema>;
