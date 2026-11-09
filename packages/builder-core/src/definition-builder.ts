import {
  createFormBuilder,
  type AddFieldOptions,
  type FormBuilderOptions,
  type StepInput,
} from './builder.js';
import type { FormDefinition, FormSettings } from './definition.js';

export interface StepDefinitionBuilder {
  field(options: Omit<AddFieldOptions, 'stepId' | 'index'>): StepDefinitionBuilder;
}

export interface DefinitionBuilder {
  settings(settings: Partial<FormSettings>): DefinitionBuilder;
  step(input: StepInput, configure?: (step: StepDefinitionBuilder) => void): DefinitionBuilder;
  build(): FormDefinition;
}

/** Builds a definition fluently using the same field defaults and registry as the editor. */
export function createDefinitionBuilder(
  options: Pick<FormBuilderOptions, 'registry' | 'idGenerator'> = {},
): DefinitionBuilder {
  const builder = createFormBuilder(options);
  const initialStep = builder.getSnapshot().definition.steps[0]!.id;
  let hasSteps = false;
  const definitionBuilder: DefinitionBuilder = {
    settings(settings) {
      builder.settings.update(settings);

      return definitionBuilder;
    },
    step(input, configure) {
      const stepId = builder.steps.add(hasSteps ? input : { ...input, title: input.title ?? 'Step 1' });

      if (!hasSteps) {
        builder.steps.remove(initialStep);
        hasSteps = true;
      }

      const stepBuilder: StepDefinitionBuilder = {
        field(field) {
          builder.fields.add({ ...field, stepId });

          return stepBuilder;
        },
      };
      configure?.(stepBuilder);

      return definitionBuilder;
    },
    build() {
      return builder.toJSON();
    },
  };

  return definitionBuilder;
}
