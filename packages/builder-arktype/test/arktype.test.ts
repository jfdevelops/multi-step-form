import { describe, expect, it } from 'vitest';
import { createFormBuilder, createRegistry, generateCode } from '@jfdevelops/multi-step-form-builder-core';
import { describeConformance } from '../../builder-core/test/conformance';
import { arktypeAdapter } from '../src';

describeConformance(arktypeAdapter);

describe('arktypeAdapter', () => {
  it('can be chosen as the form library', () => {
    const registry = createRegistry({ validators: [arktypeAdapter] });
    const builder = createFormBuilder({ registry });

    builder.settings.update({ validator: 'arktype' });
    builder.fields.add('string.email', undefined, { key: 'email', isRequired: true });

    const code = generateCode(builder.toJSON(), { registry });

    expect(builder.getSnapshot().issues).toEqual([]);
    expect(code.packages).toContain('arktype');
    expect(code.steps[0]!.library).toBe('arktype');
  });
});
