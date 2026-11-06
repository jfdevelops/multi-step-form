import { createFormBuilder, type FormBuilder as FormBuilderStore } from '@jfdevelops/multi-step-form-builder-core';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { FormBuilder, useFormPreview, useFormSettings, useGeneratedCode, useSchemaEditor } from '../src';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Root[] = [];

afterEach(async () => {
  for (const root of mounted.splice(0)) await act(async () => root.unmount());
});

/** Renders `hook` inside a builder and returns a getter for its latest result. */
async function renderHook<T>(builder: FormBuilderStore, hook: () => T) {
  const result: { current?: T } = {};

  function Probe() {
    result.current = hook();
    return null;
  }

  const root = createRoot(document.createElement('div'));
  mounted.push(root);
  await act(async () =>
    root.render(
      <FormBuilder builder={builder}>
        <Probe />
      </FormBuilder>,
    ),
  );

  return () => result.current as T;
}

describe('useGeneratedCode', () => {
  it('regenerates the module on every edit', async () => {
    const builder = createFormBuilder();
    builder.fields.add('string.email', undefined, { key: 'email', isRequired: true });
    const code = await renderHook(builder, () => useGeneratedCode());

    expect(code().source).toContain('email: {');
    expect(code().steps[0]!.validator).toBeUndefined();

    await act(async () => builder.settings.update({ validator: 'builtin' }));
    expect(code().steps[0]!.validator?.name).toBe('step1Schema');
    expect(code().packages).toContain('@jfdevelops/multi-step-form-builder-core');
  });
});

describe('useFormSettings', () => {
  it('reads and updates form settings', async () => {
    const builder = createFormBuilder();
    const settings = await renderHook(builder, () => useFormSettings());

    await act(async () => settings().update({ nameTransformCasing: 'sentence' }));
    expect(settings().settings).toEqual({ nameTransformCasing: 'sentence' });
    expect(settings().libraries.map((entry) => entry.library)).toEqual(['builtin']);
  });
});

describe('useSchemaEditor', () => {
  it('edits the selected field’s schema', async () => {
    const builder = createFormBuilder();
    const id = builder.fields.add('object', undefined, { key: 'faces' });
    const editor = await renderHook(builder, () => useSchemaEditor());

    expect(editor()?.field.id).toBe(id);
    await act(async () => void editor()!.addProperty([], 'min', 'number'));
    expect(editor()!.root.children.map((child) => [child.name, child.schema.kind])).toEqual([['min', 'number']]);
    expect(builder.getField(id)?.defaultValue).toEqual({ min: 0 });

    await act(async () => builder.select(null));
    expect(editor()).toBeUndefined();
  });
});

describe('useFormPreview', () => {
  it('runs the form, validates steps and keeps values across edits', async () => {
    const builder = createFormBuilder();
    builder.settings.update({ validator: 'builtin', storageKey: 'should-not-persist' });
    builder.fields.add('string.email', undefined, { key: 'emailAddress', isRequired: true });
    builder.fields.add('date', undefined, { key: 'startsOn', defaultValue: '2026-01-01T00:00:00.000Z' });
    builder.steps.add({ title: 'Second', fields: [{ type: 'number', key: 'age' }] });
    const preview = await renderHook(builder, () => useFormPreview());
    const ready = () => {
      const state = preview();
      if (state.status !== 'ready') throw state.error;
      return state;
    };

    expect(ready().steps.map((step) => step.key)).toEqual(['step1', 'step2']);
    expect(ready().currentStep.fields.map((field) => field.label)).toEqual(['Email Address*', 'Starts On']);
    expect(ready().currentStep.fields[1]!.value).toBe('2026-01-01T00:00:00.000Z');
    expect(ready().currentStep.isComplete).toBe(false);

    await act(async () => void ready().next());
    expect(ready().currentStep.index).toBe(0);
    expect(ready().currentStep.attempted).toBe(true);
    expect(ready().currentStep.fields[0]!.errors).toContain('Required');

    await act(async () => ready().currentStep.fields[0]!.setValue('a@b.co'));
    expect(ready().currentStep.isComplete).toBe(true);
    expect(ready().currentStep.fields[0]!.errors).toEqual([]);

    // Editing the builder keeps what was entered.
    await act(async () => builder.steps.update(builder.getSnapshot().definition.steps[0]!.id, { title: 'Contact' }));
    expect(ready().currentStep.title).toBe('Contact');
    expect(ready().currentStep.fields[0]!.value).toBe('a@b.co');

    await act(async () => void ready().next());
    expect(ready().currentStep.key).toBe('step2');
    expect(ready().isLast).toBe(true);
    expect(localStorage.getItem('should-not-persist')).toBeNull();

    await act(async () => ready().reset());
    expect(ready().currentStep.key).toBe('step1');
    expect(ready().currentStep.fields[0]!.value).toBe('');
  });

  it('reports definitions that can’t run yet', async () => {
    const builder = createFormBuilder();
    const preview = await renderHook(builder, () => useFormPreview());

    expect(preview().status).toBe('error');
  });
});
