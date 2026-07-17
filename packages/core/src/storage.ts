import type { Updater } from '@/utils/types';
import { InvalidStorageError } from '@/errors/invalid-storage';
import { MultiStepFormLogger } from '@/utils/logger';

export type DefaultStorageKey = typeof DEFAULT_STORAGE_KEY;
export interface BaseStorageConfig<TKey extends string> {
  key: TKey;
  store?: Storage;
  /**
  * An extra option to throw an error when {@linkcode window} is `undefined`
  * @default false
  */
  throwWhenUndefined?: boolean;
}
export type StorageConfig<
TData,
TKey extends string
> = BaseStorageConfig<TKey> & {
  data: TData;
};

const WINDOW_UNDEFINED_MESSAGE =
'"window" in undefined. No storage is available';
export const DEFAULT_STORAGE_KEY = 'MultiStepForm';

/**
* Converts Date strings back to Date objects for fields with type: 'date'.
*/
function convertDateStringsToDates(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== 'object') {
    return parsed;
  }

  const converted = Array.isArray(parsed) ? [...parsed] : { ...parsed };

  // Iterate through each step
  for (const [stepKey, stepValue] of Object.entries(converted)) {
    if (
      !stepValue ||
      typeof stepValue !== 'object' ||
      !('fields' in stepValue) ||
      typeof stepValue.fields !== 'object'
    ) {
      continue;
    }

    const fields = { ...(stepValue.fields as Record<string, unknown>) };
    let hasChanges = false;

    // Iterate through each field
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      if (
        !fieldValue ||
        typeof fieldValue !== 'object' ||
        !('type' in fieldValue) ||
        !('defaultValue' in fieldValue)
      ) {
        continue;
      }

      // Check if field has type: 'date' and defaultValue is a string
      if (
        fieldValue.type === 'date' &&
        typeof fieldValue.defaultValue === 'string'
      ) {
        // Convert string to Date
        const dateValue = new Date(fieldValue.defaultValue);

        // Only convert if it's a valid date
        if (!Number.isNaN(dateValue.getTime())) {
          fields[fieldName] = {
            ...fieldValue,
            defaultValue: dateValue,
          };
          hasChanges = true;
        }
      }
    }

    // Update the step with converted fields if there were changes
    if (hasChanges) {
      (converted as Record<string, unknown>)[stepKey] = {
        ...stepValue,
        fields,
      };
    }
  }

  return converted;
}

export class MultiStepFormStorage<
data,
key extends string = DefaultStorageKey
> {
  readonly key: key;
  readonly store!: Storage;
  readonly data: data;
  private readonly log: MultiStepFormLogger;
  private readonly shouldRunActions: boolean;
  private readonly throwWhenUndefined: boolean;

  constructor(config: StorageConfig<data, key>) {
    const { key, data, store, throwWhenUndefined = false } = config;

    this.log = new MultiStepFormLogger({
      prefix: DEFAULT_STORAGE_KEY,
    });
    this.key = key;
    this.data = data;
    this.throwWhenUndefined = throwWhenUndefined;

    if (store) {
      this.store = store;
      this.shouldRunActions = true;

      if (typeof window === 'undefined') {
        // this.shouldRunActions = false;
        this.log.warn(WINDOW_UNDEFINED_MESSAGE);
      }
    } else if (typeof window !== 'undefined') {
      this.store = window.localStorage;
      this.shouldRunActions = true;
    } else {
      this.shouldRunActions = false;
      this.log.warn(WINDOW_UNDEFINED_MESSAGE);
    }
  }

  private throwOnEmptyStore() {
    if (!this.throwWhenUndefined) {
      return;
    }

    InvalidStorageError.invariant(this.store, {
      reason: this.shouldRunActions
        ? WINDOW_UNDEFINED_MESSAGE
        : 'No storage available',
      key: this.key,
      operation: 'access',
    });
  }

  private resolveValue(value: Updater<data>) {
    if (typeof value === 'function') {
      return (value as (input: data) => data)(this.data);
    }

    return value;
  }

  hasKey() {
    return this.store.getItem(this.key) !== null;
  }

  get() {
    this.throwOnEmptyStore();

    if (!this.shouldRunActions) {
      return;
    }

    const item = this.store.getItem(this.key);

    if (item) {
      const parsed = JSON.parse(item);
      const converted = convertDateStringsToDates(parsed);

      return converted as data;
    }
  }

  remove() {
    this.throwOnEmptyStore();

    if (!this.shouldRunActions) {
      return;
    }

    this.store.removeItem(this.key);
  }

  add(value: Updater<data>) {
    this.throwOnEmptyStore();

    if (!this.shouldRunActions) {
      return;
    }

    const resolvedValue = JSON.stringify(this.resolveValue(value));

    this.store.setItem(this.key, resolvedValue);
  }
}
