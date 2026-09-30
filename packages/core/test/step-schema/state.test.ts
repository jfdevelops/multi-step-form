import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { defineMultiStepForm } from '../../src';

function createAppointmentForm() {
  return defineMultiStepForm({
    steps: {
      step1: {
        title: 'Appointment',
        fields: {
          serviceId: { defaultValue: null as string | null },
          date: { defaultValue: '' },
        },
        state: {
          availableTimes: {
            select: 'date',
            value: (date) => (date ? [`${date}:09:00`] : []),
          },
          summary: {
            value: (fields) => `${fields.serviceId ?? 'none'}:${fields.date ?? 'none'}`,
          },
          selectedTime: {
            select: 'date',
            value: '',
          },
          isCalendarOpen: {
            value: false,
          },
        },
      },
      step2: {
        title: 'Contact',
        fields: {
          email: { defaultValue: '' },
        },
      },
    },
  }).configure()();
}

describe('multi step form step schema: state', () => {
  it('resolves literal and field-derived state values', () => {
    const schema = createAppointmentForm();
    const { state } = schema.stepSchema.value.step1;

    expect(state.availableTimes).toEqual({
      select: 'date',
      value: [],
    });
    expect(state.summary.value).toBe('none:');
    expect(state.selectedTime.value).toBe('');
    expect(state.isCalendarOpen.value).toBe(false);

    // @ts-expect-error A step without configured state does not expose it.
    expect(schema.stepSchema.value.step2.state).toBeUndefined();
  });

  it('recomputes selected and all-fields resolvers after a field update', () => {
    const dateResolver = vi.fn((date: string) =>
      date ? [`${date}:09:00`] : [],
    );
    const form = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Appointment',
          fields: {
            serviceId: { defaultValue: 'haircut' },
            date: { defaultValue: '' },
          },
          state: {
            availableTimes: {
              select: 'date',
              value: dateResolver,
            },
            summary: {
              value: (fields) => `${fields.serviceId}:${fields.date ?? 'none'}`,
            },
          },
        },
      },
    }).configure()();

    form.stepSchema.value.step1.update({
      fields: ['fields.date.defaultValue'],
      updater: '2026-10-01',
    });

    expect(form.stepSchema.value.step1.state.availableTimes.value).toEqual([
      '2026-10-01:09:00',
    ]);
    expect(form.stepSchema.value.step1.state.summary.value).toBe(
      'haircut:2026-10-01',
    );
    expect(dateResolver).toHaveBeenLastCalledWith('2026-10-01');
  });

  it('resets a selected literal when its dependency changes', () => {
    const schema = createAppointmentForm();

    schema.stepSchema.value.step1.update({
      fields: ['state.selectedTime.value'],
      updater: '09:00',
    });
    schema.stepSchema.value.step1.update({
      fields: ['state.isCalendarOpen.value'],
      updater: true,
    });

    expect(schema.stepSchema.value.step1.state.selectedTime.value).toBe(
      '09:00',
    );

    schema.stepSchema.value.step1.update({
      fields: ['fields.date.defaultValue'],
      updater: '2026-10-01',
    });

    expect(schema.stepSchema.value.step1.state.selectedTime.value).toBe('');
    expect(schema.stepSchema.value.step1.state.isCalendarOpen.value).toBe(true);
  });

  it('resets state to its configured behavior', () => {
    const schema = createAppointmentForm();

    schema.stepSchema.value.step1.update({
      fields: ['fields.date.defaultValue'],
      updater: '2026-10-01',
    });
    schema.stepSchema.value.step1.update({
      fields: ['state.selectedTime.value'],
      updater: '09:00',
    });

    schema.stepSchema.value.step1.reset();

    expect(
      schema.stepSchema.value.step1.fields.date.defaultValue,
    ).toBe('');
    expect(
      schema.stepSchema.value.step1.state.availableTimes.value,
    ).toEqual([]);
    expect(schema.stepSchema.value.step1.state.selectedTime.value).toBe('');
  });

  it('widens mutable array and object state', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Preferences',
          fields: {
            name: { defaultValue: '' },
          },
          state: {
            tags: { value: ['initial'] },
            preferences: {
              value: {
                mode: 'compact',
                nested: { enabled: false },
              },
            },
            empty: { value: [] },
          },
        },
      },
    }).configure()();
    const { state } = schema.stepSchema.value.step1;

    expectTypeOf(state.tags.value).toEqualTypeOf<string[]>();
    expectTypeOf(state.preferences.value).toEqualTypeOf<{
      mode: string;
      nested: { enabled: boolean };
    }>();
    expectTypeOf(state.empty.value).toEqualTypeOf<unknown[]>();

    schema.stepSchema.value.step1.update({
      fields: ['state.tags.value'],
      updater: ['updated'],
    });
    schema.stepSchema.value.step1.update({
      fields: ['state.preferences.value'],
      updater: {
        mode: 'expanded',
        nested: { enabled: true },
      },
    });

    expect(schema.stepSchema.value.step1.state.tags.value).toEqual([
      'updated',
    ]);
    expect(schema.stepSchema.value.step1.state.preferences.value).toEqual({
      mode: 'expanded',
      nested: { enabled: true },
    });
  });
});
