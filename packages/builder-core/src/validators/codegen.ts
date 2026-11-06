import type { SchemaCheck, SchemaNode } from '../schema.js';
import { compilePattern, defaultCheckMessage, isUrl, PATTERNS } from './checks.js';
import { createExpr } from './expr.js';

/** A check as a predicate: a runtime test and the same test as code over `value`. */
export interface CheckPredicate {
  test: (value: unknown) => boolean;
  /** An expression over a variable named `value`, e.g. `value.length >= 8`. */
  code: string;
}

const IS_URL_CODE =
  '(value) => {\n  try {\n    new URL(value);\n    return true;\n  } catch {\n    return false;\n  }\n}';

function toTime(value: unknown) {
  if (value instanceof Date) return value.getTime();

  return typeof value === 'string' || typeof value === 'number' ? new Date(value).getTime() : Number.NaN;
}

function lengthOf(value: unknown) {
  return typeof value === 'string' || Array.isArray(value) ? value.length : Number.NaN;
}

function matches(pattern: RegExp, value: unknown) {
  return typeof value === 'string' && pattern.test(value);
}

/**
 * Shared pieces for an adapter's build function: messages, the shared patterns, top-level
 * declarations the emitted code needs, and checks as predicates. Create one per build.
 */
export function createCodegen() {
  const declarations = new Map<string, string>();

  /** Records `const name = code;` and returns `runtime` as an expression printed as `name`. */
  function declare<T>(name: string, runtime: T, code: string): T {
    if (!declarations.has(name)) declarations.set(name, `const ${name} = ${code};`);

    return createExpr(runtime, name);
  }

  const codegen = {
    /** The declarations recorded so far. */
    declarations: () => [...declarations.values()],
    declare,
    /** A function that runs as `runtime` and is written as `code`. */
    fn: <T>(runtime: T, code: string): T => createExpr(runtime, code),
    /** A check's message: its own, else the default. */
    message: (check: SchemaCheck, node?: SchemaNode) => check.message ?? defaultCheckMessage(check, node),
    /** A `pattern` check's regular expression. Unusable patterns are reported by `supports`. */
    pattern(check: Extract<SchemaCheck, { check: 'pattern' }>) {
      const compiled = compilePattern(check);

      if (typeof compiled === 'string') throw new TypeError(compiled);

      return compiled;
    },
    /** The email pattern every adapter uses, declared as `emailPattern`. */
    get email() {
      return declare('emailPattern', PATTERNS.email, String(PATTERNS.email));
    },
    /** The UUID pattern every adapter uses, declared as `uuidPattern`. */
    get uuid() {
      return declare('uuidPattern', PATTERNS.uuid, String(PATTERNS.uuid));
    },
    /** `(value) => boolean`, declared as `isUrl`. */
    get isUrl() {
      return declare('isUrl', isUrl, IS_URL_CODE);
    },
    /** A check as a predicate, for libraries without a built-in equivalent. */
    predicate(check: Exclude<SchemaCheck, { check: 'equalsField' }>, node: SchemaNode): CheckPredicate {
      const date = node.kind === 'date';

      switch (check.check) {
        case 'minLength':
          return { test: (value) => lengthOf(value) >= check.value, code: `value.length >= ${check.value}` };
        case 'maxLength':
          return { test: (value) => lengthOf(value) <= check.value, code: `value.length <= ${check.value}` };
        case 'length':
          return { test: (value) => lengthOf(value) === check.value, code: `value.length === ${check.value}` };
        case 'min':
          return date
            ? {
                test: (value) => toTime(value) >= toTime(check.value),
                code: `value.getTime() >= new Date(${JSON.stringify(check.value)}).getTime()`,
              }
            : { test: (value) => Number(value) >= Number(check.value), code: `value >= ${Number(check.value)}` };
        case 'max':
          return date
            ? {
                test: (value) => toTime(value) <= toTime(check.value),
                code: `value.getTime() <= new Date(${JSON.stringify(check.value)}).getTime()`,
              }
            : { test: (value) => Number(value) <= Number(check.value), code: `value <= ${Number(check.value)}` };
        case 'integer':
          return { test: (value) => Number.isInteger(value), code: 'Number.isInteger(value)' };
        case 'email':
          void codegen.email;
          return { test: (value) => matches(PATTERNS.email, value), code: 'emailPattern.test(value)' };
        case 'uuid':
          void codegen.uuid;
          return { test: (value) => matches(PATTERNS.uuid, value), code: 'uuidPattern.test(value)' };
        case 'url':
          void codegen.isUrl;
          return { test: isUrl, code: 'isUrl(value)' };
        case 'pattern': {
          const pattern = codegen.pattern(check);
          return { test: (value) => matches(pattern, value), code: `${String(pattern)}.test(value)` };
        }
      }
    },
  };

  return codegen;
}

export type Codegen = ReturnType<typeof createCodegen>;
