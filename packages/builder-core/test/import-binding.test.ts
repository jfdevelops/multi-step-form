import { MultiStepFormError } from '@jfdevelops/multi-step-form-core';
import { describe, expect, it } from 'vitest';
import {
  createImportBinding,
  createImportStatement,
  InvalidImportBindingError,
  type ImportBindingKind,
} from '../src';

describe('createImportStatement', () => {
  it('binds the module by kind, named by default', () => {
    expect(createImportStatement({ name: 'z', from: 'zod' })).toBe(
      "import { z } from 'zod';",
    );
    expect(
      createImportStatement({ name: 'v', from: 'valibot', kind: 'namespace' }),
    ).toBe("import * as v from 'valibot';");
    expect(
      createImportStatement({ name: 'Joi', from: 'joi', kind: 'default' }),
    ).toBe("import Joi from 'joi';");
  });
});

describe('createImportBinding', () => {
  it('throws an InvalidImportBindingError for an unknown kind', () => {
    // e.g. a definition loaded from JSON, which the types cannot check.
    const kind = 'side-effect' as ImportBindingKind;

    expect(() => createImportBinding(kind, 'z')).toThrow(
      InvalidImportBindingError,
    );

    try {
      createImportBinding(kind, 'z');
    } catch (error) {
      expect(error).toBeInstanceOf(MultiStepFormError);

      if (error instanceof InvalidImportBindingError) {
        expect(error.code).toBe('invalidImportBinding');
        expect(error.context).toStrictEqual({
          scope: 'importBinding',
          kind: 'side-effect',
          name: 'z',
          validKinds: ['named', 'namespace', 'default'],
        });
        expect(error.message).toBe(
          '[importBinding]: Cannot import "z" with binding kind "side-effect". Use "named", "namespace", or "default".',
        );
      }
    }
  });
});
