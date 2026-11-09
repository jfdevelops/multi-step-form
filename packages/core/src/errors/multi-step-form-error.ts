import { createError } from '@jfdevelops/create-error';
import { type } from 'arktype';

function makeJsonSafe(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map(makeJsonSafe);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        makeJsonSafe(nestedValue),
      ]),
    );
  }

  return value;
}

/**
 * Creates a multi-step-form error class. The definition's `scope` is added to the context, so
 * constructors take the context without it.
 *
 * ```ts
 * class InvalidFieldError extends createMultiStepFormError({ code: 'invalidField', scope: 'field' })
 *   .defineContext(type({ scope: "'field'", reason: 'string' }))
 *   .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
 *
 * new InvalidFieldError({ reason: 'The field is missing' });
 * ```
 */
export const createMultiStepFormError = createError({
  definition: type({ code: 'string', scope: 'string' }),
  data: {
    property: 'context',
    resolve: ({ definition, input }) =>
      typeof input === 'object' && input !== null
        ? { ...input, scope: definition.scope }
        : input,
  },
  message: ({ definition, data, implementation }) =>
    implementation({ context: data, scope: definition.scope }),
  properties: ({ definition, data, implementation }) => ({
    code: definition.code,
    scope: definition.scope,
    /** Renders the message again, with this error's renderer or another one. */
    renderMessage(
      renderer: (
        scope: typeof definition.scope,
        context: typeof data,
      ) => string = (scope, context) => implementation({ context, scope }),
    ) {
      return renderer(definition.scope, data);
    },
  }),
  toJSON: (error) => ({
    name: error.name,
    code: error.code,
    scope: error.scope,
    message: error.message,
    context: makeJsonSafe(error.context),
  }),
});

/** Base class of every multi-step-form error. */
export const MultiStepFormError = createMultiStepFormError.Error;
