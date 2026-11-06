import { describe, expect, it } from 'vitest';
import { createFormBuilder, createRegistry, generateCode } from '@jfdevelops/multi-step-form-builder-core';
import { describeConformance } from '../../builder-core/test/conformance';
import { zodAdapter } from '../src';

describeConformance(zodAdapter);

describe('zodAdapter', () => {
  it('writes readable zod code', () => {
    const registry = createRegistry({ validators: [zodAdapter] });
    const builder = createFormBuilder({ registry });

    builder.settings.update({ validator: 'zod' });
    builder.fields.add('string.email', undefined, { key: 'email', isRequired: true });
    builder.fields.add('number', undefined, { key: 'age' });

    const code = generateCode(builder.toJSON(), { registry });

    expect(code.source).toContain("import { z } from 'zod';");
    expect(code.source).toContain('const emailPattern = ');
    expect(code.steps[0]!.validator!.code).toBe(
      'z.object({\n  email: z.string("Required").min(1, "Required").regex(emailPattern, "Must be a valid email address"),\n  age: z.number().optional(),\n})',
    );
  });
});
