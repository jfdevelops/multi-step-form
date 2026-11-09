import type { AnyConfig, StepDefaultValues } from './steps/steps.js';
import type { FieldConfig } from './steps/fields.js';
import type { CasingType } from './utils/index.js';

/** Defines a reusable step without assigning its position in a form. */
export function defineStandaloneStep<
  const TFields extends FieldConfig<CasingType>,
  const TStep extends AnyConfig,
>(
  options: TStep & {
    fields: TFields;
    isComplete?: (values: StepDefaultValues<TFields>) => boolean;
  },
): TStep {
  return options;
}
