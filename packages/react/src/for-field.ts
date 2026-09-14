import type {
  Expand,
  getDeepFields,
  StepNumbers,
} from '@jfdevelops/multi-step-form-core';
import type { StepSchema } from '@jfdevelops/multi-step-form-core/_internals';
import { createElement, type ReactNode } from 'react';
import type { instantiateReactSteps, StepSpecificComponent } from './steps';

export namespace ForField {
  /**
   * The upper bound a component's `instance` prop accepts, or `never` when the
   * component doesn't carry an `instance` slot at all (e.g. one built directly from a
   * configured instance's own `stepSchema`, which is already bound).
   */
  type instanceOf<additionalProps extends object> = additionalProps extends {
    instance: infer instance;
  }
    ? instance
    : never;

  /** `additionalProps` with `instance` removed — what remains to be supplied once it's been pre-bound via `bindToInstance`. */
  type withoutInstance<additionalProps extends object> = Omit<
    additionalProps,
    'instance'
  >;

  /**
   * Substitutes a per-call-inferred `instance` type into `additionalProps`'s `instance`
   * slot, when it has one — this is what makes `instance` generic per call/per
   * `bindToInstance` binding rather than fixed to a single type for the whole component.
   * `additionalProps` without an `instance` slot passes through unchanged.
   */
  type withInstance<
    additionalProps extends object,
    TInstance,
  > = additionalProps extends { instance: unknown }
    ? Omit<additionalProps, 'instance'> & { instance: TInstance }
    : additionalProps;

  type componentProps<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep>,
    customProps extends object,
    additionalProps extends object,
  > = Expand<
    StepSpecificComponent.fieldComponentProps<
      def,
      value,
      targetStep,
      targetField,
      customProps
    > &
      additionalProps
  >;

  /**
   * The `bindToField` method — narrows a selectable component down to one field,
   * forever. Shared, as a plain object type, by {@linkcode selectableComponent}
   * for every `additionalProps` it's instantiated with (still needing an
   * `instance` prop, already bound via `bindToInstance`, or never needing one in
   * the first place) — nothing about `bindToField` itself changes between those
   * cases, so one definition covers all of them.
   */
  interface BindToField<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep>,
    customProps extends object,
    additionalProps extends object,
  > {
    /**
     * Binds one field from this selectable component to a component that always
     * renders that field — no `field` prop needed on the result. Call it once per
     * field to build a small set of concrete, ready-to-render components from one
     * definition.
     *
     * @param field The field this component should always render.
     * @returns A component with no `field` prop.
     * @example
     * ```tsx
     * const TextField = createForm.stepSchema.value.step1.createComponent.forField({
     *   fields: ['firstName', 'lastName'],
     *   render: (field) => <p>{field.defaultValue}</p>,
     * });
     *
     * // Still needs an `instance` prop, since none was bound yet:
     * const FirstName = TextField.bindToField('firstName');
     * <FirstName instance={schema} />
     *
     * // Bind the instance first (in either order) and the result needs nothing:
     * const SchemaTextField = TextField.bindToInstance(schema);
     * const LastName = SchemaTextField.bindToField('lastName');
     * <LastName />
     * ```
     */
    bindToField<field extends targetField>(
      field: field,
    ): boundComponent<
      def,
      value,
      targetStep,
      field,
      customProps,
      additionalProps
    >;
  }

  export type boundComponent<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep>,
    customProps extends object,
    additionalProps extends object = {},
  > = (<
    TInstance extends instanceOf<additionalProps> = instanceOf<additionalProps>,
  >(
    props: componentProps<
      def,
      value,
      targetStep,
      targetField,
      customProps,
      withInstance<additionalProps, TInstance>
    >,
  ) => ReactNode) &
    ([instanceOf<additionalProps>] extends [never]
      ? {}
      : {
          /**
           * Binds the form instance this component reads and writes, once, so every
           * caller downstream no longer needs an `instance` prop of its own —
           * `TInstance` is inferred from whatever's passed here, not fixed to a
           * single type for every component built from this definition, so two
           * different calls can each bind a different concrete instance.
           *
           * The returned {@linkcode boundComponent} has no `bindToInstance` of its
           * own: an instance is a one-time binding, not a chain.
           *
           * @param instance The form instance this component should read and write.
           * @returns A component that no longer needs an `instance` prop.
           * @example
           * ```tsx
           * const Age = createForm.stepSchema.value.step2.createComponent.forField({
           *   field: 'age',
           *   render: (field) => <p>{field.defaultValue}</p>,
           * });
           * const SchemaAge = Age.bindToInstance(schema);
           * <SchemaAge />
           * ```
           */
          bindToInstance<TInstance extends instanceOf<additionalProps>>(
            instance: TInstance,
          ): boundComponent<
            def,
            value,
            targetStep,
            targetField,
            customProps,
            withoutInstance<additionalProps>
          >;
        });

  export type selectableComponent<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep>,
    customProps extends object,
    additionalProps extends object = {},
  > = {
    <
      field extends targetField,
      TInstance extends instanceOf<additionalProps> =
        instanceOf<additionalProps>,
    >(
      props: Expand<
        componentProps<
          def,
          value,
          targetStep,
          field,
          customProps,
          withInstance<additionalProps, TInstance>
        > & { field: field }
      >,
    ): ReactNode;
  } & BindToField<
    def,
    value,
    targetStep,
    targetField,
    customProps,
    additionalProps
  > &
    ([instanceOf<additionalProps>] extends [never]
      ? {}
      : {
          /**
           * Binds the form instance this component reads and writes, once, so every
           * caller downstream — including fields bound afterward via `bindToField`
           * — no longer needs an `instance` prop of its own. `TInstance` is
           * inferred from whatever's passed here, not fixed to a single type for
           * every component built from this definition, so two different calls can
           * each bind a different concrete instance.
           *
           * The returned {@linkcode selectableComponent} has no `bindToInstance` of
           * its own: an instance is a one-time binding, not a chain. `bindToField`
           * is still available to narrow down to one field.
           *
           * @param instance The form instance this component should read and write.
           * @returns A selectable component that no longer needs an `instance` prop.
           * @example
           * ```tsx
           * const TextField = createForm.stepSchema.value.step1.createComponent.forField(
           *   { fields: ['firstName', 'lastName'], render: (field) => <p>{field.defaultValue}</p> },
           * );
           * const SchemaTextField = TextField.bindToInstance(schema);
           *
           * // Calling the component:
           * <SchemaTextField field='firstName' />
           * <SchemaTextField field='lastName' />
           * ```
           */
          bindToInstance<TInstance extends instanceOf<additionalProps>>(
            instance: TInstance,
          ): selectableComponent<
            def,
            value,
            targetStep,
            targetField,
            customProps,
            withoutInstance<additionalProps>
          >;
        });

  /**
   * `forField` at the definition/factory level: builds a field component that isn't
   * bound to any one configured instance yet — every call site chooses which
   * `step` it targets. Compare {@linkcode stepCreateComponentFn}, which is already
   * scoped to one step.
   *
   * Which overload applies depends on `field`/`fields` in the config:
   * - `field` given → one field, forever — a {@linkcode boundComponent}.
   * - `fields` given, or omitted entirely → any of those fields (or any field on
   *   the step, if omitted), chosen per render via a `field` prop — a
   *   {@linkcode selectableComponent}. Narrow it to one field later with
   *   `bindToField`.
   */
  export interface createComponentFn<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    additionalProps extends object = {},
  > {
    /** Binds to exactly one field — `render` only ever sees that field's data. */
    <
      targetStep extends StepNumbers<value>,
      targetField extends getDeepFields<value, targetStep>,
      customProps extends object = {},
    >(
      config: StepSpecificComponent.fieldConfig<
        def,
        value,
        targetStep,
        targetField,
        customProps
      > & { step: targetStep },
    ): boundComponent<
      def,
      value,
      targetStep,
      targetField,
      customProps,
      additionalProps
    >;

    /** Selectable among exactly the given `fields`, chosen per render via a `field` prop. */
    <
      targetStep extends StepNumbers<value>,
      targetField extends getDeepFields<value, targetStep>,
      customProps extends object = {},
    >(
      config: StepSpecificComponent.selectableFieldConfig<
        def,
        value,
        targetStep,
        targetField,
        customProps
      > & { fields: readonly targetField[]; step: targetStep },
    ): selectableComponent<
      def,
      value,
      targetStep,
      targetField,
      customProps,
      additionalProps
    >;

    /** Selectable among every field on the step, chosen per render via a `field` prop. */
    <targetStep extends StepNumbers<value>, customProps extends object = {}>(
      config: Omit<
        StepSpecificComponent.selectableFieldConfig<
          def,
          value,
          targetStep,
          getDeepFields<value, targetStep>,
          customProps
        >,
        'fields'
      > & { fields?: undefined; step: targetStep },
    ): selectableComponent<
      def,
      value,
      targetStep,
      getDeepFields<value, targetStep>,
      customProps,
      additionalProps
    >;
  }

  /**
   * `forField` scoped to one specific step (e.g.
   * `bookAppointmentForm.stepSchema.value.step1.createComponent.forField(...)`) — unlike
   * {@linkcode createComponentFn}, `targetStep` is already fixed, so config doesn't
   * repeat a `step` property.
   *
   * Which overload applies depends on `field`/`fields` in the config, exactly as in
   * {@linkcode createComponentFn}:
   * - `field` given → one field, forever — a {@linkcode boundComponent}.
   * - `fields` given, or omitted entirely → any of those fields (or any field on
   *   the step, if omitted), chosen per render via a `field` prop — a
   *   {@linkcode selectableComponent}. Narrow it to one field later with
   *   `bindToField`.
   */
  export interface stepCreateComponentFn<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    additionalProps extends object = {},
  > {
    /** Binds to exactly one field — `render` only ever sees that field's data. */
    <
      targetField extends getDeepFields<value, targetStep>,
      customProps extends object = {},
    >(
      config: StepSpecificComponent.fieldConfig<
        def,
        value,
        targetStep,
        targetField,
        customProps
      >,
    ): boundComponent<
      def,
      value,
      targetStep,
      targetField,
      customProps,
      additionalProps
    >;

    /** Selectable among exactly the given `fields`, chosen per render via a `field` prop. */
    <
      targetField extends getDeepFields<value, targetStep>,
      customProps extends object = {},
    >(
      config: StepSpecificComponent.selectableFieldConfig<
        def,
        value,
        targetStep,
        targetField,
        customProps
      > & { fields: readonly targetField[] },
    ): selectableComponent<
      def,
      value,
      targetStep,
      targetField,
      customProps,
      additionalProps
    >;

    /** Selectable among every field on the step, chosen per render via a `field` prop. */
    <customProps extends object = {}>(
      config: Omit<
        StepSpecificComponent.selectableFieldConfig<
          def,
          value,
          targetStep,
          getDeepFields<value, targetStep>,
          customProps
        >,
        'fields'
      > & { fields?: undefined },
    ): selectableComponent<
      def,
      value,
      targetStep,
      getDeepFields<value, targetStep>,
      customProps,
      additionalProps
    >;
  }
}

type SelectableComponent = (props: Record<string, unknown>) => ReactNode;

/**
 * Wraps a field component with `bindToField`/`bindToInstance`, the runtime side of
 * {@linkcode ForField.boundComponent}, {@linkcode ForField.selectableComponent}, and
 * their instance-bound counterparts. Every component `forField` produces goes through
 * this — including the ones `bindToField`/`bindToInstance` themselves return, so binding
 * stays available at every step of narrowing, in whichever order a caller chains them.
 *
 * Untyped by design: `ForField`'s exported types are what give callers the real,
 * narrowed signatures (including which methods are — and aren't — present after
 * binding); this function only needs to know it's wrapping *some* component.
 *
 * @param Component The field component to add `bindToField`/`bindToInstance` to.
 * @returns `Component`, with `bindToField` and `bindToInstance` attached.
 */
export function withReusableField<Component extends SelectableComponent>(
  Component: Component,
) {
  /** Fixes `field` on every render, so callers no longer pass it as a prop. */
  function bindToField(field: string) {
    return withReusableField(function BoundField(
      props: Record<string, unknown> = {},
    ) {
      return createElement(Component as never, { ...props, field } as never);
    });
  }

  /** Fixes `instance` on every render, so callers no longer pass it as a prop. */
  function bindToInstance(instance: unknown) {
    return withReusableField(function InstanceBoundField(
      props: Record<string, unknown> = {},
    ) {
      return createElement(Component as never, { ...props, instance } as never);
    });
  }

  return Object.assign(Component, { bindToField, bindToInstance });
}
