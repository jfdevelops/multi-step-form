import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  defineMultiStepForm,
  NoActiveInstanceError,
  InvalidInstanceError,
} from '../src';
import { createMockStorage } from './utils/create-mock-storage';

describe('defineMultiStepForm: factory call typing', () => {
  it('requires "instance" when "instances" is declared', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: { title: 'Step 1', fields: { firstName: { defaultValue: '' } } },
      },
      instances: ['admin', 'client'],
    }).configure();

    expect(() => {
      // @ts-expect-error "instance" is required once "instances" is declared
      createForm();
    }).toThrow(InvalidInstanceError);

    createForm({ instance: 'client' });
  });

  it('allows a no-arg call when "instances" is omitted', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: { title: 'Step 1', fields: { firstName: { defaultValue: '' } } },
      },
    }).configure();

    createForm();
  });

  it('does not accept "nameTransformCasing" at define time', () => {
    defineMultiStepForm({
      steps: {
        step1: { title: 'Step 1', fields: { firstName: { defaultValue: '' } } },
      },
      // @ts-expect-error "nameTransformCasing" moved to .configure()
      nameTransformCasing: 'camel',
    });
  });
});

describe('defineMultiStepForm: nameTransformCasing', () => {
  it('threads the casing configured via .configure() through to the instance', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
        },
      },
    }).configure({
      nameTransformCasing: 'camel',
    });

    const instance = createForm();

    expect(instance.stepSchema.defaultNameTransformationCasing).toBe('camel');
    expect(instance.stepSchema.value.step1.fields.firstName.label).toBe(
      'firstName',
    );
    expectTypeOf(
      instance.stepSchema.value.step1.fields.firstName.label,
    ).toEqualTypeOf<'firstName'>();
  });

  it('defaults to title casing when omitted', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: { title: 'Step 1', fields: { firstName: { defaultValue: '' } } },
      },
    }).configure();

    const instance = createForm();

    expect(instance.stepSchema.defaultNameTransformationCasing).toBe('title');
    expect(instance.stepSchema.value.step1.fields.firstName.label).toBe(
      'First Name',
    );
    expectTypeOf(
      instance.stepSchema.value.step1.fields.firstName.label,
    ).toEqualTypeOf<'First Name'>();
  });
});

function createBookingDefinition() {
  return defineMultiStepForm({
    steps: {
      step1: {
        title: 'Step 1',
        fields: {
          firstName: {
            defaultValue: '',
          },
        },
      },
      step2: {
        title: 'Step 2',
        fields: {
          service: {
            defaultValue: '',
          },
        },
      },
    },
    instances: ['admin', 'client'],
  });
}

describe('defineMultiStepForm: definition schema surface', () => {
  it('exposes the schema and a type-only exact step union', () => {
    const definition = createBookingDefinition();

    type Step = typeof definition.stepNumbers;

    expectTypeOf<Step>().toEqualTypeOf<'step1' | 'step2'>();
    expect(definition.stepSchema.value.step1.title).toBe('Step 1');
    expect('stepNumbers' in definition).toBe(false);
  });

  it('keeps definition and configured instance state independent', () => {
    const definition = createBookingDefinition();
    const createForm = definition.configure();
    const client = createForm({ instance: 'client' });

    definition.stepSchema.value.step1.update({
      fields: ['fields.firstName.defaultValue'],
      updater: 'Definition',
    });
    client.stepSchema.value.step1.update({
      fields: ['fields.firstName.defaultValue'],
      updater: 'Client',
    });

    expect(definition.stepSchema.getValue('step1', 'firstName')).toBe(
      'Definition',
    );
    expect(client.stepSchema.getValue('step1', 'firstName')).toBe('Client');
  });
});

describe('defineMultiStepForm: instances', () => {
  it('creates independent state per named instance', () => {
    const createForm = createBookingDefinition().configure();

    const client = createForm({ instance: 'client' });
    const admin = createForm({ instance: 'admin' });

    client.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    });

    expect(client.stepSchema.getValue('step1', 'firstName')).toBe('Taylor');
    expect(admin.stepSchema.getValue('step1', 'firstName')).toBe('');
  });

  it('rejects instances that were not declared', () => {
    const createForm = createBookingDefinition().configure();

    // @ts-expect-error "sales" isn't a declared instance
    expect(() => createForm({ instance: 'sales' })).toThrow(
      InvalidInstanceError,
    );
  });

  it('returns the same instance object on repeated factory calls for the same name', () => {
    const createForm = createBookingDefinition().configure();

    const first = createForm({ instance: 'client' });
    const second = createForm({ instance: 'client' });

    expect(first).toBe(second);
  });

  it('creates a single default instance when "instances" is omitted', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: { firstName: { defaultValue: '' } },
        },
      },
    }).configure();

    const instance = createForm();

    expect(instance.instanceName).toBe('default');
  });
});

describe('defineMultiStepForm: storage', () => {
  it('only allocates a real storage backend for configured instances', () => {
    const store = createMockStorage();
    const createForm = createBookingDefinition().configure({
      storage: {
        key: { client: 'booking:client', admin: 'booking:admin' },
        store,
        configure: { instances: ['client'] },
      },
    });

    const client = createForm({ instance: 'client' });
    const admin = createForm({ instance: 'admin' });

    client.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    });
    admin.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Jordan',
    });

    expect(store.getItem('booking:client')).not.toBeNull();
    expect(store.getItem('booking:admin')).toBeNull();
    // admin's in-memory state still updated even though nothing persisted
    expect(admin.stepSchema.getValue('step1', 'firstName')).toBe('Jordan');
  });

  it('resolves a shared string storage key for every configured instance', () => {
    const store = createMockStorage();
    const createForm = createBookingDefinition().configure({
      storage: {
        key: 'shared-key',
        store,
        configure: { instances: ['client', 'admin'] },
      },
    });

    const client = createForm({ instance: 'client' });

    client.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    });

    expect(store.getItem('shared-key')).not.toBeNull();
  });

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

    client.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    });
    admin.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Jordan',
    });

    expect(client.storage.key).toBe('booking:client');
    expect(admin.storage.key).toBe('booking:admin');

    const clientStored = JSON.parse(store.getItem('booking:client')!);
    const adminStored = JSON.parse(store.getItem('booking:admin')!);

    expect(clientStored.step1.fields.firstName.defaultValue).toBe('Taylor');
    expect(adminStored.step1.fields.firstName.defaultValue).toBe('Jordan');

    // re-fetching each instance still resolves to its own key/data, not the other's
    expect(
      createForm({ instance: 'client' }).stepSchema.getValue(
        'step1',
        'firstName',
      ),
    ).toBe('Taylor');
    expect(
      createForm({ instance: 'admin' }).stepSchema.getValue(
        'step1',
        'firstName',
      ),
    ).toBe('Jordan');
  });

  it('throws InvalidInstanceError when the storage key record is missing an entry for a configured instance', () => {
    const store = createMockStorage();
    const createForm = createBookingDefinition().configure({
      storage: {
        // "admin" is configured for storage but has no entry in the key record
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

  it('does not persist when updateStorage returns false for an instance', () => {
    const store = createMockStorage();
    const createForm = createBookingDefinition().configure({
      storage: {
        key: { client: 'booking:client', admin: 'booking:admin' },
        store,
        configure: { instances: ['client', 'admin'] },
      },
      update: {
        updateStorage: (instance) => instance === 'client',
      },
    });

    const client = createForm({ instance: 'client' });
    const admin = createForm({ instance: 'admin' });

    client.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    });
    admin.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Jordan',
    });

    expect(store.getItem('booking:client')).not.toBeNull();
    expect(store.getItem('booking:admin')).toBeNull();
  });

  it('does not persist for any instance when updateStorage is false', () => {
    const store = createMockStorage();
    const createForm = createBookingDefinition().configure({
      storage: {
        key: { client: 'booking:client', admin: 'booking:admin' },
        store,
        configure: { instances: ['client', 'admin'] },
      },
      update: {
        updateStorage: false,
      },
    });

    const client = createForm({ instance: 'client' });
    const admin = createForm({ instance: 'admin' });

    client.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    });
    admin.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Jordan',
    });

    expect(store.getItem('booking:client')).toBeNull();
    expect(store.getItem('booking:admin')).toBeNull();
  });

  it('persists for configured instances when updateStorage is true', () => {
    const store = createMockStorage();
    const createForm = createBookingDefinition().configure({
      storage: {
        key: { client: 'booking:client', admin: 'booking:admin' },
        store,
        configure: { instances: ['client', 'admin'] },
      },
      update: {
        updateStorage: true,
      },
    });

    const client = createForm({ instance: 'client' });
    const admin = createForm({ instance: 'admin' });

    client.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    });
    admin.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Jordan',
    });

    expect(store.getItem('booking:client')).not.toBeNull();
    expect(store.getItem('booking:admin')).not.toBeNull();
  });
});

describe('defineMultiStepForm: withOverrides', () => {
  it('applies overrides independently per instance', async () => {
    const createForm = createBookingDefinition().configure();

    const client = createForm({ instance: 'client' }).withOverrides({
      step1: async () => ({ firstName: 'ClientDefault' }),
    });
    const admin = createForm({ instance: 'admin' }).withOverrides({
      step1: async () => ({ firstName: 'AdminDefault' }),
    });

    await client.stepSchema.resolveStep('step1');
    await admin.stepSchema.resolveStep('step1');

    expect(client.stepSchema.getValue('step1', 'firstName')).toBe(
      'ClientDefault',
    );
    expect(admin.stepSchema.getValue('step1', 'firstName')).toBe(
      'AdminDefault',
    );
  });
});

describe('defineMultiStepForm: shared createHelperFn', () => {
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
      createForm({ instance: 'client' }).stepSchema.getValue(
        'step1',
        'firstName',
      ),
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
