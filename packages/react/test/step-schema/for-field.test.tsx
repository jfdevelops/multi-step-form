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
import {
  type AnyMultiStepFormSchema,
  defineMultiStepForm,
} from '../../src';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = [];

function createMockStorage(): Storage {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

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

    it('binds a selectable implementation to a reusable target field', async () => {
      const schema = fieldFormDefinition.configure()({ instance: 'client' });
      const FieldValue = schema.createComponent.forField({
        step: 'step1',
        fields: ['firstName', 'email'],
        render(field, props: { prefix: string }) {
          return <p>{props.prefix}:{field.defaultValue}</p>;
        },
      });
      const FirstName = FieldValue.bindToField('firstName');

      type FirstNameProps = ComponentPropsWithRef<typeof FirstName>;
      expectTypeOf<'field'>().not.toMatchTypeOf<keyof FirstNameProps>();
      expectTypeOf<{ prefix: string }>().toMatchTypeOf<FirstNameProps>();

      // @ts-expect-error The selector limits reusable targets to its configured fields.
      FieldValue.bindToField('lastName');

      const screen = await renderInJsdom(<FirstName prefix='Name' />);

      expect(screen.getByText('Name:Taylor')).toBeDefined();
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

    it('binds a factory implementation while preserving the instance prop', async () => {
      const createForm = fieldFormDefinition.configure();
      const schema = createForm({ instance: 'client' });
      const FieldValue = createForm.createComponent.forField({
        step: 'step1',
        render(field, props: { prefix: string }) {
          return <p>{props.prefix}:{field.defaultValue}</p>;
        },
      });
      const Email = FieldValue.bindToField('email');

      type EmailProps = ComponentPropsWithRef<typeof Email>;
      expectTypeOf<{
        instance: typeof schema;
        prefix: string;
      }>().toMatchTypeOf<EmailProps>();
      expectTypeOf<'field'>().not.toMatchTypeOf<keyof EmailProps>();

      const screen = await renderInJsdom(
        <Email instance={schema} prefix='Email' />,
      );

      expect(screen.getByText('Email:client@example.com')).toBeDefined();
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

    it('keeps working after a persisted instance field update has already run', async () => {
      // Regression test: `value[step].createComponent` is rebuilt once in the
      // constructor and previously never survived a later `value` reassignment.
      // `update()` -> `handlePostUpdate()` writes to storage and then calls `sync()`,
      // which — whenever storage actually returns data — replaces `value` using only
      // the base class's own enrichment, silently dropping `createComponent` (and its
      // `forField`). Real, persisted storage is essential to reproduce this: an
      // in-memory-only instance never has `sync()`'s storage branch fire, so it never
      // showed the bug. A `forField` component whose bound instance had already
      // received at least one persisted update — the common case, since resolved
      // overrides apply via this same update path shortly after mount — would then
      // throw resolving `.forField` on `undefined` the next time a new field type for
      // that instance rendered for the first time.
      const definition = defineMultiStepForm({
        steps: {
          step1: {
            title: 'Contact',
            fields: {
              firstName: { defaultValue: 'Taylor', label: 'First name' },
            },
          },
        },
        instances: ['client'],
      }).configure({
        storage: { key: 'regression-forfield', store: createMockStorage() },
      });
      const schema = definition({ instance: 'client' });

      schema.stepSchema.value.step1.update({
        fields: ['fields.firstName.defaultValue'],
        updater: () => 'Updated',
      });

      const FirstName = definition.stepSchema.value.step1.createComponent.forField({
        field: 'firstName',
        render(field) {
          return <p>{field.defaultValue}</p>;
        },
      });

      const screen = await renderInJsdom(<FirstName instance={schema} />);

      expect(screen.getByText('Updated')).toBeDefined();
    });
  });

  describe('bindToInstance', () => {
    it('binds the instance once so a selectable component only needs "field"', async () => {
      const createForm = fieldFormDefinition.configure();
      const schema = createForm({ instance: 'client' });
      const TextField = createForm.stepSchema.value.step1.createComponent.forField(
        { fields: ['firstName', 'lastName'], render: (field) => <p>{field.defaultValue}</p> },
      );

      const SchemaTextField = TextField.bindToInstance(schema);
      const screen = await renderInJsdom(<SchemaTextField field='lastName' />);

      expect(screen.getByText('Client')).toBeDefined();
    });

    it('cannot be chained — an instance-bound component has no bindToInstance of its own', async () => {
      const createForm = fieldFormDefinition.configure();
      const schema = createForm({ instance: 'client' });
      const otherSchema = createForm({ instance: 'admin' });
      const TextField = createForm.stepSchema.value.step1.createComponent.forField(
        { fields: ['firstName', 'lastName'], render: (field) => <p>{field.defaultValue}</p> },
      );

      const SchemaTextField = TextField.bindToInstance(schema);
      expectTypeOf<'bindToInstance'>().not.toMatchTypeOf<
        keyof typeof SchemaTextField
      >();
      expect(() => {
        // @ts-expect-error Already instance-bound — rebinding isn't a real operation.
        SchemaTextField.bindToInstance(otherSchema);
      }).toThrow(TypeError);

      // A fully-bound component (both instance and field) has no methods left at all.
      const FirstName = SchemaTextField.bindToField('firstName');
      expectTypeOf<keyof typeof FirstName>().toEqualTypeOf<never>();
      expect(() => {
        // @ts-expect-error No instance left to bind on a fully-bound component either.
        FirstName.bindToInstance(otherSchema);
      }).toThrow(TypeError);
    });

    it('has no bindToInstance/bindToField at runtime either, once bound — not just at the type level', async () => {
      // A caller who bypasses the types entirely (plain JS, `as any`, a type-erasing
      // HOC) must not be able to silently "rebind" an already-bound slot: the inner
      // wrapper always injects its originally-bound value last, so a second bind would
      // build a component that looks rebound but keeps reading/writing the original
      // value — no error either way. The fix is to not expose the method at runtime
      // once a slot is bound, so calling it throws instead of silently doing nothing.
      const createForm = fieldFormDefinition.configure();
      const schema = createForm({ instance: 'client' });
      const otherSchema = createForm({ instance: 'admin' });
      const TextField = createForm.stepSchema.value.step1.createComponent.forField(
        { fields: ['firstName', 'lastName'], render: (field) => <p>{field.defaultValue}</p> },
      );

      const SchemaTextField = TextField.bindToInstance(schema) as unknown as Record<
        string,
        unknown
      >;
      expect(SchemaTextField.bindToInstance).toBeUndefined();
      expect(typeof SchemaTextField.bindToField).toBe('function');

      const FirstName = (
        SchemaTextField.bindToField as (field: string) => unknown
      )('firstName') as Record<string, unknown>;
      expect(FirstName.bindToInstance).toBeUndefined();
      expect(FirstName.bindToField).toBeUndefined();

      // Confirms it's still bound to the original instance — an admin-instance render
      // never shows up here, since there's no way left to rebind it.
      const screen = await renderInJsdom(createElement(FirstName as never));
      expect(screen.getByText('Taylor')).toBeDefined();
      void otherSchema;
    });

    it('composes with bindToField so the resulting component needs no props at all', async () => {
      const createForm = fieldFormDefinition.configure();
      const schema = createForm({ instance: 'client' });
      const TextField = createForm.stepSchema.value.step1.createComponent.forField(
        { fields: ['firstName', 'lastName'], render: (field) => <p>{field.defaultValue}</p> },
      );

      const SchemaTextField = TextField.bindToInstance(schema);
      const FirstName = SchemaTextField.bindToField('firstName');
      const screen = await renderInJsdom(<FirstName />);

      expect(screen.getByText('Taylor')).toBeDefined();
    });

    it('binds the instance for an already-field-bound component, in either order', async () => {
      const createForm = fieldFormDefinition.configure();
      const schema = createForm({ instance: 'client' });
      const TextField = createForm.stepSchema.value.step1.createComponent.forField(
        { fields: ['firstName', 'lastName'], render: (field) => <p>{field.defaultValue}</p> },
      );

      const FirstName = TextField.bindToField('firstName').bindToInstance(schema);
      const screen = await renderInJsdom(<FirstName />);

      expect(screen.getByText('Taylor')).toBeDefined();
    });

    it('still requires the original instance prop until bindToInstance is called', () => {
      const createForm = fieldFormDefinition.configure();
      const TextField = createForm.stepSchema.value.step1.createComponent.forField(
        { fields: ['firstName', 'lastName'], render: (field) => <p>{field.defaultValue}</p> },
      );

      <TextField field='firstName' instance={createForm({ instance: 'client' })}/>

      expect(() =>
        Reflect.apply(TextField, undefined, [{ field: 'firstName' }]),
      ).toThrow(InvalidComponentError);
    });

    it('types the "instance" prop as the loose default schema type by default', () => {
      const createForm = fieldFormDefinition.configure();
      const TextField = createForm.stepSchema.value.step1.createComponent.forField(
        { fields: ['firstName', 'lastName'], render: (field) => <p>{field.defaultValue}</p> },
      );

      type TextFieldProps = ComponentPropsWithRef<typeof TextField>;
      expectTypeOf<TextFieldProps['instance']>().toEqualTypeOf<AnyMultiStepFormSchema>();
    });

    it('narrows the "instance" prop type when the definition is configured with one', () => {
      const narrowedDefinition = defineMultiStepForm({
        steps: {
          step1: {
            title: 'Contact',
            fields: { firstName: { defaultValue: 'Taylor' } },
          },
        },
      });
      const plainSchema = narrowedDefinition.configure()();
      type NarrowedInstance = typeof plainSchema;

      const createForm = narrowedDefinition.configure<'title', NarrowedInstance>();
      const schema = createForm();
      const TextField = createForm.stepSchema.value.step1.createComponent.forField(
        { fields: ['firstName'], render: (field) => <p>{field.defaultValue}</p> },
      );

      type TextFieldProps = ComponentPropsWithRef<typeof TextField>;
      expectTypeOf<TextFieldProps['instance']>().toEqualTypeOf<NarrowedInstance>();

      // The narrowed instance type still accepts a real instance from this definition.
      const SchemaTextField = TextField.bindToInstance(schema);
      type SchemaTextFieldProps = ComponentPropsWithRef<typeof SchemaTextField>;
      expectTypeOf<'instance'>().not.toMatchTypeOf<keyof SchemaTextFieldProps>();
    });

    it('is a generic call and a generic bindToInstance, not fixed to one instance type per component', () => {
      // Two unrelated definitions, each configured with its own concrete instance
      // type as the `TInstanceSchema` bound. If `instance`/`bindToInstance` collapsed to a
      // single fixed type per component (rather than being generic per call), a
      // component built against one bound could never actually be *called* with an
      // instance whose type differs from whatever was inferred/used first.
      const definitionA = defineMultiStepForm({
        steps: { step1: { title: 'A', fields: { name: { defaultValue: 'A' } } } },
      });
      const definitionB = defineMultiStepForm({
        steps: { step1: { title: 'B', fields: { name: { defaultValue: 'B' } } } },
      });
      const schemaA = definitionA.configure()();
      const schemaB = definitionB.configure()();
      const TextField = definitionA.configure().stepSchema.value.step1.createComponent.forField(
        { field: 'name', render: (field) => <p>{field.defaultValue}</p> },
      );

      // `bindToInstance` accepts exactly the type it's called with — the parameter isn't
      // fixed to `AnyMultiStepFormSchema`, and it isn't fixed to whichever instance
      // type happened to be inferred by an earlier call in this file either.
      expectTypeOf(TextField.bindToInstance<typeof schemaA>)
        .parameter(0)
        .toEqualTypeOf<typeof schemaA>();

      // A structurally different instance — from a wholly separate definition — is
      // still accepted, each call inferring its own `TInstance` independently.
      expectTypeOf(TextField).toBeCallableWith({ instance: schemaB, field: 'name' });
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
