export type Invariant = <T>(
  condition: T,
  message: string | ((formatter: Intl.ListFormat) => string),
  error?: new (message: string) => Error
) => asserts condition;

/**
 * Creates a lazy message for the invariant function.
 * @param strings The strings to create the message from.
 * @param values The values to insert into the message.
 * @returns The lazy message.
 */
function lazy(strings: TemplateStringsArray, ...values: any[]) {
  return () => String.raw({ raw: strings }, ...values);
}

/**
 * The default invariant function without a prefix.
 */
export const invariant: Invariant = createInvariant();

/**
 * Creates a new invariant function with a prefix.
 * @param prefix The prefix to add to the message.
 * @returns The invariant function.
 */
export function createInvariant(prefix?: string): Invariant {
  return function (condition, message, error = Error) {
    if (!condition) {
      const formatter = new Intl.ListFormat('en', {
        style: 'long',
        type: 'conjunction',
      });
      let resolvedMessage =
        typeof message === 'function' ? message(formatter) : lazy`${message}`();

      if (prefix) {
        resolvedMessage = `${prefix}: ${resolvedMessage}`;
      }

      throw new error(resolvedMessage);
    }
  };
}
