import { createMultiStepFormError } from '@jfdevelops/multi-step-form-core';
import { importBindingScope } from './schema.js';

const importBindingContext = importBindingScope.type({
  scope: "'importBinding'",
  /** The binding kind that was given. Any value, since an unknown kind is what this error reports. */
  kind: 'unknown',
  /** The name the module was to be bound to. */
  name: 'string',
  validKinds: 'kind[]',
});

export type InvalidImportBindingContext = typeof importBindingContext.infer;

/** Thrown when generated code is asked to import a module with an unknown binding kind. */
export class InvalidImportBindingError extends createMultiStepFormError({
  code: 'invalidImportBinding',
  scope: 'importBinding',
})
  .defineContext(importBindingContext)
  .implement(({ context, scope }) => {
    const validKinds = new Intl.ListFormat('en', {
      style: 'long',
      type: 'disjunction',
    }).format(context.validKinds.map((kind) => `"${kind}"`));

    return `[${scope}]: Cannot import "${context.name}" with binding kind ${JSON.stringify(
      context.kind,
    )}. Use ${validKinds}.`;
  }) {}
