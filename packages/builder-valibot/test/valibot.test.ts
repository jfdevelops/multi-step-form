import { describe, expect, it } from 'vitest';
import { createFormBuilder, createRegistry, generateCode } from '@jfdevelops/multi-step-form-builder-core';
import { describeConformance } from '../../builder-core/test/conformance';
import { valibotAdapter } from '../src';

describeConformance(valibotAdapter);

describe('valibotAdapter', () => {
  it('can be chosen as the form library', () => {
    const registry = createRegistry({ validators: [valibotAdapter] });
    const builder = createFormBuilder({ registry });

    builder.settings.update({ validator: 'valibot' });
    builder.fields.add('string.email', undefined, { key: 'email', isRequired: true });

    const code = generateCode(builder.toJSON(), { registry });

    expect(builder.getSnapshot().issues).toEqual([]);
    expect(code.packages).toContain('valibot');
    expect(code.steps[0]!.library).toBe('valibot');
  });
});
