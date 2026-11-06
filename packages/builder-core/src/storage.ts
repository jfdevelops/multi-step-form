import type { FormDefinition } from './definition.js';

export interface BuilderSaveContext {
  /** The revision the edits were based on, so a server can reject stale saves. */
  baseRevision: number;
}

/** Where a builder loads and saves definitions. */
export interface BuilderStorage {
  load?(formId: string): Promise<FormDefinition | undefined>;
  /** Persists a definition. Return the stored revision to keep the builder in sync. */
  save(
    definition: FormDefinition,
    context: BuilderSaveContext,
  ): Promise<{ revision: number } | void>;
}

/** Keeps definitions in memory. Useful for tests and prototypes. */
export function createMemoryStorage(
  initial: readonly FormDefinition[] = [],
): BuilderStorage & { readonly definitions: ReadonlyMap<string, FormDefinition> } {
  const definitions = new Map(initial.map((definition) => [definition.id, definition]));

  return {
    definitions,
    async load(formId) {
      return definitions.get(formId);
    },
    async save(definition) {
      const revision = (definitions.get(definition.id)?.revision ?? 0) + 1;
      definitions.set(definition.id, { ...definition, revision });

      return { revision };
    },
  };
}

export interface LocalStorageAdapterOptions {
  /** The key prefix. The form id is appended. @default 'msf-builder:' */
  prefix?: string;
  /** Defaults to `globalThis.localStorage`. */
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

/** Saves definitions to `localStorage` (or any `Storage`-like object). */
export function createLocalStorageAdapter(
  options: LocalStorageAdapterOptions = {},
): BuilderStorage {
  const prefix = options.prefix ?? 'msf-builder:';
  const getStorage = () => {
    const storage = options.storage ?? globalThis.localStorage;

    if (!storage) {
      throw new TypeError('localStorage is not available in this environment');
    }

    return storage;
  };

  return {
    async load(formId) {
      const raw = getStorage().getItem(prefix + formId);

      return raw ? (JSON.parse(raw) as FormDefinition) : undefined;
    },
    async save(definition) {
      const revision = definition.revision + 1;
      getStorage().setItem(
        prefix + definition.id,
        JSON.stringify({ ...definition, revision }),
      );

      return { revision };
    },
  };
}
