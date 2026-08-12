import {
  InvalidComponentError,
  InvalidFieldError,
} from '@jfdevelops/multi-step-form-core';
import {
  ComponentPropsWithRef,
  type ReactElement,
  act,
  createElement,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = [];

const fieldFormDefinition = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Contact',
      fields: {
        firstName: { defaultValue: 'Taylor', label: 'First name' },
        lastName: { defaultValue: 'Client', label: 'Last name' },
        email: { defaultValue: 'client@example.com' },
      },
    },
    step2: {
      title: 'Details',
      fields: {
        age: { defaultValue: 30 },
      },
    },
  },
  instances: ['client', 'admin'],
});

afterEach(async () => {
  for (const { container, root } of mountedRoots.splice(0)) {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  }
});

async function renderInJsdom(ui: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);
  mountedRoots.push({ container, root });

  await act(async () => {
    root.render(ui);
  });

  return {
    getByText(text: string) {
      const match = Array.from(container.querySelectorAll('*')).find(
        (element) => element.textContent === text,
      );

      if (!(match instanceof HTMLElement)) {
        throw new Error(`Unable to find element with text: ${text}`);
      }

      return match;
    },
  };
}

describe('createComponent.forField', () => {
  describe('configured schema createComponent', () => {
    it('supports a bound field without custom props', async () => {
      const schema = fieldFormDefinition.configure()({ instance: 'client' });
      const FirstName = schema.createComponent.forField({
        step: 'step1',
        field: 'firstName',
        render(field) {
          expectTypeOf(field.name).toEqualTypeOf<'firstName'>();
          expectTypeOf(field.defaultValue).toEqualTypeOf<string>();

          return <p>{field.defaultValue}</p>;
        },
      });

      const screen = await renderInJsdom(<FirstName />);

      expect(screen.getByText('Taylor')).toBeDefined();
    });

    it('supports a selectable field with custom props', async () => {
      const schema = fieldFormDefinition.configure()({ instance: 'client' });
      const FieldValue = schema.createComponent.forField({
        step: 'step1',
        render(field, props: { prefix: string }) {
          expectTypeOf(field.name).toEqualTypeOf<
            'firstName' | 'lastName' | 'email'
          >();

          return <p>{props.prefix}:{field.defaultValue}</p>;
        },
      });

      const screen = await renderInJsdom(
        <FieldValue field='email' prefix='Email' />,
      );

      expect(screen.getByText('Email:client@example.com')).toBeDefined();
    });

    it('supports a narrowed fields selector without custom props', async () => {
      const schema = fieldFormDefinition.configure()({ instance: 'client' });
      const Name = schema.createComponent.forField({
        step: 'step1',
        fields: ['firstName', 'lastName'],
        render(field) {
          expectTypeOf(field.name).toEqualTypeOf<'firstName' | 'lastName'>();

          return <p>{field.defaultValue}</p>;
        },
      });

      type NameProps = ComponentPropsWithRef<typeof Name>;
      expectTypeOf<{ field: 'email' }>().not.toMatchTypeOf<NameProps>();

      const screen = await renderInJsdom(<Name field='lastName' />);

      expect(screen.getByText('Client')).toBeDefined();
    });
  });

  describe('configured step createComponent', () => {
    it('supports a bound field with custom props', async () => {
      const schema = fieldFormDefinition.configure()({ instance: 'client' });
      const Age = schema.stepSchema.value.step2.createComponent.forField({
        field: 'age',
        render(field, props: { suffix: string }) {
          expectTypeOf(field.name).toEqualTypeOf<'age'>();
          expectTypeOf(field.defaultValue).toEqualTypeOf<number>();

          return <p>{field.defaultValue} {props.suffix}</p>;
        },
      });

      const screen = await renderInJsdom(<Age suffix='years' />);

      expect(screen.getByText('30 years')).toBeDefined();
    });

    it('supports a selectable field without custom props', async () => {
      const schema = fieldFormDefinition.configure()({ instance: 'client' });
      const FieldValue = schema.stepSchema.value.step1.createComponent.forField({
        render(field) {
          expectTypeOf(field.name).toEqualTypeOf<
            'firstName' | 'lastName' | 'email'
          >();

          return <p>{field.defaultValue}</p>;
        },
      });

      const screen = await renderInJsdom(<FieldValue field='email' />);

      expect(screen.getByText('client@example.com')).toBeDefined();
    });

    it('supports a narrowed fields selector with custom props', async () => {
      const schema = fieldFormDefinition.configure()({ instance: 'client' });
      const Name = schema.stepSchema.value.step1.createComponent.forField({
        fields: ['firstName', 'lastName'],
        render(field, props: { prefix: string }) {
          expectTypeOf(field.name).toEqualTypeOf<'firstName' | 'lastName'>();

          return <p>{props.prefix}:{field.defaultValue}</p>;
        },
      });

      const screen = await renderInJsdom(
        <Name field='firstName' prefix='Name' />,
      );

      expect(screen.getByText('Name:Taylor')).toBeDefined();
    });
  });

  describe('definition createComponent', () => {
    it('supports a bound field with custom props and an explicit instance', async () => {
      const createForm = fieldFormDefinition.configure();
      const schema = createForm({ instance: 'client' });
      const Age = createForm.createComponent.forField({
        step: 'step2',
        field: 'age',
        render(field, props: { suffix: string }) {
          expectTypeOf(field.name).toEqualTypeOf<'age'>();

          return <p>{field.defaultValue} {props.suffix}</p>;
        },
      });

      const screen = await renderInJsdom(
        <Age instance={schema} suffix='years' />,
      );

      expect(screen.getByText('30 years')).toBeDefined();
    });

    it('supports a selectable field without custom props and an explicit instance', async () => {
      const createForm = fieldFormDefinition.configure();
      const schema = createForm({ instance: 'client' });
      const FieldValue = createForm.createComponent.forField({
        step: 'step1',
        render(field) {
          expectTypeOf(field.name).toEqualTypeOf<
            'firstName' | 'lastName' | 'email'
          >();

          return <p>{field.defaultValue}</p>;
        },
      });

      const screen = await renderInJsdom(
        <FieldValue instance={schema} field='email' />,
      );

      expect(screen.getByText('client@example.com')).toBeDefined();
    });

    it('supports narrowed fields and reads overrides from a finalized instance', async () => {
      const createForm = fieldFormDefinition.configure();
      const schema = createForm({ instance: 'client' })
        .withOverrides({
          step1: async () => ({ firstName: 'Client override' }),
        })
        .withForm({ render: () => null })
        .withContext();
      const Name = createForm.createComponent.forField({
        step: 'step1',
        fields: ['firstName', 'lastName'],
        render(field) {
          expectTypeOf(field.name).toEqualTypeOf<'firstName' | 'lastName'>();

          return <p>{field.defaultValue}</p>;
        },
      });

      type NameProps = ComponentPropsWithRef<typeof Name>;
      expectTypeOf<{ instance: typeof schema; field: 'email' }>().not.toMatchTypeOf<NameProps>();

      const screen = await renderInJsdom(
        <Name
          instance={schema}
          field='firstName'
          suspend
          fallback={<p>Loading</p>}
        />,
      );

      expect(screen.getByText('Client override')).toBeDefined();
    });
  });

  describe('definition step createComponent', () => {
    it('supports a bound field without custom props and an explicit instance', async () => {
      const createForm = fieldFormDefinition.configure();
      const schema = createForm({ instance: 'client' });
      const FirstName = createForm.stepSchema.value.step1.createComponent.forField({
        field: 'firstName',
        render(field) {
          expectTypeOf(field.name).toEqualTypeOf<'firstName'>();

          return <p>{field.defaultValue}</p>;
        },
      });

      const screen = await renderInJsdom(<FirstName instance={schema} />);

      expect(screen.getByText('Taylor')).toBeDefined();
    });

    it('supports a selectable field with custom props and an explicit instance', async () => {
      const createForm = fieldFormDefinition.configure();
      const schema = createForm({ instance: 'client' });
      const FieldValue = createForm.stepSchema.value.step1.createComponent.forField({
        render(field, props: { prefix: string }) {
          expectTypeOf(field.name).toEqualTypeOf<
            'firstName' | 'lastName' | 'email'
          >();

          return <p>{props.prefix}:{field.defaultValue}</p>;
        },
      });

      const screen = await renderInJsdom(
        <FieldValue instance={schema} field='lastName' prefix='Name' />,
      );

      expect(screen.getByText('Name:Client')).toBeDefined();
    });

    it('supports narrowed fields with custom props and an explicit instance', async () => {
      const createForm = fieldFormDefinition.configure();
      const schema = createForm({ instance: 'client' });
      const Name = createForm.stepSchema.value.step1.createComponent.forField({
        fields: ['firstName', 'lastName'],
        render(field, props: { prefix: string }) {
          expectTypeOf(field.name).toEqualTypeOf<'firstName' | 'lastName'>();

          return <p>{props.prefix}:{field.defaultValue}</p>;
        },
      });

      const screen = await renderInJsdom(
        <Name instance={schema} field='lastName' prefix='Name' />,
      );

      expect(screen.getByText('Name:Client')).toBeDefined();
    });
  });

  describe('runtime validation', () => {
    it('rejects a factory field component without an instance', () => {
      const createForm = fieldFormDefinition.configure();
      const FirstName = createForm.createComponent.forField({
        step: 'step1',
        field: 'firstName',
        render: () => null,
      });

      expect(() => Reflect.apply(FirstName, undefined, [{}])).toThrow(
        InvalidComponentError,
      );
    });

    it('rejects a selectable component without a field', async () => {
      const schema = fieldFormDefinition.configure()({ instance: 'client' });
      const FieldValue = schema.createComponent.forField({
        step: 'step1',
        render: () => null,
      });

      await expect(
        renderInJsdom(
          // Reflection reaches the runtime guard because TypeScript prevents this call.
          createElement(FieldValue as never, {}),
        ),
      ).rejects.toThrow(InvalidFieldError);
    });

    it('rejects a field outside the configured fields selector', async () => {
      const schema = fieldFormDefinition.configure()({ instance: 'client' });
      const Name = schema.createComponent.forField({
        step: 'step1',
        fields: ['firstName', 'lastName'],
        render: () => null,
      });

      await expect(
        renderInJsdom(
          // Runtime validation is exercised through reflection because TypeScript narrows the prop.
          createElement(Name as never, { field: 'email' }),
        ),
      ).rejects.toThrow(InvalidFieldError);
    });
  });
});
