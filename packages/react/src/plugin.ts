import type {
  HelperFnChosenSteps,
  steps,
} from '@jfdevelops/multi-step-form-core';
import type { StepSchema } from '@jfdevelops/multi-step-form-core/_internals';
import type { MultiStepFormSchema } from './schema';
import type { IsUnknown } from './utils';
type ExtendedStepSpecificFunctions = steps.ExtendedStepSpecificFunctions<
  StepSchema.Config,
  steps.instantiateSteps<StepSchema.Config>,
  steps.StepNumbers<steps.instantiateSteps<StepSchema.Config>>
>;
export type PluginInstanceType = 'schema' | 'step-schema';

export type BasePluginType = 'augment' | PluginInstanceType;
export type PluginTargets = HelperFnChosenSteps.tupleNotation<BasePluginType>;
export type BaseHandlerOptions = {
  schema: MultiStepFormSchema<StepSchema.Config>;
};
export type DefinedConfigHandlerOptions<config> = BaseHandlerOptions & {
  config: config;
};
export type HandlerFunction<config, additionalOptions = {}, ret = void> = (
  options: (IsUnknown<config> extends true
    ? BaseHandlerOptions
    : DefinedConfigHandlerOptions<config>) &
    additionalOptions
) => ret;
// type DuringValueEnrichment = {createComponent: v}
type DuringValueEnrichment<config, beforeValueEnrichment> = {
  [key in keyof ExtendedStepSpecificFunctions]?: HandlerFunction<
    config,
    {
      targetStep: steps.StepNumbers<steps.instantiateSteps<StepSchema.Config>>;
    } & (beforeValueEnrichment extends void
      ? {}
      : { beforeValueEnrichment: beforeValueEnrichment }),
    unknown
  >;
};
export type StepSchemaPluginConfig<
  config,
  beforeValueEnrichment,
  duringValueEnrichment extends DuringValueEnrichment<
    config,
    beforeValueEnrichment
  >,
> = {
  valueEnrichment?: {
    /**
     * A function that is called before the value enrichment.
     */
    before?: HandlerFunction<config, {}, beforeValueEnrichment>;
    /**
     * A function that is called during the value enrichment.
     */
    during?: duringValueEnrichment;
  };
  onSetup?: HandlerFunction<config>;
};
export type AddAsInstance = {
  schema?: boolean;
  stepSchema?: boolean;
};
export type CreatePluginOptions<
  key extends string,
  target extends PluginTargets,
  config,
  beforeValueEnrichment,
  duringValueEnrichment extends DuringValueEnrichment<
    config,
    beforeValueEnrichment
  >,
> = {
  key: key;
  /**
   * Whether to add the plugin to the `def` generic parameter.
   */
  addToDef?: boolean;
  /**
   * Whether to add the return type of the plugin as an instance variable.
   *
   * If it is a boolean, it will be added as a variable in the `schema` object.
   * If you need more control, you can use an object with the following properties:
   * - `schema`: Whether to add the return type of the plugin as a variable in the `schema` object.
   * - `stepSchema`: Whether to add the return type of the plugin as a variable in the `stepSchema` object.
   */
  addAsInstance?: boolean | AddAsInstance;
  /**
   * The target of the plugin.
   *
   * It can be a tuple of `instance` and `step-schema`.
   *
   * - `['schema', 'step-schema'] | ['step-schema', 'schema']`: will make the plugin available as a variable in the `schema` object and the `stepSchema` object.
   * - `['schema']`: will make the plugin available as a variable in the `schema` object.
   * - `['step-schema']`: will make the plugin available as a variable in the `stepSchema` object.
   */
  target: target;
  /**
   *
   * @param schema The multi step form schema.
   * @returns The config for the plugin.
   */
  config?: (
    schema: MultiStepFormSchema<StepSchema.Config>,
    config: config
  ) => config;
  schema?: any;
  stepSchema?: StepSchemaPluginConfig<
    config,
    beforeValueEnrichment,
    duringValueEnrichment
  >;
};

export interface BasePluginDefinition<
  key extends string,
  target extends PluginTargets,
> {
  key: key;
  target: target;
}

export interface PluginDefinitionWithConfig<
  key extends string,
  target extends PluginTargets,
  config,
> extends BasePluginDefinition<key, target> {
  config: config;
}
export interface PluginDefinitionWithoutConfig<
  key extends string,
  target extends PluginTargets,
> extends BasePluginDefinition<key, target> {}

export type Plugin<
  key extends string,
  type extends PluginTargets,
  config = never,
> =
  | PluginDefinitionWithConfig<key, type, config>
  | PluginDefinitionWithoutConfig<key, type>;
export type AnyPlugin = Plugin<string, PluginTargets>;
type PluginConfigEntry<plugin> =
  plugin extends Plugin<infer key, any, infer config>
    ? [config] extends [never]
      ? {}
      : { [K in key]: config }
    : {};
export type ReducePlugins<
  plugins extends readonly unknown[],
  acc extends object = {},
> = plugins extends readonly [infer head, ...infer tail]
  ? ReducePlugins<tail, acc & PluginConfigEntry<head>>
  : acc;
export type CreatedPlugin<
  key extends string,
  type extends PluginTargets,
  config = never,
> = <
  const def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>,
>(
  schema: MultiStepFormSchema<def, value>
) => Plugin<key, type, config>;
export type PluginWithConfig<
  key extends string,
  type extends PluginTargets,
  config,
> = <const input extends config, output = input>(
  input: input
) => CreatedPlugin<key, type, output>;
export type PluginWithoutConfig<
  key extends string,
  type extends PluginTargets,
> = () => CreatedPlugin<key, type>;

export function createPlugin<
  key extends string,
  target extends PluginTargets,
  config,
  beforeValueEnrichment,
  duringValueEnrichment extends DuringValueEnrichment<
    config,
    beforeValueEnrichment
  >,
>(
  options: CreatePluginOptions<
    key,
    target,
    config,
    beforeValueEnrichment,
    duringValueEnrichment
  >
): IsUnknown<config> extends true
  ? PluginWithoutConfig<key, target>
  : PluginWithConfig<key, target, config> {
  const { key, target, config, ...handlerConfig } = options;

  return (input?: config) =>
    <
      const def extends StepSchema.Config,
      value extends steps.instantiateSteps<def>,
    >(
      schema: MultiStepFormSchema<def, value>
    ) => {
      const outputConfig = config?.(schema as never, input as never);

      return {
        key,
        target,
        config: outputConfig,
      };
    };
}
