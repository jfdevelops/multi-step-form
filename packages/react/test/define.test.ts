import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  InvalidInstanceError,
  NoActiveInstanceError,
} from '@jfdevelops/multi-step-form-core';
import { defineMultiStepForm, type MultiStepFormSchema } from '../src';

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

function createBookingDefinition() {
  return defineMultiStepForm({
    steps: {
      step1: {
        title: 'Step 1',
        fields: { firstName: { defaultValue: '' } },
      },
    },
    instances: ['admin', 'client'],
  });
}

describe('react defineMultiStepForm: definition schema surface', () => {
  it('exposes the React schema and a type-only exact step union', () => {
    const definition = createBookingDefinition();

    type Step = typeof definition.stepNumbers;

    expectTypeOf<Step>().toEqualTypeOf<'step1'>();
    expect(definition.stepSchema.value.step1.title).toBe('Step 1');
    expect(typeof definition.withForm).toBe('function');
    expect(typeof definition.createComponent).toBe('function');
    expect('stepNumbers' in definition).toBe(false);
  });

  it('keeps definition and configured instance state independent', () => {
    const definition = createBookingDefinition();
    const client = definition.configure()({ instance: 'client' });

    definition.stepSchema.value.step1.update({
      fields: ['fields.firstName.defaultValue'],
      updater: 'Definition',
    });
    client.stepSchema.value.step1.update({
      fields: ['fields.firstName.defaultValue'],
      updater: 'Client',
    });

    expect(
      definition.stepSchema.value.step1.fields.firstName.defaultValue,
    ).toBe('Definition');
    expect(client.stepSchema.value.step1.fields.firstName.defaultValue).toBe(
      'Client',
    );
  });
});

describe('react defineMultiStepForm: nameTransformCasing', () => {
  it('is not accepted at define time and threads through .configure() instead', () => {
    defineMultiStepForm({
      steps: {
        step1: { title: 'Step 1', fields: { firstName: { defaultValue: '' } } },
      },
      // @ts-expect-error "nameTransformCasing" moved to .configure()
      nameTransformCasing: 'camel',
    });

    const createForm = defineMultiStepForm({
      steps: {
        step1: { title: 'Step 1', fields: { firstName: { defaultValue: '' } } },
      },
    }).configure({
      nameTransformCasing: 'camel',
    });

    expect(createForm().stepSchema.defaultNameTransformationCasing).toBe(
      'camel',
    );
  });
});

describe('react defineMultiStepForm: public types', () => {
  it('preserves custom field metadata and exact step keys through form context', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            email: {
              defaultValue: '',
              type: 'string.email',
            },
          },
        },
        step2: {
          title: 'Step 2',
          fields: {
            accepted: {
              defaultValue: false,
              type: 'boolean.switch',
            },
          },
        },
      },
    })
      .configure()()
      .withForm({ render: () => null })
      .withContext();

    type ResolvedSteps = MultiStepFormSchema.resolvedStep<typeof schema>;

    expectTypeOf<keyof ResolvedSteps>().toEqualTypeOf<'step1' | 'step2'>();
    expectTypeOf(
      schema.stepSchema.original.step1.fields.email.type,
    ).toEqualTypeOf<'string.email'>();
    expectTypeOf(
      schema.stepSchema.original.step2.fields.accepted.type,
    ).toEqualTypeOf<'boolean.switch'>();
  });
});

describe('react defineMultiStepForm: instances', () => {
  it('creates independent state per named instance', () => {
    const createForm = createBookingDefinition().configure();

    const client = createForm({ instance: 'client' });
    const admin = createForm({ instance: 'admin' });

    client.stepSchema.value.step1.update({
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    });

    expect(client.stepSchema.value.step1.fields.firstName.defaultValue).toBe(
      'Taylor',
    );
    expect(admin.stepSchema.value.step1.fields.firstName.defaultValue).toBe('');
  });

  it('rejects instances that were not declared', () => {
    const createForm = createBookingDefinition().configure();

    // @ts-expect-error "sales" isn't a declared instance
    expect(() => createForm({ instance: 'sales' })).toThrow(
      InvalidInstanceError,
    );
  });

  it('returns instances that still support withForm/withContext', () => {
    const createForm = createBookingDefinition().configure();
    const instance = createForm({ instance: 'client' });

    expect(typeof instance.withForm).toBe('function');
    expect(typeof instance.withContext).toBe('function');
    expect(typeof instance.withOverrides).toBe('function');
  });
});

describe('react defineMultiStepForm: storage', () => {
  it('resolves a distinct key per instance from a multi-key storage record', () => {
    const store = createMockStorage();
    const createForm = createBookingDefinition().configure({
      storage: {
        key: { client: 'booking:client', admin: 'booking:admin' },
        store,
        configure: { instances: ['client', 'admin'] },
      },
    });

    const client = createForm({ instance: 'client' });
    const admin = createForm({ instance: 'admin' });

    client.stepSchema.value.step1.update({
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    });
    admin.stepSchema.value.step1.update({
      fields: ['fields.firstName.defaultValue'],
      updater: 'Jordan',
    });

    expect(client.storage.key).toBe('booking:client');
    expect(admin.storage.key).toBe('booking:admin');
    expect(store.getItem('booking:client')).not.toBeNull();
    expect(store.getItem('booking:admin')).not.toBeNull();

    const clientStored = JSON.parse(store.getItem('booking:client')!);
    const adminStored = JSON.parse(store.getItem('booking:admin')!);

    expect(clientStored.step1.fields.firstName.defaultValue).toBe('Taylor');
    expect(adminStored.step1.fields.firstName.defaultValue).toBe('Jordan');
  });

  it('throws InvalidInstanceError when the storage key record is missing an entry for a configured instance', () => {
    const store = createMockStorage();
    const createForm = createBookingDefinition().configure({
      storage: {
        key: { client: 'booking:client' } as Record<'client' | 'admin', string>,
        store,
        configure: { instances: ['client', 'admin'] },
      },
    });

    createForm({ instance: 'client' });
    expect(() => createForm({ instance: 'admin' })).toThrow(
      InvalidInstanceError,
    );
  });
});

describe('react defineMultiStepForm: withOverrides', () => {
  it('applies overrides independently per instance and preserves react schema behavior', async () => {
    const createForm = createBookingDefinition().configure();

    const client = createForm({ instance: 'client' }).withOverrides({
      step1: async () => ({ firstName: 'ClientDefault' }),
    });

    await Reflect.apply(client.stepSchema.resolveStep, client.stepSchema, [
      'step1',
    ]);

    expect(client.stepSchema.value.step1.fields.firstName.defaultValue).toBe(
      'ClientDefault',
    );
  });
});

describe('react defineMultiStepForm: shared createHelperFn', () => {
  it('dispatches to the active instance', () => {
    const createForm = createBookingDefinition().configure();
    const setFirstName = createForm.step1.createHelperFn(({ update }) => {
      update.step1({
        fields: ['fields.firstName.defaultValue'],
        updater: 'Riley',
      });
    });

    createForm({ instance: 'client' });
    setFirstName();

    expect(
      createForm({ instance: 'client' }).stepSchema.value.step1.fields.firstName
        .defaultValue,
    ).toBe('Riley');
  });

  it('throws NoActiveInstanceError when no instance has been created', () => {
    const createForm = createBookingDefinition().configure();
    const setFirstName = createForm.step1.createHelperFn(({ update }) => {
      update.step1({
        fields: ['fields.firstName.defaultValue'],
        updater: 'Riley',
      });
    });

    expect(() => setFirstName()).toThrow(NoActiveInstanceError);
  });
});
