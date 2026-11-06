import { createFormBuilder, createRegistry } from '@jfdevelops/multi-step-form-builder-core';
import { arktypeAdapter } from '@jfdevelops/multi-step-form-builder-arktype';
import { effectAdapter } from '@jfdevelops/multi-step-form-builder-effect';
import { joiAdapter } from '@jfdevelops/multi-step-form-builder-joi';
import { valibotAdapter } from '@jfdevelops/multi-step-form-builder-valibot';
import { yupAdapter } from '@jfdevelops/multi-step-form-builder-yup';
import { zodAdapter } from '@jfdevelops/multi-step-form-builder-zod';

/** The built-in field types, and every Standard Schema library to pick from. */
export const registry = createRegistry({
  validators: [zodAdapter, valibotAdapter, arktypeAdapter, effectAdapter, yupAdapter, joiAdapter],
});

/** A booking form that shows off nested values, choices, dates and validation. */
export function createSampleDefinition() {
  const builder = createFormBuilder({ registry });
  const first = builder.getSnapshot().definition.steps[0]!.id;

  builder.settings.update({ validator: 'zod', nameTransformCasing: 'title' });
  builder.steps.update(first, { title: 'Your information', description: 'How can we contact you about this booking?' });
  builder.fields.add('text', { stepId: first }, { key: 'firstName', isRequired: true });
  builder.fields.add('text', { stepId: first }, { key: 'lastName', isRequired: true });
  builder.fields.add('string.email', { stepId: first }, { key: 'email', isRequired: true, placeholder: 'you@example.com' });
  builder.fields.add('string.tel', { stepId: first }, { key: 'phoneNumber' });

  builder.steps.add({
    title: 'Booking details',
    description: 'Who is getting makeup and what services do they want?',
    fields: [
      {
        type: 'string.radio',
        key: 'location',
        isRequired: true,
        props: {
          options: [
            { value: 'come_to_me', label: 'Come to me' },
            { value: 'i_come_to_you', label: 'I come to you' },
          ],
        },
      },
      {
        type: 'object',
        key: 'faces',
        label: 'People',
        description: 'Everyone getting makeup done',
        schema: {
          kind: 'object',
          properties: [
            { key: 'min', schema: { kind: 'number', checks: [{ check: 'min', value: 1 }] } },
            { key: 'max', schema: { kind: 'number', checks: [{ check: 'max', value: 10 }] } },
            {
              key: 'faces',
              schema: {
                kind: 'array',
                checks: [{ check: 'minLength', value: 1, message: 'Add at least one person' }],
                item: {
                  kind: 'object',
                  properties: [
                    { key: 'id', schema: { kind: 'string' } },
                    { key: 'name', schema: { kind: 'string', checks: [{ check: 'minLength', value: 1 }] } },
                  ],
                },
              },
            },
          ],
        },
        defaultValue: { min: 1, max: 10, faces: [{ id: 'face1', name: 'Face 1' }] },
      },
    ],
  });

  builder.steps.add({
    title: 'Date & time',
    description: 'Choose a start time that works for everyone.',
    fields: [
      { type: 'date', key: 'date', isRequired: true, schema: { kind: 'date', checks: [{ check: 'min', value: '2026-01-01' }] } },
      { type: 'text', key: 'time', isRequired: true, placeholder: '9:00 AM' },
      { type: 'string.textarea', key: 'notes' },
    ],
  });

  builder.steps.setActive(first);

  return builder.toJSON();
}
