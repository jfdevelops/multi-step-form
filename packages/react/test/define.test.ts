import { describe, expect, it } from 'vitest';
import { InvalidInstanceError, NoActiveInstanceError } from '@jfdevelops/multi-step-form-core';
import { defineMultiStepForm } from '../src';

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

    expect(createForm().stepSchema.defaultNameTransformationCasing).toBe('camel');
  });
});

describe('react defineMultiStepForm: instances', () => {
  it('creates independent state per named instance', () => {
    const createForm = createBookingDefinition().configure();

    const client = createForm({ instance: 'client' });
    const admin = createForm({ instance: 'admin' });

    // NOTE: react's step-schema generics resolve to `{}`/`never` when instantiated through this
    // factory chain (the same pre-existing inference gap documented elsewhere in this package's
    // tests, unrelated to instances/overrides) — `as never` sidesteps it; runtime is unaffected.
    client.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    } as never);

    expect(client.stepSchema.getValue('step1' as never, 'firstName' as never)).toBe('Taylor');
    expect(admin.stepSchema.getValue('step1' as never, 'firstName' as never)).toBe('');
  });

  it('rejects instances that were not declared', () => {
    const createForm = createBookingDefinition().configure();

    // @ts-expect-error "sales" isn't a declared instance
    expect(() => createForm({ instance: 'sales' })).toThrow(InvalidInstanceError);
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

    client.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    } as never);
    admin.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Jordan',
    } as never);

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
    expect(() => createForm({ instance: 'admin' })).toThrow(InvalidInstanceError);
  });
});

describe('react defineMultiStepForm: withOverrides', () => {
  it('applies overrides independently per instance and preserves react schema behavior', async () => {
    const createForm = createBookingDefinition().configure();

    const client = createForm({ instance: 'client' }).withOverrides({
      step1: async () => ({ firstName: 'ClientDefault' }),
    });

    await client.stepSchema.resolveStep('step1' as never);

    expect(client.stepSchema.getValue('step1' as never, 'firstName' as never)).toBe(
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
      } as never);
    });

    createForm({ instance: 'client' });
    setFirstName();

    expect(
      createForm({ instance: 'client' }).stepSchema.getValue(
        'step1' as never,
        'firstName' as never,
      ),
    ).toBe('Riley');
  });

  it('throws NoActiveInstanceError when no instance has been created', () => {
    const createForm = createBookingDefinition().configure();
    const setFirstName = createForm.step1.createHelperFn(({ update }) => {
      update.step1({
        fields: ['fields.firstName.defaultValue'],
        updater: 'Riley',
      } as never);
    });

    expect(() => setFirstName()).toThrow(NoActiveInstanceError);
  });
});
