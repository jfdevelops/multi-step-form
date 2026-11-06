import { InvalidImportBindingError } from './error.js';
import { IMPORT_BINDING_KINDS, type ImportBindingKind } from './schema.js';

export interface ImportReference {
  name: string;
  from: string;
  /**
   * How the import is bound in the generated code.
   *
   * @default 'named'
   */
  kind?: ImportBindingKind;
}

/** The binding part of an import statement, e.g. `{ z }`, `* as v` or `Joi`. */
export function createImportBinding(kind: ImportBindingKind, name: string) {
  if (kind === 'named') {
    return `{ ${name} }`;
  }

  if (kind === 'namespace') {
    return `* as ${name}`;
  }

  if (kind === 'default') {
    return name;
  }

  // Reachable from untyped callers, e.g. a definition loaded from JSON.
  throw new InvalidImportBindingError({
    kind,
    name,
    validKinds: [...IMPORT_BINDING_KINDS],
  });
}

/** e.g. `import { z } from 'zod';`, `import * as v from 'valibot';` or `import Joi from 'joi';`. */
export function createImportStatement({
  name,
  from,
  kind = 'named',
}: ImportReference) {
  return `import ${createImportBinding(kind, name)} from '${from}';`;
}
