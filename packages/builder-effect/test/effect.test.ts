import { describe, expect, it } from 'vitest';
import { createFormBuilder, createRegistry, generateCode } from '@jfdevelops/multi-step-form-builder-core';
import { describeConformance } from '../../builder-core/test/conformance';
import { effectAdapter } from '../src';

describeConformance(effectAdapter);

describe('effectAdapter', () => {
  it('can be chosen as the form library', () => {
    const registry = createRegistry({ validators: [effectAdapter] });
    const builder = createFormBuilder({ registry });

    builder.settings.update({ validator: 'effect' });
    builder.fields.add({ type: 'string.email', key: 'email', isRequired: true });

    const code = generateCode(builder.toJSON(), { registry });

    expect(builder.getSnapshot().issues).toEqual([]);
    expect(code.packages).toContain('effect');
    expect(code.steps[0]!.library).toBe('effect');
  });
});
