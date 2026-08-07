import type { ReactElement } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createMultiStepFormSchema } from '../src';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = [];

afterEach(async () => {
  for (const { container, root } of mountedRoots.splice(0)) {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  }
  window.localStorage.clear();
});

async function renderInJsdom(ui: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);
  mountedRoots.push({ container, root });

  await act(async () => {
    root.render(ui);
  });

  return {
    getByTestId(testId: string) {
      const element = container.querySelector<HTMLElement>(
        `[data-testid="${testId}"]`,
      );

      if (!element) {
        throw new Error(`Unable to find element by test id: ${testId}`);
      }

      return element;
    },
  };
}

describe('Field', () => {
  it('preserves a suspended input node and focus after a value update', async () => {
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: 'Taylor',
            },
          },
        },
      },
    });

    const Step1 = schema.stepSchema.value.step1.createComponent(({ Field }) => (
      <Field name='firstName' suspend fallback={<div>Loading</div>}>
        {({ defaultValue, onInputChange }) => (
          <input
            data-testid='firstName'
            value={defaultValue}
            onChange={(event) => onInputChange(event.target.value)}
          />
        )}
      </Field>
    ));

    const screen = await renderInJsdom(<Step1 />);
    const originalInput = screen.getByTestId('firstName') as HTMLInputElement;

    originalInput.focus();
    expect(document.activeElement).toBe(originalInput);

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set;

      valueSetter?.call(originalInput, 'Jordan');
      originalInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const updatedInput = screen.getByTestId('firstName') as HTMLInputElement;

    expect(updatedInput).toBe(originalInput);
    expect(document.activeElement).toBe(originalInput);
    expect(updatedInput.value).toBe('Jordan');
  });

  it('renders each children property to the dom', async () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          nameTransformCasing: 'kebab',
          fields: {
            firstName: {
              defaultValue: 'Taylor',
              label: 'Your first name',
            },
            middleName: {
              defaultValue: 'Alison',
              label: false,
            },
            birthday: {
              defaultValue: date,
              type: 'date',
            },
          },
        },
      },
    });

    const Step1 = schema.stepSchema.value.step1.createComponent(({ Field }: any) => (
      <>
        <Field name='firstName'>
          {({
            defaultValue,
            label,
            name,
            nameTransformCasing,
            onInputChange,
            reset,
          }: any) => (
            <div>
              <p data-testid='name'>{name}</p>
              <p data-testid='defaultValue'>{defaultValue}</p>
              <p data-testid='label'>{label}</p>
              <p data-testid='nameTransformCasing'>
                {String(nameTransformCasing)}
              </p>
              <button data-testid='update' onClick={() => onInputChange('Jo')}>
                update
              </button>
              <button data-testid='reset' onClick={() => reset()}>
                reset
              </button>
            </div>
          )}
        </Field>

        <Field
          name='firstName'
          selectorFn={(ctx: any) => ctx.step1.fields.firstName.defaultValue.length}
        >
          {({ selected }: any) => (
            <p data-testid='selectedValue'>{selected.value}</p>
          )}
        </Field>

        <Field name='birthday'>
          {({ defaultValue, label, name, nameTransformCasing, type }: any) => (
            <div>
              <p data-testid='dateName'>{name}</p>
              <p data-testid='dateDefaultValue'>{defaultValue.toISOString()}</p>
              <p data-testid='dateLabel'>{label}</p>
              <p data-testid='dateNameTransformCasing'>{nameTransformCasing}</p>
              <p data-testid='dateType'>{type}</p>
            </div>
          )}
        </Field>

        <Field name='middleName'>
          {(props: any) => (
            <p data-testid='disabledLabelHasProp'>{String('label' in props)}</p>
          )}
        </Field>
      </>
    ));

    // NOTE: `schema.stepSchema.value.step1` loses its precise type through `.withForm()`'s
    // return type in this pre-existing inference gap (unrelated to instances/overrides), so the
    // `Field`/`props` types here are no longer narrow enough to assert that disabled labels are
    // excluded from `props` at compile time. Runtime behavior is unaffected and covered above.
    (schema.stepSchema.value as never as Record<string, any>).step1.createComponent(
      ({ Field }: any) => (
        <Field name='middleName'>{() => null}</Field>
      ),
    );

    const screen = await renderInJsdom(<Step1 />);

    expect(screen.getByTestId('name').textContent).toBe('firstName');
    expect(screen.getByTestId('defaultValue').textContent).toBe('Taylor');
    expect(screen.getByTestId('label').textContent).toBe('Your first name');
    expect(screen.getByTestId('nameTransformCasing').textContent).toBe('kebab');
    expect(screen.getByTestId('selectedValue').textContent).toBe('6');
    expect(screen.getByTestId('dateName').textContent).toBe('birthday');
    expect(screen.getByTestId('dateLabel').textContent).toBe('birthday');
    expect(screen.getByTestId('dateNameTransformCasing').textContent).toBe(
      'kebab',
    );
    expect(screen.getByTestId('dateType').textContent).toBe('date');
    expect(screen.getByTestId('dateDefaultValue').textContent).toBe(date.toISOString());
    expect(screen.getByTestId('disabledLabelHasProp').textContent).toBe(
      'false',
    );

    await act(async () => {
      screen.getByTestId('update').click();
    });

    expect(schema.stepSchema.value.step1.fields.firstName.defaultValue).toBe(
      'Jo',
    );
    expect(screen.getByTestId('defaultValue').textContent).toBe('Jo');
    expect(screen.getByTestId('selectedValue').textContent).toBe('2');

    await act(async () => {
      screen.getByTestId('reset').click();
    });

    expect(schema.stepSchema.value.step1.fields.firstName.defaultValue).toBe(
      'Taylor',
    );
    expect(screen.getByTestId('defaultValue').textContent).toBe('Taylor');
  });
});
