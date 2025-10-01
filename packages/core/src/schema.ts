import { setCasingType, type CasingType } from './casing.js';
import {
  DEFAULT_CASING,
  MultiStepFormStepSchema,
  type DefaultCasing,
  type InferStepOptions,
  type MultiStepFormSchemaStepConfig,
  type NameTransformCasingOptions,
  type ResolvedStep,
  type Step,
  type StepNumbers,
} from './step-schema.ts';
import type { Constrain } from './utils.js';

export type MultiStepFormSchemaOptions<
  TStep extends Step<TCasing>,
  TCasing extends CasingType
> = MultiStepFormSchemaStepConfig<TStep, TCasing>;
export class MultiStepFormSchema<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends CasingType = DefaultCasing
> {
  readonly defaultNameTransformationCasing: casing;
  readonly stepSchema: MultiStepFormStepSchema<
    step,
    resolvedStep,
    stepNumbers,
    casing
  >;
  constructor(
    options: MultiStepFormSchemaOptions<
      step,
      // Allows full autocomplete
      Constrain<casing, CasingType>
    >
  ) {
    const { steps, nameTransformCasing } = options;

    this.defaultNameTransformationCasing = setCasingType(
      nameTransformCasing,
      DEFAULT_CASING
    ) as casing;
    this.stepSchema = new MultiStepFormStepSchema({
      steps,
      nameTransformCasing: this.defaultNameTransformationCasing,
    });
  }
}

const t = new MultiStepFormSchema({
  nameTransformCasing: 'flat',
  steps: {
    step1: {
      nameTransformCasing: 'kebab',
      fields: [
        {
          defaultValue: '',
          name: 'first' as const,
          nameTransformCasing: 'camel'
        },
      ],
      title: 'test',
    },
  },
});
t.stepSchema.value.step1.nameTransformCasing;
//                          ^?
