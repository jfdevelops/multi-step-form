import type { ComponentType, ReactNode } from 'react';

export type FormLibraryValues = Record<string, unknown>;

/** The state bridge an integration package receives for one rendered step. */
export interface FormLibraryBinding<
  values extends FormLibraryValues = FormLibraryValues,
> {
  readonly defaultValues: values;
  readonly validation: unknown;
  getValues(): values;
  setValues(values: values): void;
  subscribe(listener: () => void): () => void;
}

export interface FormLibraryBoundaryProps {
  binding: FormLibraryBinding;
  children(input: Record<string, unknown>): ReactNode;
}

/** Runtime contract implemented by optional form-library integration packages. */
export interface FormLibraryAdapter<name extends string = string> {
  readonly name: name;
  readonly Boundary: ComponentType<FormLibraryBoundaryProps>;
}

export type AnyFormLibraryAdapter = FormLibraryAdapter<string>;

/**
 * Integration packages augment this interface to add their typed render input.
 * The adapter name is the registry key.
 */
// biome-ignore lint/suspicious/noEmptyInterface: Integration packages augment this registry.
export interface FormLibraryTypeRegistry<_values extends FormLibraryValues> {}

export type ConfiguredFormLibrary<definition> = definition extends {
  readonly __formLibrary?: infer adapter extends AnyFormLibraryAdapter;
}
  ? adapter
  : never;

export type FormLibraryRenderInput<adapter, values extends FormLibraryValues> =
  adapter extends FormLibraryAdapter<infer name>
    ? name extends keyof FormLibraryTypeRegistry<values>
      ? FormLibraryTypeRegistry<values>[name]
      : Record<never, never>
    : Record<never, never>;
