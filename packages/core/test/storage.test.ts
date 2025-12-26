import { beforeEach, describe, expect, it } from 'vitest';
import { MultiStepFormStorage } from '../src/storage';
import { createMockStorage } from './utils/create-mock-storage';

// Create a mock storage that doesn't persist between tests


describe('MultiStepFormStorage', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  describe('add and get', () => {
    it('should store and retrieve a primitive string value', () => {
      const storage = new MultiStepFormStorage({
        key: 'test-key',
        data: '',
        store: mockStorage,
      });

      const testValue = 'hello world';
      storage.add(testValue);
      const retrieved = storage.get();

      expect(retrieved).toBe(testValue);
    });

    it('should store and retrieve a primitive number value', () => {
      const storage = new MultiStepFormStorage({
        key: 'test-key',
        data: 0,
        store: mockStorage,
      });

      const testValue = 42;
      storage.add(testValue);
      const retrieved = storage.get();

      expect(retrieved).toBe(testValue);
    });

    it('should store and retrieve a primitive boolean value', () => {
      const storage = new MultiStepFormStorage({
        key: 'test-key',
        data: false,
        store: mockStorage,
      });

      const testValue = true;
      storage.add(testValue);
      const retrieved = storage.get();

      expect(retrieved).toBe(testValue);
    });

    it('should store and retrieve null', () => {
      const storage = new MultiStepFormStorage({
        key: 'test-key',
        data: null,
        store: mockStorage,
      });

      const testValue = null;
      storage.add(testValue);
      const retrieved = storage.get();

      expect(retrieved).toBe(testValue);
    });

    it('should store and retrieve a simple object', () => {
      const storage = new MultiStepFormStorage({
        key: 'test-key',
        data: {},
        store: mockStorage,
      });

      const testValue = { name: 'John', age: 30 };
      storage.add(testValue);
      const retrieved = storage.get();

      expect(retrieved).toEqual(testValue);
    });

    it('should store and retrieve a nested object', () => {
      const storage = new MultiStepFormStorage({
        key: 'test-key',
        data: {},
        store: mockStorage,
      });

      const testValue = {
        user: {
          name: 'John',
          address: {
            street: '123 Main St',
            city: 'New York',
          },
        },
      };
      storage.add(testValue);
      const retrieved = storage.get();

      expect(retrieved).toEqual(testValue);
    });

    it('should store and retrieve an array of primitives', () => {
      const storage = new MultiStepFormStorage({
        key: 'test-key',
        data: [] as number[],
        store: mockStorage,
      });

      const testValue = [1, 2, 3, 4, 5];
      storage.add(testValue);
      const retrieved = storage.get();

      expect(retrieved).toEqual(testValue);
    });

    it('should store and retrieve an array of objects', () => {
      const storage = new MultiStepFormStorage({
        key: 'test-key',
        data: [] as Array<{ id: number; name: string }>,
        store: mockStorage,
      });

      const testValue = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ];
      storage.add(testValue);
      const retrieved = storage.get();

      expect(retrieved).toEqual(testValue);
    });

    it('should store and retrieve a complex nested structure', () => {
      const storage = new MultiStepFormStorage({
        key: 'test-key',
        data: {},
        store: mockStorage,
      });

      const testValue = {
        users: [
          {
            id: 1,
            name: 'Alice',
            preferences: {
              theme: 'dark',
              notifications: true,
            },
          },
          {
            id: 2,
            name: 'Bob',
            preferences: {
              theme: 'light',
              notifications: false,
            },
          },
        ],
        metadata: {
          version: '1.0.0',
          timestamp: 1234567890,
        },
      };
      storage.add(testValue);
      const retrieved = storage.get();

      expect(retrieved).toEqual(testValue);
    });

    it('should store and retrieve data with special characters in strings', () => {
      const storage = new MultiStepFormStorage({
        key: 'test-key',
        data: {} as { message: string; symbols: string },
        store: mockStorage,
      });

      const testValue = {
        message: 'Hello "world" with \'quotes\' and\nnewlines\tand\ttabs',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      };
      storage.add(testValue);
      const retrieved = storage.get();

      expect(retrieved).toEqual(testValue);
    });

    it('should store and retrieve data with function updater', () => {
      const storage = new MultiStepFormStorage({
        key: 'test-key',
        data: { count: 0 },
        store: mockStorage,
      });

      storage.add((prev) => ({ count: prev.count + 1 }));
      const retrieved = storage.get();

      expect(retrieved).toEqual({ count: 1 });
    });

    it('should return undefined when getting a non-existent key', () => {
      const storage = new MultiStepFormStorage({
        key: 'non-existent-key',
        data: null,
        store: mockStorage,
      });

      const retrieved = storage.get();
      expect(retrieved).toBeUndefined();
    });

    it('should overwrite existing data when adding new data', () => {
      const storage = new MultiStepFormStorage({
        key: 'test-key',
        data: {},
        store: mockStorage,
      });

      storage.add({ first: 'value' });
      storage.add({ second: 'value' });
      const retrieved = storage.get();

      expect(retrieved).toEqual({ second: 'value' });
      expect(retrieved).not.toEqual({ first: 'value' });
    });
  });
});
