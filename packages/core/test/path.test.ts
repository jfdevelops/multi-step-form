import { describe, it, expect } from 'vitest';
import { path } from '../src/utils/path';

describe('path.equalsAtPaths', () => {
  it('is just another temp test', () => {
    const def = {}
  })
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
