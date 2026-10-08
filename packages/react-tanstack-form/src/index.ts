import type {
  FormLibraryAdapter,
  FormLibraryBoundaryProps,
  FormLibraryValues,
} from '@jfdevelops/react-multi-step-form';
import {
  type FormOptions,
  type ReactFormExtendedApi,
  useForm,
} from '@tanstack/react-form';
import { useEffect, useRef } from 'react';

export * from '@tanstack/react-form';

export type TanStackFormApi<values extends FormLibraryValues> =
  ReactFormExtendedApi<
    values,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    never
  >;

type NativeTanStackFormOptions = Omit<
  FormOptions<
    FormLibraryValues,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    never
  >,
  'defaultValues' | 'validators'
>;

type ValidatorSlot =
  | 'onMount'
  | 'onChange'
  | 'onChangeAsync'
  | 'onBlur'
  | 'onBlurAsync'
  | 'onSubmit'
  | 'onSubmitAsync'
  | 'onDynamic'
  | 'onDynamicAsync'
  | 'onServer';

export type TanStackFormOptions = NativeTanStackFormOptions & {
  validators?: Partial<Record<ValidatorSlot, unknown>>;
};

export interface TanStackFormAdapterContext {
  defaultValues: FormLibraryValues;
  /** The validator declared by the current multi-step-form step. */
  validation: unknown;
}

export interface TanStackFormAdapterOptions {
  /**
   * Maps the current step into native TanStack Form options. This runs when the
   * integration boundary renders, so validation timing remains application-defined.
   */
  formOptions?(
    context: TanStackFormAdapterContext,
  ): TanStackFormOptions | undefined;
}

export type TanStackFormAdapter = FormLibraryAdapter<'tanstack'>;

declare module '@jfdevelops/react-multi-step-form' {
  interface FormLibraryTypeRegistry<_values extends FormLibraryValues> {
    tanstack: { form: TanStackFormApi<_values> };
  }
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (
    typeof left !== 'object' ||
    left === null ||
    typeof right !== 'object' ||
    right === null
  ) {
    return false;
  }

  if (left instanceof Date || right instanceof Date) {
    return (
      left instanceof Date &&
      right instanceof Date &&
      Object.is(left.getTime(), right.getTime())
    );
  }

  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);

  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(([key, value]) =>
      valuesEqual(value, (right as Record<string, unknown>)[key]),
    )
  );
}

/** Creates the schema-level adapter used by `defineMultiStepForm().configure()`. */
export function tanstackForm(
  options: TanStackFormAdapterOptions = {},
): TanStackFormAdapter {
  function TanStackFormBoundary({
    binding,
    children,
  }: FormLibraryBoundaryProps) {
    const applyingExternalValue = useRef(false);
    const defaultValues = binding.getValues();
    const configuredOptions = options.formOptions?.({
      defaultValues,
      validation: binding.validation,
    });
    const form = useForm({
      ...configuredOptions,
      defaultValues,
    } as unknown as FormOptions<
      FormLibraryValues,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      never
    >);

    useEffect(
      () =>
        binding.subscribe(() => {
          const values = binding.getValues();

          if (valuesEqual(form.state.values, values)) {
            return;
          }

          applyingExternalValue.current = true;
          form.reset(values);
          applyingExternalValue.current = false;
        }),
      [binding, form],
    );

    useEffect(() => {
      const subscription = form.store.subscribe((state) => {
        if (
          applyingExternalValue.current ||
          valuesEqual(binding.getValues(), state.values)
        ) {
          return;
        }

        binding.setValues(state.values);
      });

      return () => subscription.unsubscribe();
    }, [binding, form]);

    return children({ form });
  }

  return {
    name: 'tanstack',
    Boundary: TanStackFormBoundary,
  };
}
