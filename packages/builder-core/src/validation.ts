import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  getValueTypeFromFieldType,
  type FieldDefinition,
  type FieldSchemaSpec,
  type StepDefinition,
} from './definition.js';
import { FormBuilderError } from './errors.js';
import type { FormRegistry } from './registry.js';
import type {
  EmittedValidator,
  ResolvedStepSpec,
  StepValues,
} from './validators/types.js';

/** The rules a field starts with when its step gets a validator. */
export function inferFieldSpec(
  field: FieldDefinition,
  registry: FormRegistry,
): FieldSchemaSpec {
  const fieldType = registry.getFieldType(field.type);
  const checks = fieldType?.inferChecks?.(field) ?? [];

  return {
    type: fieldType?.valueType ?? getValueTypeFromFieldType(field.type),
    ...(checks.length > 0 ? { checks } : {}),
  };
}

/**
 * Resolves the rules for every field in a step: explicit rules from `validation.fields`, else
 * inferred rules, with `optional` resolved from `isRequired`.
 *
 * Returns `undefined` when the step has no builder-managed validation (`undefined` or `code`).
 */
export function resolveStepSpec(
  step: StepDefinition,
  registry: FormRegistry,
): ResolvedStepSpec | undefined {
  const validation = step.validation;

  if (!validation || validation.kind === 'code') {
    return undefined;
  }

  const spec: ResolvedStepSpec = {};

  for (const field of step.fields) {
    if (validation.kind === 'required') {
      spec[field.key] = { type: 'unknown', optional: !field.isRequired };
      continue;
    }

    const fieldSpec = validation.fields[field.key] ?? inferFieldSpec(field, registry);
    spec[field.key] = {
      ...fieldSpec,
      optional: fieldSpec.optional ?? !field.isRequired,
    };
  }

  return spec;
}

function requireAdapter(step: StepDefinition, registry: FormRegistry, operation: string) {
  const library =
    step.validation?.kind === 'schema' ? step.validation.library : 'builtin';
  const adapter = registry.getValidator(library);

  if (!adapter) {
    throw new FormBuilderError({
      operation,
      reason: `Step "${step.title}" uses the "${library}" validator, but no adapter is registered for it. Pass it to createRegistry({ validators }).`,
      target: library,
    });
  }

  return adapter;
}

/** Compiles a step's validation into a Standard Schema validator, if it has builder-managed validation. */
export function compileStepValidator(
  step: StepDefinition,
  registry: FormRegistry,
): StandardSchemaV1<StepValues, StepValues> | undefined {
  const spec = resolveStepSpec(step, registry);

  return spec
    ? requireAdapter(step, registry, 'compileStepValidator').compile(spec)
    : undefined;
}

/** Writes source code for a step's validator, if it has builder-managed validation. */
export function emitStepValidator(
  step: StepDefinition,
  registry: FormRegistry,
): EmittedValidator | undefined {
  const spec = resolveStepSpec(step, registry);

  return spec
    ? requireAdapter(step, registry, 'emitStepValidator').emit(spec)
    : undefined;
}
