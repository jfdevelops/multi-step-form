import {
  createDefinitionBuilder,
  createRegistry,
} from '@jfdevelops/multi-step-form-builder-core';
import { arktypeAdapter } from '@jfdevelops/multi-step-form-builder-arktype';
import { effectAdapter } from '@jfdevelops/multi-step-form-builder-effect';
import { joiAdapter } from '@jfdevelops/multi-step-form-builder-joi';
import { valibotAdapter } from '@jfdevelops/multi-step-form-builder-valibot';
import { yupAdapter } from '@jfdevelops/multi-step-form-builder-yup';
import { zodAdapter } from '@jfdevelops/multi-step-form-builder-zod';

/** The built-in field types, and every Standard Schema library to pick from. */
export const registry = createRegistry({
  validators: [
    zodAdapter,
    valibotAdapter,
    arktypeAdapter,
    effectAdapter,
    yupAdapter,
    joiAdapter,
  ],
});

/** A workshop proposal that shows off nested values, choices, dates and validation. */
export const sampleDefinition = createDefinitionBuilder({ registry })
  .settings({
    validator: 'zod',
    nameTransformCasing: 'title',
  })
  .step(
    {
      title: 'Organizer',
      description: 'Tell us who is leading the workshop.',
    },
    (step) => {
      step
        .field({ type: 'text', key: 'firstName', isRequired: true })
        .field({ type: 'text', key: 'lastName', isRequired: true })
        .field({
          type: 'string.email',
          key: 'email',
          isRequired: true,
          placeholder: 'you@example.com',
        })
        .field({
          type: 'text',
          key: 'organization',
          placeholder: 'Community lab or independent organizer',
        });
    },
  )
  .step(
    {
      title: 'Workshop plan',
      description: 'Choose a format and list the equipment your session needs.',
    },
    (step) => {
      step
        .field({
          type: 'string.radio',
          key: 'format',
          isRequired: true,
          props: {
            options: [
              { value: 'hands_on', label: 'Hands-on lab' },
              { value: 'demo', label: 'Live demonstration' },
            ],
          },
        })
        .field({
          type: 'object',
          key: 'equipment',
          label: 'Equipment request',
          description: 'Expected attendance and equipment to prepare',
          schema: {
            kind: 'object',
            properties: [
              {
                key: 'attendees',
                schema: {
                  kind: 'number',
                  checks: [{ check: 'min', value: 1 }],
                },
              },
              {
                key: 'durationMinutes',
                schema: {
                  kind: 'number',
                  checks: [
                    { check: 'min', value: 15 },
                    { check: 'max', value: 180 },
                  ],
                },
              },
              {
                key: 'items',
                schema: {
                  kind: 'array',
                  checks: [
                    {
                      check: 'minLength',
                      value: 1,
                      message: 'Add at least one equipment item',
                    },
                  ],
                  item: {
                    kind: 'object',
                    properties: [
                      {
                        key: 'quantity',
                        schema: {
                          kind: 'number',
                          checks: [{ check: 'min', value: 1 }],
                        },
                      },
                      {
                        key: 'name',
                        schema: {
                          kind: 'string',
                          checks: [{ check: 'minLength', value: 1 }],
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
          defaultValue: {
            attendees: 12,
            durationMinutes: 60,
            items: [{ quantity: 1, name: 'Projector' }],
          },
        });
    },
  )
  .step(
    {
      title: 'Schedule',
      description: 'Suggest a workshop date and share any setup instructions.',
    },
    (step) => {
      step
        .field({
          type: 'date',
          key: 'preferredDate',
          isRequired: true,
          schema: {
            kind: 'date',
            checks: [{ check: 'min', value: '2026-01-01' }],
          },
        })
        .field({
          type: 'text',
          key: 'startTime',
          isRequired: true,
          placeholder: '9:00 AM',
        })
        .field({ type: 'string.textarea', key: 'setupNotes' });
    },
  )
  .build();
