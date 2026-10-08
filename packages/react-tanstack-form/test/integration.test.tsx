import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { tanstackForm } from '../src';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = [];

afterEach(async () => {
  for (const { container, root } of mountedRoots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
});

async function renderInJsdom(ui: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ container, root });

  await act(async () => root.render(ui));

  return {
    getByTestId(testId: string) {
      const element = container.querySelector<HTMLElement>(
        `[data-testid="${testId}"]`,
      );

      if (!element) {
        throw new Error(`Unable to find ${testId}`);
      }

      return element;
    },
  };
}

describe('TanStack Form integration', () => {
  it('rejects form-library opt-in when no adapter is configured', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Contact',
          fields: { firstName: { defaultValue: '' } },
        },
      },
    }).configure();

    function createInvalidComponent() {
      createForm.createComponent({
        stepData: ['step1'],
        // @ts-expect-error An adapter is required before form-library opt-in.
        formLibrary: true,
        render: () => null,
      });
    }

    expectTypeOf(createInvalidComponent).toBeFunction();
  });

  it('keeps native and multi-step fields synchronized in both directions', async () => {
    const formOptions = vi.fn(({ validation }) => ({
      validators: validation ? { onChange: validation } : undefined,
    }));
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Contact',
          fields: {
            firstName: { defaultValue: '' as string },
          },
        },
      },
    }).configure({
      formLibrary: tanstackForm({ formOptions }),
    });
    const formSchema = createForm();

    const Contact = formSchema.stepSchema.value.step1.createComponent({
      render({ Field, Selector, form, validation }) {
        expectTypeOf(form.state.values.firstName).toEqualTypeOf<string>();

        return (
          <>
            <form.Field name="firstName">
              {(field) => (
                <input
                  data-testid="native"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </form.Field>
            <Field name="firstName">
              {({ onInputChange }) => (
                <button
                  data-testid="multi-step"
                  onClick={() => onInputChange('Grace')}
                >
                  Set from multi-step form
                </button>
              )}
            </Field>
            <Selector
              selector={(context) =>
                context.step1.fields.firstName.defaultValue
              }
            >
              {(value) => <output data-testid="multi-value">{value}</output>}
            </Selector>
            <form.Subscribe selector={(state) => state.values.firstName}>
              {(value) => <output data-testid="native-value">{value}</output>}
            </form.Subscribe>
            <output data-testid="validation">
              {validation === undefined ? 'none' : 'configured'}
            </output>
          </>
        );
      },
    });

    const screen = await renderInJsdom(<Contact />);
    const input = screen.getByTestId('native') as HTMLInputElement;

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set;
      valueSetter?.call(input, 'Ada');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(screen.getByTestId('multi-value').textContent).toBe('Ada');

    await act(async () => screen.getByTestId('multi-step').click());

    expect(screen.getByTestId('native-value').textContent).toBe('Grace');
    expect(formOptions).toHaveBeenCalledWith({
      defaultValues: { firstName: '' },
      validation: undefined,
    });
  });

  it('synchronizes Date values in both directions', async () => {
    const initialDate = new Date('2026-01-01T00:00:00.000Z');
    const nativeDate = new Date('2026-02-01T00:00:00.000Z');
    const multiStepDate = new Date('2026-03-01T00:00:00.000Z');
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Schedule',
          fields: { startsAt: { defaultValue: initialDate } },
        },
      },
    }).configure({ formLibrary: tanstackForm() });
    const formSchema = createForm();
    const Schedule = formSchema.stepSchema.value.step1.createComponent({
      render({ Field, Selector, form }) {
        return (
          <>
            <form.Field name="startsAt">
              {(field) => (
                <button
                  data-testid="native-date"
                  onClick={() => field.handleChange(nativeDate)}
                >
                  Set native date
                </button>
              )}
            </form.Field>
            <Field name="startsAt">
              {({ onInputChange }) => (
                <button
                  data-testid="multi-step-date"
                  onClick={() => onInputChange(multiStepDate)}
                >
                  Set multi-step date
                </button>
              )}
            </Field>
            <Selector
              selector={(context) =>
                context.step1.fields.startsAt.defaultValue
              }
            >
              {(value) => (
                <output data-testid="multi-date">{value.toISOString()}</output>
              )}
            </Selector>
            <form.Subscribe selector={(state) => state.values.startsAt}>
              {(value) => (
                <output data-testid="native-date-value">
                  {value.toISOString()}
                </output>
              )}
            </form.Subscribe>
          </>
        );
      },
    });
    const screen = await renderInJsdom(<Schedule />);

    await act(async () => screen.getByTestId('native-date').click());
    expect(screen.getByTestId('multi-date').textContent).toBe(
      nativeDate.toISOString(),
    );

    await act(async () => screen.getByTestId('multi-step-date').click());
    expect(screen.getByTestId('native-date-value').textContent).toBe(
      multiStepDate.toISOString(),
    );
  });

  it('does not create a native form when the component opts out', async () => {
    const formOptions = vi.fn(() => ({}));
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Contact',
          fields: { firstName: { defaultValue: '' } },
        },
      },
    }).configure({ formLibrary: tanstackForm({ formOptions }) });
    const formSchema = createForm();
    const Contact = formSchema.stepSchema.value.step1.createComponent({
      formLibrary: false,
      render({ defaultValues }) {
        return <p>{defaultValues.firstName}</p>;
      },
    });

    await renderInJsdom(<Contact />);

    expect(formOptions).not.toHaveBeenCalled();
  });

  it('supports opt-in through the instance createComponent function', async () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Contact',
          fields: { firstName: { defaultValue: '' as string } },
        },
      },
    }).configure({ formLibrary: tanstackForm() });
    const formSchema = createForm();
    const Contact = formSchema.createComponent({
      stepData: ['step1'],
      render({ form }) {
        return (
          <form.Subscribe selector={(state) => state.values.firstName}>
            {(value) => <output data-testid="value">{value || 'empty'}</output>}
          </form.Subscribe>
        );
      },
    });

    const screen = await renderInJsdom(<Contact />);

    expect(screen.getByTestId('value').textContent).toBe('empty');
  });
});
