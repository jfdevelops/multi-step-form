import { isCasingValid } from '@jfdevelops/multi-step-form-core';
import {
  isValidKey,
  resolveStepLibrary,
  type FormDefinition,
} from './definition.js';
import type { FormRegistry } from './registry.js';
import { matchesSchema, walkSchema, type SchemaPath } from './schema.js';

export type DefinitionIssueCode =
  | 'no-steps'
  | 'empty-step'
  | 'empty-step-title'
  | 'invalid-field-key'
  | 'duplicate-field-key'
  | 'unknown-field-type'
  | 'unknown-validator'
  | 'unsupported-schema'
  | 'invalid-property-key'
  | 'duplicate-property-key'
  | 'empty-choice'
  | 'dangling-field-reference'
  | 'default-value-mismatch'
  | 'invalid-casing'
  | 'invalid-instance-name';

export interface DefinitionIssue {
  code: DefinitionIssueCode;
  /** `error` issues stop a definition from compiling correctly; `warning`s don't. */
  severity: 'error' | 'warning';
  message: string;
  /** The form, step or field the issue belongs to. */
  nodeId: string;
  /** The property the issue is about, e.g. `key`, `defaultValue` or `schema`. */
  path?: string;
  /** For schema issues: where in the field's schema tree. */
  schemaPath?: SchemaPath;
}

function describePath(path: SchemaPath) {
  return path.length === 0 ? 'the value' : path.join('.').replace(/#item/g, '[]').replace(/#value/g, '{}');
}

/** Checks a definition for problems the builder should surface to authors. */
export function validateDefinition(
  definition: FormDefinition,
  registry: FormRegistry,
): DefinitionIssue[] {
  const issues: DefinitionIssue[] = [];
  const settings = definition.settings;

  if (definition.steps.length === 0) {
    issues.push({
      code: 'no-steps',
      severity: 'error',
      message: 'The form needs at least one step',
      nodeId: definition.id,
    });
  }

  if (settings?.nameTransformCasing && !isCasingValid(settings.nameTransformCasing)) {
    issues.push({
      code: 'invalid-casing',
      severity: 'error',
      message: `"${settings.nameTransformCasing}" is not a casing`,
      nodeId: definition.id,
      path: 'settings.nameTransformCasing',
    });
  }

  if (settings?.validator && !registry.getValidator(settings.validator)) {
    issues.push({
      code: 'unknown-validator',
      severity: 'error',
      message: `No validator adapter is registered for "${settings.validator}"`,
      nodeId: definition.id,
      path: 'settings.validator',
    });
  }

  for (const instance of settings?.instances ?? []) {
    if (!instance.trim()) {
      issues.push({
        code: 'invalid-instance-name',
        severity: 'error',
        message: 'Instance names can’t be empty',
        nodeId: definition.id,
        path: 'settings.instances',
      });
    }
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

    if (step.fields.length === 0) {
      issues.push({
        code: 'empty-step',
        severity: 'error',
        message: 'A step needs at least one field',
        nodeId: step.id,
        path: 'fields',
      });
    }

    const library = resolveStepLibrary(step, settings);
    const adapter = library ? registry.getValidator(library) : undefined;

    if (library && !adapter) {
      issues.push({
        code: 'unknown-validator',
        severity: 'error',
        message: `No validator adapter is registered for "${library}"`,
        nodeId: step.id,
        path: 'validation',
      });
    }

    const fieldKeys = new Set(step.fields.map((field) => field.key));
    const seen = new Set<string>();

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

      if (seen.has(field.key)) {
        issues.push({
          code: 'duplicate-field-key',
          severity: 'error',
          message: `Another field in "${step.title}" already uses the key "${field.key}"`,
          nodeId: field.id,
          path: 'key',
        });
      }

      seen.add(field.key);

      if (!registry.getFieldType(field.type)) {
        issues.push({
          code: 'unknown-field-type',
          severity: 'error',
          message: `Unknown field type "${field.type}"`,
          nodeId: field.id,
          path: 'type',
        });
      }

      if (field.nameTransformCasing && !isCasingValid(field.nameTransformCasing)) {
        issues.push({
          code: 'invalid-casing',
          severity: 'error',
          message: `"${field.nameTransformCasing}" is not a casing`,
          nodeId: field.id,
          path: 'nameTransformCasing',
        });
      }

      if (!matchesSchema({ ...field.schema, optional: false }, field.defaultValue) && !isEmptyStart(field)) {
        issues.push({
          code: 'default-value-mismatch',
          severity: 'warning',
          message: 'The default value doesn’t match the value type',
          nodeId: field.id,
          path: 'defaultValue',
        });
      }

      walkSchema(field.schema, (node, schemaPath) => {
        for (const check of node.checks ?? []) {
          if (check.check === 'equalsField') {
            if (schemaPath.length > 0) {
              issues.push({
                code: 'unsupported-schema',
                severity: 'error',
                message: '"Must match another field" only works on a field’s top-level value',
                nodeId: field.id,
                path: 'schema',
                schemaPath,
              });
            } else if (!fieldKeys.has(check.field) || check.field === field.key) {
              issues.push({
                code: 'dangling-field-reference',
                severity: 'error',
                message: `"${field.key}" must match "${check.field}", which is not another field in this step`,
                nodeId: field.id,
                path: 'schema',
                schemaPath,
              });
            }
          }
        }

        if (node.kind === 'object') {
          const keys = new Set<string>();

          for (const property of node.properties) {
            if (!property.key || property.key.startsWith('#')) {
              issues.push({
                code: 'invalid-property-key',
                severity: 'error',
                message: `"${property.key}" can’t be used as a property name`,
                nodeId: field.id,
                path: 'schema',
                schemaPath,
              });
            }

            if (keys.has(property.key)) {
              issues.push({
                code: 'duplicate-property-key',
                severity: 'error',
                message: `${describePath(schemaPath)} has two "${property.key}" properties`,
                nodeId: field.id,
                path: 'schema',
                schemaPath,
              });
            }

            keys.add(property.key);
          }
        }

        if ((node.kind === 'enum' && node.values.length === 0) || (node.kind === 'union' && node.options.length === 0)) {
          issues.push({
            code: 'empty-choice',
            severity: 'error',
            message: `${describePath(schemaPath)} has no allowed values`,
            nodeId: field.id,
            path: 'schema',
            schemaPath,
          });
        }

        const supported = adapter?.supports(node);

        if (typeof supported === 'string') {
          issues.push({
            code: 'unsupported-schema',
            severity: 'error',
            message: `${adapter!.label}: ${supported}`,
            nodeId: field.id,
            path: 'schema',
            schemaPath,
          });
        }
      });
    }
  }

  return issues;
}

/** Choice fields start with nothing selected (`''`), which isn't one of their values. */
function isEmptyStart(field: { defaultValue: unknown; schema: { kind: string } }) {
  return field.defaultValue === '' && (field.schema.kind === 'enum' || field.schema.kind === 'literal');
}
