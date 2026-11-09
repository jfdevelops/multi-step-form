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
    builder.fields.add({ type: 'string.email', key: 'email', isRequired: true });
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
    const id = builder.fields.add({ type: 'object', key: 'faces' });
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
    builder.fields.add({ type: 'string.email', key: 'emailAddress', isRequired: true });
    builder.fields.add({ type: 'date', key: 'startsOn', defaultValue: '2026-01-01T00:00:00.000Z' });
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

  it('sends next on the last step back to the first incomplete step', async () => {
    const builder = createFormBuilder();
    builder.settings.update({ validator: 'builtin' });
    builder.fields.add({ type: 'string', key: 'name', isRequired: true });
    builder.steps.add({ title: 'Second', fields: [{ type: 'string', key: 'city' }] });
    const preview = await renderHook(builder, () => useFormPreview());
    const ready = () => {
      const state = preview();
      if (state.status !== 'ready') throw state.error;
      return state;
    };

    await act(async () => ready().goTo(1));
    expect(ready().isLast).toBe(true);
    expect(ready().currentStep.isComplete).toBe(true);

    await act(async () => {
      expect(ready().next()).toBe(false);
    });

    expect(ready().currentStep.index).toBe(0);
    expect(ready().currentStep.attempted).toBe(true);
  });

  it('keeps entered values by step id and lets new defaults win', async () => {
    const builder = createFormBuilder();
    builder.settings.update({ validator: 'builtin' });
    const first = builder.getSnapshot().definition.steps[0]!.id;
    builder.fields.add({ type: 'string', key: 'name', stepId: first });
    const second = builder.steps.add({
      title: 'Second',
      fields: [{ type: 'string', key: 'city' }],
    });
    const preview = await renderHook(builder, () => useFormPreview());
    const ready = () => {
      const state = preview();
      if (state.status !== 'ready') throw state.error;
      return state;
    };

    await act(async () => ready().currentStep.fields[0]!.setValue('Ada'));
    await act(async () => void ready().next());
    await act(async () => ready().currentStep.fields[0]!.setValue('Paris'));
    await act(async () => builder.steps.move(second, 0));

    expect(ready().steps.map((step) => step.definition.id)).toEqual([second, first]);
    // stepIndex is still 1, which is now the original first step.
    expect(ready().currentStep.definition.id).toBe(first);
    expect(ready().currentStep.fields[0]!.value).toBe('Ada');
    await act(async () => ready().previous());
    expect(ready().currentStep.definition.id).toBe(second);
    expect(ready().currentStep.fields[0]!.value).toBe('Paris');

    const nameId = builder.getSnapshot().definition.steps[1]!.fields[0]!.id;
    await act(async () => builder.fields.update(nameId, { defaultValue: 'Grace' }));
    await act(async () => ready().goTo(1));
    // User-entered values still win over a later inspector default change.
    expect(ready().currentStep.fields[0]!.value).toBe('Ada');

    await act(async () => ready().reset());
    await act(async () => void ready().next());
    expect(ready().currentStep.fields[0]!.value).toBe('Grace');

    // Untouched fields pick up inspector default edits without Reset.
    await act(async () => builder.fields.update(nameId, { defaultValue: 'Lin' }));
    expect(ready().currentStep.fields[0]!.value).toBe('Lin');
  });
});
