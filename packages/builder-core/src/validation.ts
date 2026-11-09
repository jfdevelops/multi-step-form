import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  resolveStepLibrary,
  type FieldDefinition,
  type FormSettings,
  type StepDefinition,
} from './definition.js';
import { FormBuilderError } from './errors.js';
import type { FormRegistry } from './registry.js';
import type { SchemaCheck, SchemaNode } from './schema.js';
import { defaultCheckMessage } from './validators/checks.js';
import type {
  BuiltValidator,
  EqualsRefinement,
  ResolvedField,
  ResolvedStepSchema,
  StepValues,
  ValidatorAdapter,
} from './validators/types.js';

/**
 * A field's schema as its step's validator sees it: required text and lists must be non-empty,
 * optional fields accept "nothing entered", and `equalsField` checks become step refinements.
 */
export function resolveFieldSchema(field: FieldDefinition): {
  schema: SchemaNode;
  refinements: EqualsRefinement[];
} {
  const { optional: _optional, ...root } = field.schema;
  const refinements: EqualsRefinement[] = [];
  const checks: SchemaCheck[] = [];

  for (const check of root.checks ?? []) {
    if (check.check === 'equalsField') {
      refinements.push({
        field: field.key,
        equals: check.field,
        message: check.message ?? defaultCheckMessage(check, field.schema),
      });
    } else {
      checks.push(check);
    }
  }

  const schema = { ...root, checks } as SchemaNode;

  if (field.isRequired) {
    const message = field.errorMessage ?? 'Required';

    if (schema.kind === 'string' || schema.kind === 'array') {
      schema.checks = [{ check: 'minLength', value: 1, message }, ...checks];
    }

    schema.message ??= message;
  } else {
    schema.optional = true;
  }

  if (schema.checks?.length === 0) delete schema.checks;

  return { schema, refinements };
}

/**
 * Resolves what a step's validator checks. Returns `undefined` when the step has no
 * builder-managed validation (none, or code-owned).
 */
export function resolveStepSchema(
  step: StepDefinition,
  settings?: FormSettings,
): ResolvedStepSchema | undefined {
  if (resolveStepLibrary(step, settings) === undefined) return undefined;

  const fields: ResolvedField[] = [];
  const refinements: EqualsRefinement[] = [];

  for (const field of step.fields) {
    const resolved = resolveFieldSchema(field);
    fields.push({ key: field.key, schema: resolved.schema });
    refinements.push(...resolved.refinements);
  }

  return { fields, refinements };
}

function requireAdapter(
  library: string,
  step: StepDefinition,
  registry: FormRegistry,
  operation: string,
): ValidatorAdapter {
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

/** Builds a step's validator and its source code, if it has builder-managed validation. */
export function buildStepValidator(
  step: StepDefinition,
  registry: FormRegistry,
  settings?: FormSettings,
): (BuiltValidator & { library: string; supportsTypeInference: boolean }) | undefined {
  const library = resolveStepLibrary(step, settings);
  const spec = resolveStepSchema(step, settings);

  if (library === undefined || !spec) return undefined;

  const adapter = requireAdapter(library, step, registry, 'buildStepValidator');

  // The same spec object, so adapters made with createValidatorAdapter build once.
  return {
    validator: adapter.compile(spec),
    ...adapter.emit(spec),
    library,
    supportsTypeInference: adapter.supportsTypeInference ?? false,
  };
}

/** Compiles a step's validator, if it has builder-managed validation. */
export function compileStepValidator(
  step: StepDefinition,
  registry: FormRegistry,
  settings?: FormSettings,
): StandardSchemaV1<StepValues, StepValues> | undefined {
  const library = resolveStepLibrary(step, settings);
  const spec = resolveStepSchema(step, settings);

  if (library === undefined || !spec) return undefined;

  return requireAdapter(library, step, registry, 'compileStepValidator').compile(spec);
}
