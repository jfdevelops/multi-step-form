export function comparePartialArray<T>(
  compareArray: T[],
  actualArray: T[],
  formatter?: Intl.ListFormat
): { status: 'success' } | { status: 'error'; errors: string[] } {
  const errors: string[] = [];
  const compareSet = new Set(compareArray);
  const printedArray = formatter
    ? formatter.format(compareArray.map((value) => `${value}`))
    : `[${compareArray.join(', ')}]`;

  // Check extras: elements in b that aren't in a
  for (let i = 0; i < actualArray.length; i++) {
    const value = actualArray[i];
    if (!compareSet.has(value)) {
      errors.push(
        `Extra element at index ${i}: "${value}" is not in ${printedArray}`
      );
    }
  }

  // Check that at least one element from a is present in b
  const hasAtLeastOne = actualArray.some((v) => compareSet.has(v));
  if (!hasAtLeastOne) {
    errors.push(
      `Array must contain at least one valid element from ${printedArray}`
    );
  }

  if (errors.length > 0) {
    return { status: 'error', errors };
  }

  return { status: 'success' };
}

export function printErrors<T>(
  errors: T[],
  mapper?: (value: T, index: number) => string
) {
  const defaultMapper = (e: unknown, i: number) => `❌ ${i + 1}. ${e}`;
  return errors.map((e, i) => mapper?.(e, i) ?? defaultMapper(e, i)).join('\n');
}

export function typedObjectKeys<T extends Record<string, unknown>, TOverrideKey = keyof T>(value: T) {
  return Object.keys(value) as Array<TOverrideKey>;
}
