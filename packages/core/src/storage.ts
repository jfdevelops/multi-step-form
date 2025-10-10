import { invariant, logger } from '@multi-step-form/runtime-utils';
import type { Updater } from '@multi-step-form/shared-utils';
export type StorageConfig<TKey extends string, TData> = {
  key: TKey;
  data: TData;
  store?: Storage;
};

const WINDOW_UNDEFINED_MESSAGE =
  '"window" in undefined. No storage is available';

export class MultiStepFormStorage<key extends string, data> {
  readonly key: key;
  readonly store!: Storage;
  readonly data: data;
  private readonly log: logger.MultiStepFormLogger;
  private readonly isWindowUndefined: boolean;

  constructor(config: StorageConfig<key, data>) {
    const { key, data, store } = config;

    this.log = new logger.MultiStepFormLogger({
      prefix: 'MultiStepFormStorage',
    });
    this.key = key;
    this.data = data;

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
    invariant(this.store, () => {
      if (this.isWindowUndefined) {
        return WINDOW_UNDEFINED_MESSAGE;
      }

      return 'No storage available';
    });
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

  /**
   * Retrieves a value from storage.
   *
   * @returns The parsed value stored under the default storage key.
   * @throws {Error} if no storage is available.
   *
   * @example
   * const data = storage.get<MyType>();
   */
  /**
   * Retrieves a value from storage by a specific key.
   *
   * @param key - The key to retrieve the value for.
   * @returns The parsed value stored under the provided key.
   * @throws {Error} if no storage is available.
   *
   * @example
   * const data = storage.get<MyType>('customKey');
   */
  get<value>(): value;
  get<value>(key: string): value;
  get(key?: string) {
    this.throwOnEmptyStore();

    const item = this.store.getItem(key ?? this.key);

    if (item) {
      const parsed = JSON.parse(item);

      return parsed;
    }
  }

  remove(): void;
  remove(key: string): void;
  remove(key?: string) {
    this.throwOnEmptyStore();
    this.store.removeItem(key ?? this.key);
  }

  /**
   * Adds or updates the value stored under the default storage key.
   *
   * @param value - The updater value, which can be an object or a function that receives the current data and returns the new data.
   * @throws {Error} if no storage is available.
   *
   * @example
   * storage.add({ foo: 'bar' });
   * // OR
   * storage.add((current) => ({ ...current, foo: 'bar' }));
   */
  add(value: Updater<data>): void;
  /**
   * Adds or updates the value stored under the provided key.
   *
   * @param key - The key to store the value under.
   * @param value - The updater value, which can be an object or a function that receives the current data and returns the new data.
   * @throws {Error} if no storage is available.
   *
   * @example
   * storage.add('customKey', { foo: 'bar' });
   * // OR
   * storage.add('customKey', (current) => ({ ...current, foo: 'bar' }));
   */
  add(key: string, value: Updater<data>): void;
  add(keyOrValue: string | Updater<data>, value?: Updater<data>) {
    this.throwOnEmptyStore();

    if (typeof keyOrValue === 'string') {
      invariant(
        value,
        'An updater is required. It can an object or a function'
      );

      const resolvedValue = JSON.stringify(this.resolveValue(value));

      this.store.setItem(keyOrValue, resolvedValue);
    } else {
      invariant(
        keyOrValue,
        'An updater is required. It can an object or a function'
      );

      const resolvedValue = JSON.stringify(this.resolveValue(keyOrValue));

      this.store.setItem(this.key, resolvedValue);
    }
  }
}
