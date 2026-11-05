import { describe, it, expect } from 'vitest';
import { path } from '../src/utils/path';

describe('path.equalsAtPaths', () => {
  it('returns ok for matching scalar value at a single path', () => {
    const def = {
      name: 'Alice',
      age: 30,
    };

    const result = path.equalsAtPaths(def, ['name'], 'Alice');

    expect(result.ok).toBe(true);
    expect(result.mismatches).toHaveLength(0);
  });

  it('treats arrays of the same element type as equal even when values differ', () => {
    const def = {
      tags: [1, 2, 3],
    };

    // Same element "type" (numbers), different concrete values
    const result = path.equalsAtPaths(def, ['tags'], [10, 20, 30]);

    expect(result.ok).toBe(true);
    expect(result.mismatches).toHaveLength(0);
  });

  it('reports type mismatches for array elements of different types', () => {
    const def = {
      tags: [1, 2, 3],
    };

    const result = path.equalsAtPaths(def, ['tags'], ['a', 'b', 'c'] as any);

    expect(result.ok).toBe(false);
    expect(result.mismatches.length).toBeGreaterThan(0);

    // All mismatches should be type mismatches under the "tags" array path
    for (const m of result.mismatches) {
      expect(m.reason).toBe('type-mismatch');
      expect(m.path.startsWith('tags[')).toBe(true);
    }
  });

  it('reports a type mismatch when expected is an array and actual is not', () => {
    const def = {
      tags: [1, 2, 3],
    };

    const result = path.equalsAtPaths(def, ['tags'], 'not-an-array' as any);

    expect(result.ok).toBe(false);
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0]?.reason).toBe('type-mismatch');
    expect(result.mismatches[0]?.path).toBe('tags');
  });
});

it('should normalize the given paths', () => {
  const onlyDeepest = path.normalizePaths('foo', 'foo.bar', 'foo.bar.baz');
  expect(onlyDeepest).toStrictEqual(['foo.bar.baz']);

  const withOther = path.normalizePaths('other', 'foo.bar', 'foo.bar.baz');
  expect(withOther).toStrictEqual(['other', 'foo.bar.baz']);

  const withOtherAndParent = path.normalizePaths('other', 'foo');
  expect(withOtherAndParent).toStrictEqual(['foo', 'other']);

  const onlyParent = path.normalizePaths('foo');
  expect(onlyParent).toStrictEqual(['foo']);
});

it('should return the part of the object specified by the path', () => {
  const obj = {
    foo: {
      bar: {
        baz: 42,
        qux: 'hello',
      },
    },
    other: 'test',
  };

  // Single path: should get value at path
  expect(path.pickBy(obj, 'foo.bar.baz')).toBe(42);
  expect(path.pickBy(obj, 'other')).toBe('test');

  // Nested object: should get object at path
  expect(path.pickBy(obj, 'foo.bar')).toEqual({
    baz: 42,
    qux: 'hello',
  });

  // Multiple paths: should get intersected object at root
  expect(path.pickBy(obj, 'foo.bar', 'other')).toEqual({
    foo: { bar: { baz: 42, qux: 'hello' } },
    other: 'test',
  });

  expect(path.pickBy(obj, 'foo.bar.baz', 'foo.bar')).toEqual(42);

  // Multiple non-overlapping deep paths
  const obj2 = {
    a: { b: { c: 1 } },
    x: { y: 2 },
  };
  expect(path.pickBy(obj2, 'a.b.c', 'x.y')).toEqual({
    a: { b: { c: 1 } },
    x: { y: 2 },
  });
});

describe('path.updateAt with partial merge', () => {
  it('preserves array type when merging arrays', () => {
    const obj = {
      items: [1, 2, 3],
    };

    const result = path.updateAt({
      obj,
      paths: ['items'],
      value: [4, 5] as any,
      partial: true,
    });

    expect(result.items).toBeInstanceOf(Array);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toEqual([1, 2, 3, 4, 5]);
  });

  it('merges arrays element-wise when both are arrays', () => {
    const obj = {
      items: [
        { id: 1, name: 'Item 1', extra: 'preserved' },
        { id: 2, name: 'Item 2', extra: 'preserved' },
        { id: 3, name: 'Item 3', extra: 'preserved' },
      ],
    };

    const result = path.updateAt({
      obj,
      paths: ['items'],
      value: [
        { id: 1, name: 'Updated Item 1' },
        { id: 2, name: 'Updated Item 2' },
      ] as any,
      partial: true,
    });

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      id: 1,
      name: 'Updated Item 1',
      extra: 'preserved',
    });
    expect(result.items[1]).toEqual({
      id: 2,
      name: 'Updated Item 2',
      extra: 'preserved',
    });
  });

  it('deep merges objects while preserving structure', () => {
    const obj = {
      user: {
        name: 'John',
        age: 30,
        address: {
          street: '123 Main St',
          city: 'New York',
          country: 'USA',
        },
      },
    };

    const result = path.updateAt({
      obj,
      paths: ['user'],
      value: {
        name: 'Jane',
        address: {
          city: 'Los Angeles',
        },
      } as any,
      partial: true,
    });

    expect(result.user).toEqual({
      name: 'Jane',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'Los Angeles',
        country: 'USA',
      },
    });
  });

  it('merges nested arrays of objects correctly', () => {
    const obj = {
      sections: [
        {
          title: 'Section 1',
          items: [
            { id: 1, name: 'Item A', meta: 'preserved' },
            { id: 2, name: 'Item B', meta: 'preserved' },
          ],
        },
        {
          title: 'Section 2',
          items: [{ id: 3, name: 'Item C', meta: 'preserved' }],
        },
      ],
    };

    const result = path.updateAt({
      obj,
      paths: ['sections'],
      value: [
        {
          title: 'Updated Section 1',
          items: [{ id: 1, name: 'Updated Item A' }],
        },
      ],
      partial: true,
    });

    expect(Array.isArray(result.sections)).toBe(true);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe('Updated Section 1');
    expect(Array.isArray(result.sections[0].items)).toBe(true);
    expect(result.sections[0].items[0]).toEqual({
      id: 1,
      name: 'Updated Item A',
      meta: 'preserved',
    });
  });

  it('preserves primitive values when merging', () => {
    const obj = {
      name: 'John',
      age: 30,
      active: true,
    };

    const result = path.updateAt({
      obj,
      paths: ['name'],
      value: 'Jane' as any,
      partial: true,
    });

    expect(result.name).toBe('Jane');
    expect(typeof result.name).toBe('string');
  });

  it('handles mixed array and object structures', () => {
    const obj = {
      data: {
        users: [
          { id: 1, name: 'Alice', role: 'admin' },
          { id: 2, name: 'Bob', role: 'user' },
        ],
        settings: {
          theme: 'dark',
          language: 'en',
        },
      },
    };

    const result = path.updateAt({
      obj,
      paths: ['data'],
      value: {
        users: [{ id: 1, name: 'Alice Updated' }],
        settings: {
          theme: 'light',
        },
      } as any,
      partial: true,
    });

    expect(Array.isArray(result.data.users)).toBe(true);
    expect(result.data.users[0]).toEqual({
      id: 1,
      name: 'Alice Updated',
      role: 'admin',
    });
    expect(result.data.settings).toEqual({
      theme: 'light',
      language: 'en',
    });
  });

  it('handles empty arrays correctly', () => {
    const obj = {
      items: [{ id: 1, name: 'Item 1' }],
    };

    const result = path.updateAt({
      obj,
      paths: ['items'],
      value: [] as any,
      partial: true,
    });

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toHaveLength(0);
  });

  it('handles arrays with missing target elements', () => {
    const obj = {
      items: [
        { id: 1, name: 'Item 1', extra: 'preserved' },
        { id: 2, name: 'Item 2', extra: 'preserved' },
      ],
    };

    const result = path.updateAt({
      obj,
      paths: ['items'],
      value: [{ id: 1, name: 'Updated Item 1' }] as any,
      partial: true,
    });

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      id: 1,
      name: 'Updated Item 1',
      extra: 'preserved',
    });
  });

  it('handles deeply nested structures with arrays and objects', () => {
    const obj = {
      config: {
        features: [
          {
            name: 'Feature 1',
            settings: {
              enabled: true,
              priority: 'high',
              metadata: { version: '1.0' },
            },
          },
          {
            name: 'Feature 2',
            settings: {
              enabled: false,
              priority: 'medium',
              metadata: { version: '2.0' },
            },
          },
        ],
      },
    };

    const result = path.updateAt({
      obj,
      paths: ['config'],
      value: {
        features: [
          {
            name: 'Updated Feature 1',
            settings: {
              enabled: false,
              metadata: { version: '1.1' },
            },
          },
        ],
      } as any,
      partial: true,
    });

    expect(Array.isArray(result.config.features)).toBe(true);
    expect(result.config.features).toHaveLength(1);
    expect(result.config.features[0]).toEqual({
      name: 'Updated Feature 1',
      settings: {
        enabled: false,
        priority: 'high',
        metadata: { version: '1.1' },
      },
    });
  });

  it('handles multiple paths with arrays and objects', () => {
    const obj = {
      users: [{ id: 1, name: 'Alice' }],
      settings: { theme: 'dark' },
    };

    const result = path.updateAt({
      obj,
      paths: ['users', 'settings'],
      value: {
        users: [{ id: 1, name: 'Alice Updated' }],
        settings: { language: 'en' },
      } as any,
      partial: true,
    });

    expect(Array.isArray(result.users)).toBe(true);
    expect(result.users[0]).toEqual({
      id: 1,
      name: 'Alice Updated',
    });
    expect(result.settings).toEqual({
      theme: 'dark',
      language: 'en',
    });
  });
});
