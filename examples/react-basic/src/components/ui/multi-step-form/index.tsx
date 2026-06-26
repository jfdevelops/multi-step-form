import {
  createMultiStepFormSchema,
  type MultiStepFormSchema,
} from '@jfdevelops/react-multi-step-form';
import type { ComponentPropsWithRef, ReactNode } from 'react';

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
      title: 'Preferences & Confirmation',
      fields: {
        theme: {
          defaultValue: 'light',
          label: 'Theme Preference',
        },
        preferences: {
          defaultValue: {
            notifications: true,
            fontSize: 'medium',
            colorScheme: 'blue',
          },
          label: 'User Preferences',
        },
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
})
  .withForm({
    render(steps) {
      return function Form({
        targetStep,
        title,
        description,
        footer,
        ...props
      }: Omit<ComponentPropsWithRef<'form'>, 'id'> & {
        targetStep: StepNumber;
        title?: ReactNode;
        description?: ReactNode;
        footer?: ReactNode;
      }) {
        const step = steps[targetStep];
        const stepDescription =
          'description' in step && typeof step.description === 'string'
            ? step.description
            : undefined;

        return (
          <div className='flex flex-col gap-y-4'>
            <div className='flex flex-col gap-y-2'>
              <h1 className='font-bold text-xl'>{title || step.title}</h1>
              {(description || stepDescription) && (
                <p>{description || stepDescription}</p>
              )}
            </div>
            <form id={targetStep} {...props} />
            {footer}
          </div>
        );
      };
    },
  })
  .withContext();

export const {
  useCanRestartForm,
  useMultiStepFormData,
  useProgress,
  useCurrentStepData,
} = schema.context;

export type StepNumber = keyof MultiStepFormSchema.resolvedStep<typeof schema>;
