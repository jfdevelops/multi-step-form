export type CreateMultiStepFormErrorOptions<
  code extends string = string,
  scope extends string = string,
> = {
  code: code;
  scope: scope;
};
export interface MultiStepFormErrorContext<scope extends string> extends Record<
  string,
  unknown
> {
  scope: scope;
}

export type ErrorMessageRenderer<
  scope extends string,
  context extends MultiStepFormErrorContext<scope>,
> = (scope: scope, context: context) => string;

export interface CreatedMultiStepFormError<
  code extends string,
  scope extends string,
  baseContext extends MultiStepFormErrorContext<scope>,
> {
  new (
    context: Omit<baseContext, 'scope'>,
  ): MultiStepFormError<code, scope, baseContext> & {
    readonly code: code;
    readonly scope: scope;
    renderMessage(renderer?: ErrorMessageRenderer<scope, baseContext>): string;
  };
}

export interface MultiStepFormErrorRendererFactory<
  code extends string,
  scope extends string,
> {
  <context extends MultiStepFormErrorContext<scope>>(
    defaultRenderer: ErrorMessageRenderer<scope, context>,
  ): CreatedMultiStepFormError<code, scope, context>;
}

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

/** Base data class for errors created by multi-step-form. */
export abstract class MultiStepFormError<
  code extends string = string,
  scope extends string = string,
  context extends MultiStepFormErrorContext<scope> =
    MultiStepFormErrorContext<scope>,
> extends Error {
  abstract readonly code: code;
  readonly scope: scope;
  readonly context: context;

  constructor(context: context) {
    super();
    this.name = new.target.name;
    this.scope = context.scope;
    this.context = context;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  abstract renderMessage(
    renderer?: ErrorMessageRenderer<scope, context>,
  ): string;

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      scope: this.scope,
      message: this.message,
      context: makeJsonSafe(this.context),
    };
  }
}

/** Creates a context-only error class with a code and default renderer. */
export function createMultiStepFormError<
  const options extends CreateMultiStepFormErrorOptions,
>(
  options: options,
): MultiStepFormErrorRendererFactory<options['code'], options['scope']> {
  return function createErrorWithRenderer<
    context extends MultiStepFormErrorContext<options['scope']>,
  >(
    defaultRenderer: ErrorMessageRenderer<options['scope'], context>,
  ) {
    return class MultiStepFormErrorWithCode extends MultiStepFormError<
      options['code'],
      options['scope'],
      context
    > {
      readonly code = options['code'];

      constructor(context: Omit<context, 'scope'>) {
        const resolvedContext = {
          ...context,
          scope: options.scope,
        } as context;

        super(resolvedContext);
        this.message = this.renderMessage();
      }

      renderMessage(
        renderer?: ErrorMessageRenderer<options['scope'], context>,
      ) {
        return (renderer ?? defaultRenderer)(this.scope, this.context);
      }
    };
  };
}
