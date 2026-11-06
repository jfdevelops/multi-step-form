import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { SchemaCheck, SchemaCheckName, SchemaKind, SchemaNode, SchemaNodeOf } from '../schema.js';
import { allowsEmptyString } from './checks.js';
import { createCodegen, type Codegen } from './codegen.js';
import { createExpr, printExpr, unwrapExpr } from './expr.js';
import type { EqualsRefinement, ResolvedStepSchema, StepValues } from './types.js';

/** One check by name. An intersection, since some variants cover several names (e.g. the lengths). */
export type CheckOf<K extends SchemaCheckName> = SchemaCheck & { check: K };

/** Per check: returns the schema with the check applied. Checks without a handler are skipped. */
export type ChainHandlers<S> = {
  [K in SchemaCheckName]?: (schema: S, check: CheckOf<K>, message: string) => S;
};

/** Per check: returns an item for the schema, e.g. a pipe action. Checks without a handler are skipped. */
export type ActionHandlers = {
  [K in SchemaCheckName]?: (check: CheckOf<K>, message: string) => unknown;
};

export type ActionOf<H> = {
  [K in keyof H]: H[K] extends (...args: never) => infer R ? R : never;
}[keyof H];

export interface SchemaBuilderContext<TLib> extends Codegen {
  /** Applies a node's checks to `schema` in order, for libraries that chain methods. */
  chain<S>(node: SchemaNode, schema: S, handlers: ChainHandlers<S>): S;
  /** Turns a node's checks into items, in order, for libraries that collect actions. */
  actions<H extends ActionHandlers>(node: SchemaNode, handlers: H): ActionOf<H>[];
  /** The library module. Calls on it run the library and record the same calls as source code. */
  lib: TLib;
  /**
   * Builds a child node with its modifiers, e.g. `z.array(ctx.field(node.item))`.
   *
   * Typed `never` on purpose: the child is one of this library's schemas, but that type can't be
   * inferred here. `ctx` is typed before the kind builders' return types are read, so a type
   * inferred from them is fixed (as `unknown`) first. `never` fits any schema parameter; methods
   * can't be called on it, so pass children to the library's functions instead.
   */
  field(node: SchemaNode): never;
  /** Whether the node's "nothing entered" value is `''`, which optional nodes must accept. */
  allowsEmptyString(node: SchemaNode): boolean;
  /** A `min`/`max` bound: a `Date` on date nodes, else a number. */
  bound(check: Extract<SchemaCheck, { check: 'min' | 'max' }>, node: SchemaNode): number | Date;
}

/** Kinds a library builds itself. Objects go through `object`. */
export type BuiltKind = Exclude<SchemaKind, 'object'>;

/** One function per kind: builds the node with its checks, without `nullable`/`optional`. */
export type SchemaKindBuilders<TLib> = {
  [K in BuiltKind]: (node: SchemaNodeOf<K>, ctx: SchemaBuilderContext<TLib>) => unknown;
};

/**
 * What a library's kind builders return. `never` in the library position accepts builders for
 * any library, since the context is a parameter.
 */
export type KindSchema<TKinds extends SchemaKindBuilders<never>> = ReturnType<TKinds[BuiltKind]>;

export interface ObjectEntry<TSchema> {
  key: string;
  /** The built property, including its modifiers. */
  schema: TSchema;
  optional: boolean;
}

export interface SchemaBuilderDefinition<
  TLib,
  TKinds extends SchemaKindBuilders<TLib>,
  TObject,
  TRefined,
> {
  /** The library module, e.g. `z` from `zod`. */
  module: TLib;
  /** How generated code refers to and imports the module. */
  import: ImportReference;
  kinds: TKinds;
  /**
   * Runs for every node after its kind builder and before `nullable`/`optional`, for work a
   * library does the same way for every kind, e.g. checks as predicates.
   */
  checks?(schema: KindSchema<TKinds>, node: SchemaNode, ctx: SchemaBuilderContext<TLib>): unknown;
  /** Builds an object (the step itself, and object nodes) from built properties. */
  object(entries: readonly ObjectEntry<KindSchema<TKinds>>[], ctx: SchemaBuilderContext<TLib>): TObject;
  /** Makes a schema accept `null`. */
  nullable(schema: KindSchema<TKinds>, node: SchemaNode, ctx: SchemaBuilderContext<TLib>): unknown;
  /** Makes a schema accept `undefined`, and `''` when `ctx.allowsEmptyString(node)`. */
  optional(schema: KindSchema<TKinds>, node: SchemaNode, ctx: SchemaBuilderContext<TLib>): unknown;
  /** Applies step refinements (one field must equal another), reporting on the refined field. */
  refine(schema: TObject, refinements: readonly EqualsRefinement[], ctx: SchemaBuilderContext<TLib>): TRefined;
  /** Returns the step schema as a synchronous Standard Schema. */
  standard(schema: TObject | TRefined, ctx: SchemaBuilderContext<TLib>): StandardSchemaV1;
}

export interface BuiltStepSchema {
  schema: StandardSchemaV1<StepValues, StepValues>;
  imports: string[];
  declarations: string[];
  code: string;
}

/** How a module is bound in an import statement. */
const IMPORT_BINDINGS = {
  named: (name: string) => `{ ${name} }`,
  namespace: (name: string) => `* as ${name}`,
  default: (name: string) => name,
};

export interface ImportReference {
  name: string;
  from: string;
  /** @default 'named' */
  kind?: keyof typeof IMPORT_BINDINGS;
}

/** e.g. `import { z } from 'zod';`, `import * as v from 'valibot';` or `import Joi from 'joi';`. */
export function createImportStatement({ name, from, kind = 'named' }: ImportReference) {
  return `import ${IMPORT_BINDINGS[kind](name)} from '${from}';`;
}

/**
 * Describes how one library expresses the schema tree. Returns a function, also available as
 * `.buildStepSchema`, that builds a step's schema with the library together with the source code
 * that produces it.
 *
 * ```ts
 * const zodSchemaBuilder = createSchemaBuilder({
 *   module: z,
 *   import: { name: 'z', from: 'zod' },
 *   kinds: { string: (node, { lib }) => lib.string(node.message), … },
 *   …
 * });
 *
 * const createZodAdapter = createValidatorAdapter(zodSchemaBuilder.buildStepSchema);
 * ```
 */
export function createSchemaBuilder<TLib, const TKinds extends SchemaKindBuilders<TLib>, TObject, TRefined>(
  definition: SchemaBuilderDefinition<TLib, TKinds, TObject, TRefined>,
) {
  const buildStepSchema = (spec: ResolvedStepSchema): BuiltStepSchema => {
    const codegen = createCodegen();

    function node(schema: SchemaNode): unknown {
      if (schema.kind === 'object') return object(schema.properties);

      const build = definition.kinds[schema.kind] as (node: SchemaNode, ctx: SchemaBuilderContext<TLib>) => unknown;

      return build(schema, ctx);
    }

    function field(schema: SchemaNode) {
      let built = node(schema) as KindSchema<TKinds>;

      if (definition.checks) built = definition.checks(built, schema, ctx) as KindSchema<TKinds>;
      if (schema.nullable) built = definition.nullable(built, schema, ctx) as KindSchema<TKinds>;
      if (schema.optional) built = definition.optional(built, schema, ctx) as KindSchema<TKinds>;

      return built;
    }

    function object(properties: readonly { key: string; schema: SchemaNode }[]) {
      return definition.object(
        properties.map((property) => ({
          key: property.key,
          schema: field(property.schema),
          optional: Boolean(property.schema.optional),
        })),
        ctx,
      );
    }

    type Handler = (...args: unknown[]) => unknown;
    const handlerFor = (handlers: object, check: SchemaCheck) =>
      (handlers as Record<string, Handler | undefined>)[check.check];

    const ctx: SchemaBuilderContext<TLib> = Object.assign(codegen, {
      lib: createExpr(definition.module, definition.import.name),
      chain: <S>(schema: SchemaNode, initial: S, handlers: ChainHandlers<S>) =>
        (schema.checks ?? []).reduce((current, check) => {
          const handler = handlerFor(handlers, check);

          return handler ? (handler(current, check, codegen.message(check, schema)) as S) : current;
        }, initial),
      actions: <H extends ActionHandlers>(schema: SchemaNode, handlers: H) =>
        (schema.checks ?? []).flatMap((check) => {
          const handler = handlerFor(handlers, check);

          return handler ? [handler(check, codegen.message(check, schema)) as ActionOf<H>] : [];
        }),
      allowsEmptyString,
      bound: (check: Extract<SchemaCheck, { check: 'min' | 'max' }>, schema: SchemaNode) =>
        schema.kind === 'date' ? new Date(check.value) : Number(check.value),
      // Built children are the library's own schemas; `never` lets them fit any schema parameter.
      field: (schema: SchemaNode) => field(schema) as never,
    });

    const step = object(spec.fields);
    const refined = spec.refinements.length > 0 ? definition.refine(step, spec.refinements, ctx) : step;
    const standard = definition.standard(refined, ctx);

    return {
      // The step object's input and output are the step's values.
      schema: unwrapExpr(standard) as StandardSchemaV1<StepValues, StepValues>,
      imports: [createImportStatement(definition.import)],
      declarations: codegen.declarations(),
      code: printExpr(standard),
    };
  };

  // Callable itself, and as `.buildStepSchema` for readability at the adapter.
  return Object.assign((spec: ResolvedStepSchema) => buildStepSchema(spec), { buildStepSchema });
}
