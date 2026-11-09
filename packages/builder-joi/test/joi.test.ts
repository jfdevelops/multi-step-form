import { describe, expect, it } from 'vitest';
import { createFormBuilder, createRegistry, generateCode } from '@jfdevelops/multi-step-form-builder-core';
import { describeConformance } from '../../builder-core/test/conformance';
import { joiAdapter } from '../src';

describeConformance(joiAdapter);

describe('joiAdapter', () => {
  it('can be chosen as the form library', () => {
    const registry = createRegistry({ validators: [joiAdapter] });
    const builder = createFormBuilder({ registry });

    builder.settings.update({ validator: 'joi' });
    builder.fields.add({ type: 'string.email', key: 'email', isRequired: true });

    const code = generateCode(builder.toJSON(), { registry });

    expect(builder.getSnapshot().issues).toEqual([]);
    expect(code.packages).toContain('joi');
    expect(code.steps[0]!.library).toBe('joi');
  });
});
