import {
  CHECKS_BY_VALUE_TYPE,
  isValidKey,
  type FormDefinition,
} from './definition.js';
import type { FormRegistry } from './registry.js';
import { resolveStepSpec } from './validation.js';

export type DefinitionIssueCode =
  | 'no-steps'
  | 'empty-step-title'
  | 'invalid-field-key'
  | 'duplicate-field-key'
  | 'unknown-field-type'
  | 'unknown-validator'
  | 'unsupported-check'
  | 'incompatible-check'
  | 'dangling-field-reference'
  | 'orphaned-field-rules';

export interface DefinitionIssue {
  code: DefinitionIssueCode;
  /** `error` issues stop a definition from compiling correctly; `warning`s don't. */
  severity: 'error' | 'warning';
  message: string;
  /** The step or field the issue belongs to. */
  nodeId: string;
  /** The property the issue is about, e.g. `key` or `validation`. */
  path?: string;
}

/** Checks a definition for problems the builder should surface to authors. */
export function validateDefinition(
  definition: FormDefinition,
  registry: FormRegistry,
): DefinitionIssue[] {
  const issues: DefinitionIssue[] = [];

  if (definition.steps.length === 0) {
    issues.push({
      code: 'no-steps',
      severity: 'error',
      message: 'The form needs at least one step',
      nodeId: definition.id,
    });
  }

  for (const step of definition.steps) {
    if (!step.title.trim()) {
      issues.push({
        code: 'empty-step-title',
        severity: 'warning',
        message: 'The step has no title',
        nodeId: step.id,
        path: 'title',
      });
    }

    const fieldKeys = new Set<string>();

    for (const field of step.fields) {
      if (!isValidKey(field.key)) {
        issues.push({
          code: 'invalid-field-key',
          severity: 'error',
          message: `"${field.key}" is not a valid key. Use letters, numbers, _ or $, not starting with a number.`,
          nodeId: field.id,
          path: 'key',
        });
      }

      if (fieldKeys.has(field.key)) {
        issues.push({
          code: 'duplicate-field-key',
          severity: 'error',
          message: `Another field in "${step.title}" already uses the key "${field.key}"`,
          nodeId: field.id,
          path: 'key',
        });
      }

      fieldKeys.add(field.key);

      if (!registry.getFieldType(field.type)) {
        issues.push({
          code: 'unknown-field-type',
          severity: 'error',
          message: `Unknown field type "${field.type}"`,
          nodeId: field.id,
          path: 'type',
        });
      }
    }

    const validation = step.validation;

    if (validation?.kind !== 'schema') {
      continue;
    }

    const adapter = registry.getValidator(validation.library);

    if (!adapter) {
      issues.push({
        code: 'unknown-validator',
        severity: 'error',
        message: `No validator adapter is registered for "${validation.library}"`,
        nodeId: step.id,
        path: 'validation',
      });
    }

    for (const key of Object.keys(validation.fields)) {
      if (!fieldKeys.has(key)) {
        issues.push({
          code: 'orphaned-field-rules',
          severity: 'warning',
          message: `Validation rules exist for "${key}", which is not a field in this step`,
          nodeId: step.id,
          path: `validation.fields.${key}`,
        });
      }
    }

    const spec = resolveStepSpec(step, registry) ?? {};

    for (const field of step.fields) {
      const fieldSpec = spec[field.key];

      if (!fieldSpec) continue;

      const allowed = CHECKS_BY_VALUE_TYPE[fieldSpec.type];

      for (const check of fieldSpec.checks ?? []) {
        if (!allowed.includes(check.check)) {
          issues.push({
            code: 'incompatible-check',
            severity: 'error',
            message: `"${check.check}" can't be used on a ${fieldSpec.type} field`,
            nodeId: field.id,
            path: `validation.fields.${field.key}`,
          });
        }

        if (check.check === 'equalsField' && !fieldKeys.has(check.field)) {
          issues.push({
            code: 'dangling-field-reference',
            severity: 'error',
            message: `"${field.key}" must match "${check.field}", which is not a field in this step`,
            nodeId: field.id,
            path: `validation.fields.${field.key}`,
          });
        }
      }

      const supported = adapter?.supports(fieldSpec);

      if (typeof supported === 'string') {
        issues.push({
          code: 'unsupported-check',
          severity: 'error',
          message: `${adapter!.label}: ${supported}`,
          nodeId: field.id,
          path: `validation.fields.${field.key}`,
        });
      }
    }
  }

  return issues;
}
