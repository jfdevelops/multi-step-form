import type {
  Expand,
  getDeepFields,
  StepNumbers,
} from '@jfdevelops/multi-step-form-core';
import type { StepSchema } from '@jfdevelops/multi-step-form-core/_internals';
import { createElement, type ReactNode } from 'react';
import type {
  instantiateReactSteps,
  StepSpecificComponent,
} from './steps';

export namespace ForField {
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

  export type boundComponent<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep>,
    customProps extends object,
    additionalProps extends object = {},
  > = (
    props: componentProps<
      def,
      value,
      targetStep,
      targetField,
      customProps,
      additionalProps
    >,
  ) => ReactNode;

  export type selectableComponent<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep>,
    customProps extends object,
    additionalProps extends object = {},
  > = {
    <field extends targetField>(
      props: Expand<
        componentProps<
          def,
          value,
          targetStep,
          field,
          customProps,
          additionalProps
        > & { field: field }
      >,
    ): ReactNode;

    /** Binds one field from a selectable implementation to a reusable component. */
    asReusable<field extends targetField>(
      field: field,
    ): boundComponent<
      def,
      value,
      targetStep,
      field,
      customProps,
      additionalProps
    >;
  };

  export interface createComponentFn<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    additionalProps extends object = {},
  > {
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

    <
      targetStep extends StepNumbers<value>,
      customProps extends object = {},
    >(
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

  export interface stepCreateComponentFn<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    additionalProps extends object = {},
  > {
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

type SelectableComponent = (
  props: Record<string, unknown>,
) => ReactNode;

export function withReusableField<Component extends SelectableComponent>(
  Component: Component,
) {
  function asReusable(field: string) {
    return function ReusableField(props: Record<string, unknown> = {}) {
      return createElement(Component as never, { ...props, field } as never);
    };
  }

  return Object.assign(Component, { asReusable });
}
