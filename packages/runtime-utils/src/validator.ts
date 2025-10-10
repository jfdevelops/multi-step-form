export interface StandardSchemaValidator<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

export declare namespace StandardSchemaV1 {
  /** The Standard Schema properties interface. */
  export interface Props<Input = unknown, Output = Input> {
    /** The version number of the standard. */
    readonly version: 1;
    /** The vendor name of the schema library. */
    readonly vendor: string;
    /** Validates unknown input values. */
    readonly validate: (
      value: unknown
    ) => Result<Output> | Promise<Result<Output>>;
    /** Inferred types associated with the schema. */
    readonly types?: Types<Input, Output> | undefined;
  }

  /** The result interface of the validate function. */
  export type Result<Output> = SuccessResult<Output> | FailureResult;

  /** The result interface if validation succeeds. */
  export interface SuccessResult<Output> {
    /** The typed output value. */
    readonly value: Output;
    /** The non-existent issues. */
    readonly issues?: undefined;
  }

  /** The result interface if validation fails. */
  export interface FailureResult {
    /** The issues of failed validation. */
    readonly issues: ReadonlyArray<Issue>;
  }

  /** The issue interface of the failure output. */
  export interface Issue {
    /** The error message of the issue. */
    readonly message: string;
    /** The path of the issue, if any. */
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }

  /** The path segment interface of the issue. */
  export interface PathSegment {
    /** The key representing a path segment. */
    readonly key: PropertyKey;
  }

  /** The Standard Schema types interface. */
  export interface Types<Input = unknown, Output = Input> {
    /** The input type of the schema. */
    readonly input: Input;
    /** The output type of the schema. */
    readonly output: Output;
  }

  /** Infers the input type of a Standard Schema. */
  export type InferInput<Schema extends StandardSchemaValidator> = NonNullable<
    Schema['~standard']['types']
  >['input'];

  /** Infers the output type of a Standard Schema. */
  export type InferOutput<Schema extends StandardSchemaValidator> = NonNullable<
    Schema['~standard']['types']
  >['output'];
}

// Types taken from Tanstack Router
export interface ValidatorAdapter<TInput, TOutput> {
  types: {
    input: TInput;
    output: TOutput;
  };
  parse: (input: unknown) => TOutput;
}
export interface ValidatorObj<TInput, TOutput> {
  parse: ValidatorFn<TInput, TOutput>;
}
export type ValidatorFn<Input, Output> = (input: Input) => Output;
export type Validator<Input, Output> =
  | ValidatorFn<Input, Output>
  | StandardSchemaValidator<Input, Output>;
export type AnySchema = {};
export type DefaultValidator = Validator<Record<string, unknown>, AnySchema>;
export type AnyStandardSchemaValidator = StandardSchemaValidator<any, any>;
export type AnyValidator = Validator<any, any>;
export type AnyValidatorObj = ValidatorObj<any, any>;
export type AnyValidatorAdapter = ValidatorAdapter<any, any>;
export type ResolveValidatorOutputFn<TValidator> = TValidator extends (
  ...args: any
) => infer TSchema
  ? TSchema
  : AnySchema;
export type ResolveValidatorOutput<TValidator> = unknown extends TValidator
  ? TValidator
  : TValidator extends AnyStandardSchemaValidator
  ? NonNullable<TValidator['~standard']['types']>['output']
  : TValidator extends AnyValidatorAdapter
  ? TValidator['types']['output']
  : TValidator extends AnyValidatorObj
  ? ResolveValidatorOutputFn<TValidator['parse']>
  : ResolveValidatorOutputFn<TValidator>;

export function runStandardValidation<Schema extends StandardSchemaValidator>(
  schema: Schema,
  input: StandardSchemaV1.InferInput<Schema>
): StandardSchemaV1.InferOutput<Schema> {
  const result = schema['~standard'].validate(input);

  if (result instanceof Promise) {
    throw new TypeError('Schema validation must be synchronous', {
      cause: schema,
    });
  }

  // if the `issues` field exists, the validation failed
  if (result.issues) {
    throw new Error(JSON.stringify(result.issues, null, 2));
  }

  return result.value;
}