import { describe, expect, it, vi } from 'vitest';
import {
  createFormBuilder,
  createDefinitionBuilder,
  createMemoryStorage,
  createRegistry,
  FormBuilderError,
  type FormBuilder,
  type FormDefinition,
} from '../src';

function sequentialIds() {
  const counts: Record<string, number> = {};

  return (kind: string) => {
    counts[kind] = (counts[kind] ?? 0) + 1;

    return `${kind}${counts[kind]}`;
  };
}

function setup(options: Parameters<typeof createFormBuilder>[0] = {}) {
  let time = 0;
  const clock = { advance: (ms: number) => (time += ms) };
  const builder = createFormBuilder({
    idGenerator: sequentialIds(),
    now: () => time,
    ...options,
  });

  return { builder, clock, step: () => builder.getSnapshot().definition.steps[0]! };
}

const fieldKeys = (builder: FormBuilder, stepIndex = 0) =>
  builder.getSnapshot().definition.steps[stepIndex]!.fields.map((field) => field.key);

describe('createFormBuilder', () => {
  it('starts with one empty step that is active', () => {
    const { builder } = setup();
    const snapshot = builder.getSnapshot();

    expect(snapshot.definition.steps).toHaveLength(1);
    expect(snapshot.activeStepId).toBe(snapshot.definition.steps[0]!.id);
    expect(snapshot.selection).toEqual({ type: 'none' });
    expect(snapshot.history).toEqual({ canUndo: false, canRedo: false });
    expect(snapshot.status.dirty).toBe(false);
  });

  it('returns a stable snapshot until something changes', () => {
    const { builder } = setup();
    const first = builder.getSnapshot();

    expect(builder.getSnapshot()).toBe(first);
    builder.fields.add({ type: 'string' });
    expect(builder.getSnapshot()).not.toBe(first);
  });

  it('adds fields with unique keys, defaults from the field type, and selects them', () => {
    const { builder } = setup();
    const first = builder.fields.add({ type: 'string.email' });
    const second = builder.fields.add({ type: 'string.email' });

    expect(fieldKeys(builder)).toEqual(['email', 'email2']);
    expect(builder.getField(first)).toEqual({
      id: expect.any(String),
      key: 'email',
      type: 'string.email',
      schema: { kind: 'string', checks: [{ check: 'email' }] },
      defaultValue: '',
    });
    expect(builder.getSnapshot().selection).toMatchObject({
      type: 'fields',
      fieldIds: [second],
    });
  });

  it('throws a FormBuilderError for unknown field types and ids', () => {
    const { builder } = setup();

    expect(() => builder.fields.add({ type: 'nope' })).toThrow(FormBuilderError);
    expect(() => builder.fields.update('missing', { label: 'x' })).toThrow(/No field with id/);
  });

  it('notifies subscribers and onChange', () => {
    const onChange = vi.fn();
    const { builder } = setup({ onChange });
    const listener = vi.fn();
    const unsubscribe = builder.subscribe(listener);

    builder.fields.add({ type: 'string' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);

    builder.select(null); // UI-only change
    expect(listener).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    builder.fields.add({ type: 'string' });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('history', () => {
  it('undoes and redoes edits, restoring the selection', () => {
    const { builder } = setup();
    const id = builder.fields.add({ type: 'string' });

    builder.fields.update(id, { label: 'Name' });
    builder.history.undo();
    expect(builder.getField(id)?.label).toBeUndefined();

    builder.history.undo();
    expect(builder.getField(id)).toBeUndefined();
    expect(builder.getSnapshot().selection).toEqual({ type: 'none' });

    builder.history.redo();
    builder.history.redo();
    expect(builder.getField(id)?.label).toBe('Name');
  });

  it('merges rapid edits to the same property into one undo step', () => {
    const { builder, clock } = setup();
    const id = builder.fields.add({ type: 'string' });

    builder.fields.update(id, { label: 'N' });
    clock.advance(100);
    builder.fields.update(id, { label: 'Na' });
    clock.advance(100);
    builder.fields.update(id, { label: 'Name' });
    builder.history.undo();
    expect(builder.getField(id)?.label).toBeUndefined();

    builder.history.redo();
    clock.advance(1000);
    builder.fields.update(id, { label: 'Names' });
    builder.history.undo();
    expect(builder.getField(id)?.label).toBe('Name');
  });

  it('groups a transaction into one undo step and one notification', () => {
    const { builder } = setup();
    const listener = vi.fn();
    builder.subscribe(listener);

    builder.history.transaction(() => {
      builder.fields.add({ type: 'string' });
      builder.fields.add({ type: 'number' });
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(fieldKeys(builder)).toEqual(['text', 'number']);
    builder.history.undo();
    expect(fieldKeys(builder)).toEqual([]);
  });

  it('keeps the stored revision when undoing past a save', async () => {
    const storage = createMemoryStorage();
    const { builder } = setup({ storage });

    builder.fields.add({ type: 'string' });
    await builder.save();
    expect(builder.getSnapshot().definition.revision).toBe(1);

    builder.history.undo();
    expect(builder.getSnapshot().definition.revision).toBe(1);
    expect(builder.getSnapshot().status.dirty).toBe(true);
  });
});

describe('steps', () => {
  it('adds, retitles, reorders, duplicates and removes steps', () => {
    const { builder } = setup();
    const second = builder.steps.add({ title: 'Info' });

    expect(builder.getSnapshot().activeStepId).toBe(second);
    builder.steps.update(second, { title: 'Details' });
    builder.fields.add({ type: 'string', stepId: second });
    builder.steps.move(second, 0);
    expect(builder.getSnapshot().definition.steps.map((step) => step.title)).toEqual([
      'Details',
      'Step 1',
    ]);

    const copy = builder.steps.duplicate(second);
    const copied = builder.getStep(copy)!;
    expect(builder.getSnapshot().definition.steps.indexOf(copied)).toBe(1);
    expect(copied).toMatchObject({ title: 'Details (copy)' });
    expect(copied.fields[0]!.id).not.toBe(builder.getStep(second)!.fields[0]!.id);

    builder.steps.remove(copy);
    expect(builder.getSnapshot().definition.steps).toHaveLength(2);
    expect(builder.getSnapshot().activeStepId).not.toBe(copy);
  });
});

describe('fields', () => {
  it('sets nested properties by path and keeps choice values in sync with options', () => {
    const { builder } = setup();
    const id = builder.fields.add({ type: 'choice' });

    expect(builder.getField(id)).toMatchObject({
      type: 'string.select',
      schema: { kind: 'enum', values: ['option1', 'option2'] },
      defaultValue: '',
    });

    builder.fields.setProperty(id, 'props.options', [{ value: 'a', label: 'A' }]);
    expect(builder.getField(id)?.props?.options).toEqual([{ value: 'a', label: 'A' }]);
    expect(builder.getField(id)?.schema).toEqual({ kind: 'enum', values: ['a'] });
    expect(builder.getField(id)?.defaultValue).toBe('');

    builder.fields.setProperty(id, 'placeholder', 'Pick one');
    builder.fields.setProperty(id, 'placeholder', undefined);
    expect(builder.getField(id)).not.toHaveProperty('placeholder');
  });

  it('swaps input type checks within a field type, keeping the rest of the schema', () => {
    const { builder } = setup();
    const id = builder.fields.add({ type: 'text' });

    builder.fields.updateSchema(id, [], (node) => ({ ...node, checks: [{ check: 'minLength', value: 3 }] }));
    builder.fields.update(id, { type: 'string.email' });
    expect(builder.getField(id)?.schema).toEqual({
      kind: 'string',
      checks: [{ check: 'minLength', value: 3 }, { check: 'email' }],
    });

    builder.fields.update(id, { type: 'string.url' });
    expect(builder.getField(id)?.schema.checks).toEqual([{ check: 'minLength', value: 3 }, { check: 'url' }]);
  });

  it('resets the schema and default value when the field type changes', () => {
    const { builder } = setup();
    const id = builder.fields.add({ type: 'text', key: 'age', defaultValue: 'old' });

    builder.fields.update(id, { type: 'number' });

    expect(builder.getField(id)).toMatchObject({ schema: { kind: 'number' }, defaultValue: 0 });
  });

  it('fits the default value to schema edits', () => {
    const { builder } = setup();
    const id = builder.fields.add({ type: 'object', key: 'faces' });

    builder.fields.updateSchema(id, [], (node) =>
      node.kind === 'object'
        ? {
            ...node,
            properties: [
              { key: 'min', schema: { kind: 'number' } },
              { key: 'faces', schema: { kind: 'array', item: { kind: 'string' } } },
            ],
          }
        : node,
    );
    expect(builder.getField(id)?.defaultValue).toEqual({ min: 0, faces: [] });

    builder.fields.setProperty(id, 'defaultValue', { min: 2, faces: ['a'] });
    builder.fields.updateSchema(id, ['min'], () => ({ kind: 'string' }));
    expect(builder.getField(id)?.defaultValue).toEqual({ min: '', faces: ['a'] });
  });

  it('renames equalsField references with the key', () => {
    const { builder, step } = setup();
    const password = builder.fields.add({ type: 'text', key: 'password' });
    builder.fields.add({ type: 'text', key: 'confirm', schema: { kind: 'string', checks: [{ check: 'equalsField', field: 'password' }] } });

    builder.fields.update(password, { key: 'secret' });

    expect(step().fields[1]!.schema.checks).toEqual([{ check: 'equalsField', field: 'secret' }]);
  });

  it('updates form settings, removing undefined ones', () => {
    const { builder } = setup();

    builder.settings.update({ nameTransformCasing: 'sentence', validator: 'builtin' });
    expect(builder.getSnapshot().definition.settings).toEqual({
      nameTransformCasing: 'sentence',
      validator: 'builtin',
    });

    builder.settings.update({ nameTransformCasing: undefined, validator: undefined });
    expect(builder.getSnapshot().definition).not.toHaveProperty('settings');
    expect(() => builder.settings.update({ validator: 'nope' })).toThrow(FormBuilderError);
  });

  it('removes fields and moves focus to the next field', () => {
    const { builder } = setup();
    const a = builder.fields.add({ type: 'string', key: 'a' });
    builder.fields.add({ type: 'string', key: 'b' });
    const c = builder.fields.add({ type: 'string', key: 'c' });

    builder.fields.remove(a);
    expect(fieldKeys(builder)).toEqual(['b', 'c']);

    builder.fields.remove(c);
    expect(builder.getSnapshot().selection).toMatchObject({
      type: 'fields',
      fieldIds: [builder.getSnapshot().definition.steps[0]!.fields[0]!.id],
    });
  });

  it('moves fields within a step using post-removal indexes', () => {
    const { builder } = setup();
    const a = builder.fields.add({ type: 'string', key: 'a' });
    builder.fields.add({ type: 'string', key: 'b' });
    builder.fields.add({ type: 'string', key: 'c' });

    builder.fields.move(a, { stepId: builder.getSnapshot().activeStepId!, index: 2 });
    expect(fieldKeys(builder)).toEqual(['b', 'c', 'a']);
  });

  it('moves fields across steps, keeping keys unique and carrying the schema', () => {
    const { builder } = setup();
    const email = builder.fields.add({ type: 'string.email', key: 'email' });

    const second = builder.steps.add();
    builder.fields.add({ type: 'string', stepId: second, key: 'email' });

    builder.fields.move(email, { stepId: second, index: 0 });

    expect(fieldKeys(builder, 0)).toEqual([]);
    expect(fieldKeys(builder, 1)).toEqual(['email2', 'email']);
    expect(builder.getField(email)?.schema).toEqual({ kind: 'string', checks: [{ check: 'email' }] });
  });

  it('duplicates fields right after the originals', () => {
    const { builder } = setup();
    const a = builder.fields.add({ type: 'string', key: 'a' });
    builder.fields.add({ type: 'string', key: 'b' });

    const [copy] = builder.fields.duplicate(a);
    expect(fieldKeys(builder)).toEqual(['a', 'a2', 'b']);
    expect(builder.getSnapshot().selection).toMatchObject({ fieldIds: [copy] });
  });
});

describe('selection', () => {
  it('supports replace, toggle and range selection within a step', () => {
    const { builder } = setup();
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((key) =>
      builder.fields.add({ type: 'string', key }),
    ) as [string, string, string, string];

    builder.select(b);
    builder.select(d, 'range');
    expect(builder.getSnapshot().selection).toMatchObject({ fieldIds: [b, c, d], anchorId: b });

    builder.select(c, 'toggle');
    expect(builder.getSnapshot().selection).toMatchObject({ fieldIds: [b, d] });

    builder.select(a, 'toggle');
    expect(builder.getSnapshot().selection).toMatchObject({ fieldIds: [a, b, d], anchorId: a });

    builder.select(builder.getSnapshot().definition.steps[0]!.id);
    expect(builder.getSnapshot().selection.type).toBe('step');
  });
});

describe('clipboard', () => {
  it('copies, cuts and pastes fields with fresh ids and keys', () => {
    const { builder } = setup();
    const a = builder.fields.add({ type: 'string', key: 'a' });
    const b = builder.fields.add({ type: 'string', key: 'b' });

    builder.clipboard.copy([a]);
    builder.select(b);
    const [pasted] = builder.clipboard.paste();
    expect(fieldKeys(builder)).toEqual(['a', 'b', 'a2']);
    expect(pasted).not.toBe(a);

    builder.clipboard.cut([b]);
    expect(fieldKeys(builder)).toEqual(['a', 'a2']);
    builder.history.undo();
    expect(fieldKeys(builder)).toEqual(['a', 'b', 'a2']);
  });
});

describe('drag and drop', () => {
  it('adds palette items and moves the whole selection', () => {
    const { builder } = setup();
    const stepId = builder.getSnapshot().activeStepId!;
    const [a, b] = ['a', 'b'].map((key) => builder.fields.add({ type: 'string', key })) as [string, string];
    builder.fields.add({ type: 'string', key: 'c' });

    builder.drop({ kind: 'palette', fieldType: 'number' }, { stepId, index: 0 });
    expect(fieldKeys(builder)).toEqual(['number', 'a', 'b', 'c']);

    builder.select(a);
    builder.select(b, 'toggle');
    builder.drop({ kind: 'field', fieldId: a }, { stepId, index: 2 });
    expect(fieldKeys(builder)).toEqual(['number', 'c', 'a', 'b']);
  });

  it('applies custom drop rules', () => {
    const { builder } = setup({
      canDrop: ({ source }) =>
        source.kind === 'palette' && source.fieldType === 'number' ? 'No numbers here' : true,
    });
    const stepId = builder.getSnapshot().activeStepId!;

    expect(builder.canDrop({ kind: 'palette', fieldType: 'number' }, { stepId, index: 0 })).toBe(
      'No numbers here',
    );
    expect(builder.drop({ kind: 'palette', fieldType: 'number' }, { stepId, index: 0 })).toEqual([]);
    expect(builder.canDrop({ kind: 'palette', fieldType: 'missing' }, { stepId, index: 0 })).toMatch(
      /Unknown field type/,
    );
  });
});

describe('issues', () => {
  it('reports duplicate field keys, unknown types and dangling references', () => {
    const initial: FormDefinition = {
      schemaVersion: 1,
      id: 'form',
      revision: 0,
      steps: [
        {
          id: 's1',
          title: 'One',
          validation: { kind: 'schema', library: 'valibot' },
          fields: [
            { id: 'f1', key: 'a', type: 'string', schema: { kind: 'string' }, defaultValue: '' },
            { id: 'f2', key: 'a', type: 'mystery', schema: { kind: 'string' }, defaultValue: '' },
            {
              id: 'f3',
              key: 'b',
              type: 'string',
              schema: { kind: 'string', checks: [{ check: 'equalsField', field: 'gone' }] },
              defaultValue: 1,
            },
            {
              id: 'f4',
              key: 'c',
              type: 'object',
              schema: {
                kind: 'object',
                properties: [
                  { key: 'x', schema: { kind: 'boolean', checks: [{ check: 'email' }] } },
                  { key: 'x', schema: { kind: 'enum', values: [] } },
                ],
              },
              defaultValue: {},
            },
          ],
        },
        { id: 's2', title: '', fields: [] },
      ],
    };
    const { builder } = setup({ initial });
    const codes = builder.getSnapshot().issues.map((issue) => `${issue.nodeId}:${issue.code}`);

    expect(codes).toEqual(
      expect.arrayContaining([
        'f2:duplicate-field-key',
        'f2:unknown-field-type',
        's1:unknown-validator',
        'f3:dangling-field-reference',
        'f3:default-value-mismatch',
        'f4:duplicate-property-key',
        'f4:empty-choice',
        's2:empty-step-title',
        's2:empty-step',
      ]),
    );
  });

  it('reports checks a node can’t use against the step’s library', () => {
    const { builder } = setup();
    const id = builder.fields.add({ type: 'boolean' });

    builder.settings.update({ validator: 'builtin' });
    builder.fields.updateSchema(id, [], (node) => ({ ...node, checks: [{ check: 'email' }] }));

    expect(builder.getSnapshot().issues).toEqual([
      expect.objectContaining({ code: 'unsupported-schema', nodeId: id, schemaPath: [] }),
    ]);
  });
});

describe('persistence', () => {
  it('saves to storage and tracks dirty state and revisions', async () => {
    const storage = createMemoryStorage();
    const { builder } = setup({ storage });

    builder.fields.add({ type: 'string' });
    expect(builder.getSnapshot().status.dirty).toBe(true);

    await builder.save();
    const snapshot = builder.getSnapshot();
    expect(snapshot.status).toMatchObject({ dirty: false, saving: false });
    expect(snapshot.definition.revision).toBe(1);
    expect(storage.definitions.get(snapshot.definition.id)?.revision).toBe(1);

    const reloaded = createFormBuilder({ storage });
    expect(await reloaded.loadFromStorage(snapshot.definition.id)).toBe(true);
    expect(reloaded.getSnapshot().definition.steps[0]!.fields).toHaveLength(1);
  });

  it('autosaves after edits', async () => {
    vi.useFakeTimers();

    try {
      const storage = createMemoryStorage();
      const save = vi.spyOn(storage, 'save');
      const builder = createFormBuilder({ storage, autosave: { debounceMs: 50 } });

      builder.fields.add({ type: 'string' });
      builder.fields.add({ type: 'string' });
      await vi.advanceTimersByTimeAsync(60);

      expect(save).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('exposes failed saves through status', async () => {
    const error = new Error('offline');
    const { builder } = setup({ storage: { save: async () => Promise.reject(error) } });

    await expect(builder.save()).rejects.toBe(error);
    expect(builder.getSnapshot().status).toMatchObject({ saving: false, error });
  });
});

describe('registry', () => {
  it('is immutable and lets later registrations replace built-ins', () => {
    const registry = createRegistry();
    const extended = registry.withFieldType({
      id: 'text',
      label: 'Plain text',
      inputTypes: [{ type: 'string', label: 'Text' }],
      schema: { kind: 'string' },
    });

    expect(registry.getFieldType('string')?.label).toBe('Text');
    expect(registry.getFieldType('string.email')?.id).toBe('text');
    expect(extended.getFieldType('text')?.label).toBe('Plain text');
    expect(extended.getFieldType('string.email')).toBeUndefined();
    expect(createRegistry({ builtins: false }).fieldTypes).toEqual([]);
    expect(registry.getValidator('builtin')).toBeDefined();
  });
});


describe('createDefinitionBuilder', () => {
  it('builds scoped steps with registry defaults and independent snapshots', () => {
    const builder = createDefinitionBuilder({ idGenerator: sequentialIds() })
      .settings({ validator: 'builtin', instances: ['organizer', 'reviewer'] })
      .step({ title: 'Contact' }, (step) => {
        step.field({ type: 'string.email', key: 'email', isRequired: true });
      });
    const first = builder.build();
    const result = builder.step({ title: 'Details' }, (step) => {
      step.field({ type: 'number', key: 'attendees', defaultValue: 12 })
        .field({ type: 'text', key: 'notes' });
    }).build();

    expect(first.steps).toHaveLength(1);
    expect(result.steps.map((step) => step.title)).toEqual(['Contact', 'Details']);
    expect(result.settings?.instances).toEqual(['organizer', 'reviewer']);
    expect(result.steps[0]!.fields[0]).toMatchObject({
      key: 'email', isRequired: true, defaultValue: '',
      schema: { kind: 'string', checks: [{ check: 'email' }] },
    });
    expect(result.steps[1]!.fields.map((field) => field.key)).toEqual(['attendees', 'notes']);
    expect(result.steps[1]!.fields[0]!.defaultValue).toBe(12);
    expect(createFormBuilder({ initial: result }).getSnapshot().issues).toEqual([]);
  });

  it('retains the default empty step until a step is supplied and rejects unknown field types', () => {
    expect(createDefinitionBuilder().build().steps).toHaveLength(1);
    expect(createDefinitionBuilder().step({}).build().steps[0]!.title).toBe('Step 1');
    expect(() => createDefinitionBuilder().step({ title: 'Invalid' }, (step) => {
      step.field({ type: 'missing' });
    })).toThrow(FormBuilderError);
  });
});
