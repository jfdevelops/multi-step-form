import type { Updater } from '@/steps/types';
import { invariant } from '@/utils/invariant';
import { MultiStepFormLogger } from '@/utils/logger';

export type DefaultStorageKey = typeof DEFAULT_STORAGE_KEY;
export type StorageConfig<TData, TKey extends string> = {
  key: TKey;
  data: TData;
  store?: Storage;
  /**
   * An extra option to throw an error when {@linkcode window} is `undefined`
   * @default false
   */
  throwWhenUndefined?: boolean;
};

const WINDOW_UNDEFINED_MESSAGE =
  '"window" in undefined. No storage is available';
export const DEFAULT_STORAGE_KEY = 'MultiStepForm';

export class MultiStepFormStorage<
  data,
  key extends string = DefaultStorageKey
> {
  readonly key: key;
  readonly store!: Storage;
  readonly data: data;
  private readonly log: MultiStepFormLogger;
  private readonly isWindowUndefined: boolean;
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
      this.isWindowUndefined = false;
    } else if (typeof window !== 'undefined') {
      this.store = window.localStorage;
      this.isWindowUndefined = false;
    } else {
      this.isWindowUndefined = true;
      this.log.warn(WINDOW_UNDEFINED_MESSAGE);
    }
  }

  private throwOnEmptyStore() {
    if (this.throwWhenUndefined) {
      invariant(this.store, () => {
        if (this.isWindowUndefined) {
          return WINDOW_UNDEFINED_MESSAGE;
        }

        return 'No storage available';
      });
    }
  }

  private resolveValue(value: Updater<data>) {
    if (typeof value === 'object') {
      return value;
    }

    if (typeof value === 'function') {
      return (value as (input: data) => data)(this.data);
    }

    this.log.error(
      `The updater value must be a function or object. Was a ${typeof value}`,
      { throw: true }
    );
  }

  hasKey() {
    return this.store.getItem(this.key) !== null;
  }

  get() {
    this.throwOnEmptyStore();

    const item = this.store.getItem(this.key);

    if (item) {
      const parsed = JSON.parse(item);

      return parsed as data;
    }
  }

  remove() {
    this.throwOnEmptyStore();
    this.store.removeItem(this.key);
  }

  add(value: Updater<data>) {
    this.throwOnEmptyStore();

    const resolvedValue = JSON.stringify(this.resolveValue(value));

    this.store.setItem(this.key, resolvedValue);
  }
}
