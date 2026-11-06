import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';
import { describe, expect, it } from 'vitest';
import {
  builtinAdapter,
  compileDefinition,
  createFormBuilder,
  createFormFromDefinition,
  createSchemaEditorActions,
  createSchemaValidator,
  fromStepsConfig,
  generateCode,
  getCanvasModel,
  getFormSettingsModel,
  getInspectorModel,
  getPaletteModel,
  getSchemaEditorModel,
  getStepValidationModel,
  handleKeyDown,
  resolveShortcut,
  setInspectorValue,
  setStepValidationMode,
  toSource,
  toTypeScript,
  createRegistry,
  type FormDefinition,
} from '../src';
import { describeConformance } from './conformance';

const registry = createRegistry();

describeConformance(builtinAdapter);

describe('compileDefinition', () => {
  const definition: FormDefinition = {
    schemaVersion: 1,
    id: 'signup',
    revision: 0,
    settings: { validator: 'builtin', nameTransformCasing: 'sentence', storageKey: 'signup' },
    steps: [
      {
        id: 's1',
        title: 'Account',
        fields: [
          { id: 'f1', key: 'emailAddress', type: 'string.email', isRequired: true, defaultValue: '', schema: { kind: 'string', checks: [{ check: 'email' }] } },
        ],
      },
      {
        id: 's2',
        title: 'Profile',
        nameTransformCasing: 'kebab',
        validation: { kind: 'none' },
        fields: [
          { id: 'f2', key: 'birthDay', type: 'date', defaultValue: '2000-01-01T00:00:00.000Z', schema: { kind: 'date' } },
          { id: 'f3', key: 'newsletter', type: 'boolean.switch', defaultValue: false, label: 'Newsletter', schema: { kind: 'boolean' } },
          {
            id: 'f4',
            key: 'location',
            type: 'string.radio',
            defaultValue: '',
            schema: { kind: 'enum', values: ['come_to_me', 'i_come_to_you'] },
            props: { options: [{ value: 'come_to_me', label: 'Come to me' }, { value: 'i_come_to_you', label: 'I come to you' }] },
          },
          {
            id: 'f5',
            key: 'faces',
            type: 'object',
            nameTransformCasing: 'upper',
            defaultValue: { min: 1, faces: [{ id: 'face1', addedOn: '2025-01-01T00:00:00.000Z' }] },
            schema: {
              kind: 'object',
              properties: [
                { key: 'min', schema: { kind: 'number' } },
                {
                  key: 'faces',
                  schema: {
                    kind: 'array',
                    item: {
                      kind: 'object',
                      properties: [
                        { key: 'id', schema: { kind: 'string' } },
                        { key: 'addedOn', schema: { kind: 'date' } },
                        { key: 'note', schema: { kind: 'string', optional: true } },
                      ],
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  it('produces a config defineMultiStepForm accepts, with completeness from the validator', () => {
    const form = createFormFromDefinition(definition)() as { stepSchema: { value: Record<string, any> } };
    const steps = form.stepSchema.value;

    expect(Object.keys(steps)).toEqual(['step1', 'step2']);
    expect(steps.step1.isComplete).toBe(false);
    expect(steps.step2.isComplete).toBe(true);
    expect(steps.step2.fields.birthDay.defaultValue).toBeInstanceOf(Date);
    expect(steps.step2.fields.faces.defaultValue.faces[0].addedOn).toBeInstanceOf(Date);
  });

  it('resolves labels with the multi-step form casing rules', () => {
    const form = createFormFromDefinition(definition)() as { stepSchema: { value: Record<string, any> } };
    const steps = form.stepSchema.value;

    expect(steps.step1.fields.emailAddress.label).toBe('Email address*');
    expect(steps.step2.fields.birthDay.label).toBe('birth-day');
    expect(steps.step2.fields.newsletter.label).toBe('Newsletter');
    expect(steps.step2.fields.faces.label).toBe('FACES');

    const canvas = getCanvasModel(createFormBuilder({ initial: definition }).getSnapshot());
    expect(canvas.fields.map((field) => field.label)).toEqual(['Email address*']);
  });

  it('reattaches code-owned validators through resolveCode', () => {
    const isComplete = () => false;
    const compiled = compileDefinition(
      { ...definition, steps: [{ ...definition.steps[1]!, validation: { kind: 'code', ref: 'step2.isComplete' } }] },
      { resolveCode: () => ({ isComplete }) },
    );

    expect(compiled.steps.step1!.isComplete).toBe(isComplete);
    expect(compiled.steps.step1!.validateFields).toBeUndefined();
  });

  it('names steps by position, so reordering renumbers them', () => {
    const builder = createFormBuilder();
    const first = builder.getSnapshot().activeStepId!;
    builder.steps.update(first, { title: 'Contact' });
    const second = builder.steps.add({ title: 'Details' });

    builder.steps.move(second, 0);
    const compiled = compileDefinition(builder.toJSON());

    expect(Object.entries(compiled.steps).map(([key, step]) => [key, step.title])).toEqual([
      ['step1', 'Details'],
      ['step2', 'Contact'],
    ]);
  });

  it('reads steps in step-number order and passes the key to resolveCode', () => {
    const imported = fromStepsConfig({
      step2: { title: 'Second', fields: {}, isComplete: () => true },
      step1: { title: 'First', fields: {} },
    });
    const keys: string[] = [];

    expect(imported.steps.map((step) => step.title)).toEqual(['First', 'Second']);
    compileDefinition(imported, { resolveCode: (_, { key }) => (keys.push(key), undefined) });
    expect(keys).toEqual(['step2']);
  });

  it('round-trips a hand-written steps config, inferring schemas from values', () => {
    const steps = {
      step1: {
        title: 'Contact',
        nameTransformCasing: 'sentence' as const,
        fields: {
          email: { defaultValue: '', type: 'string.email', isRequired: true, placeholder: 'you@example.com' },
          since: { defaultValue: new Date('2024-05-01T00:00:00.000Z') },
          prefs: { defaultValue: { theme: 'light', sizes: [1, 2] }, nameTransformCasing: 'upper' as const },
        },
        validateFields: createSchemaValidator({ fields: [], refinements: [] }),
      },
    };
    const schema = defineMultiStepForm({ steps }).configure()();
    const imported = fromStepsConfig(schema.stepSchema.original as Record<string, unknown>, { id: 'contact' });
    const step = imported.steps[0]!;

    expect(step).toMatchObject({ nameTransformCasing: 'sentence', validation: { kind: 'code', ref: 'step1.validateFields' } });
    expect(step.fields.map(({ key, type, schema, defaultValue }) => ({ key, type, schema, defaultValue }))).toEqual([
      { key: 'email', type: 'string.email', schema: { kind: 'string' }, defaultValue: '' },
      { key: 'since', type: 'date', schema: { kind: 'date' }, defaultValue: '2024-05-01T00:00:00.000Z' },
      {
        key: 'prefs',
        type: 'object',
        schema: {
          kind: 'object',
          properties: [
            { key: 'theme', schema: { kind: 'string' } },
            { key: 'sizes', schema: { kind: 'array', item: { kind: 'number' } } },
          ],
        },
        defaultValue: { theme: 'light', sizes: [1, 2] },
      },
    ]);
    expect(step.fields[0]).toMatchObject({ isRequired: true, placeholder: 'you@example.com' });
    expect(step.fields[2]).toMatchObject({ nameTransformCasing: 'upper' });
    expect(createFormBuilder({ initial: imported }).getSnapshot().issues).toEqual([]);
  });

  it('generates a module with typed values, validators and form settings', () => {
    const code = generateCode(
      { ...definition, settings: { ...definition.settings, instances: ['client', 'admin'] } },
      { importFrom: '@jfdevelops/multi-step-form-core' },
    );

    expect(code.packages).toEqual(['@jfdevelops/multi-step-form-core', '@jfdevelops/multi-step-form-builder-core']);
    expect(code.types.map((type) => type.name)).toEqual(['Step2Location', 'Step2Faces']);
    expect(code.source).toContain('export type Step2Location = "come_to_me" | "i_come_to_you" | "";');
    expect(code.source).toContain('defaultValue: "" as Step2Location,');
    expect(code.source).toContain('note?: string;');
    expect(code.source).toContain('addedOn: new Date("2025-01-01T00:00:00.000Z")');
    expect(code.source).toContain('defaultValue: new Date("2000-01-01T00:00:00.000Z"),');
    expect(code.source).toContain('export const step1Schema = createSchemaValidator(');
    expect(code.source).toContain('validateFields: step1Schema,');
    expect(code.source).toContain('nameTransformCasing: "kebab",');
    expect(code.source).toContain('instances: ["client","admin"],');
    expect(code.source).toContain('storage: { key: "signup" },');
    expect(code.source).not.toContain('export const form =');
    expect(code.steps.map((step) => step.library)).toEqual(['builtin', undefined]);
  });

  it('writes every kind of default value, including cleared numbers', () => {
    const source = toSource({
      schemaVersion: 1,
      id: 'f',
      revision: 0,
      steps: [
        {
          id: 's',
          title: 'S',
          fields: [
            { id: 'a', key: 'count', type: 'number', defaultValue: null, schema: { kind: 'number', nullable: true } },
            { id: 'b', key: 'list', type: 'array', defaultValue: [], schema: { kind: 'array', item: { kind: 'string' } } },
          ],
        },
      ],
    });

    expect(source).toContain('defaultValue: null as Step1Count,');
    expect(source).toContain('export type Step1Count = number | null;');
    expect(source).toContain('defaultValue: [] as Step1List,');
    expect(source).toContain('export const form = createForm();');
  });

  it('writes TypeScript types for schemas', () => {
    expect(
      toTypeScript({
        kind: 'object',
        properties: [
          { key: 'a-b', schema: { kind: 'union', options: [{ kind: 'string' }, { kind: 'literal', value: 1 }] } },
          { key: 'r', schema: { kind: 'record', value: { kind: 'date' }, optional: true } },
        ],
      }),
    ).toBe('{\n  "a-b": string | 1;\n  r?: Record<string, Date>;\n}');
  });
});

describe('models', () => {
  it('groups and filters the palette', () => {
    const palette = getPaletteModel(registry);

    expect(palette.categories.map((category) => category.name)).toEqual(['Basic', 'Choice', 'Structured']);
    expect(palette.categories[0]!.items.map((item) => item.label)).toEqual(['Text', 'Number', 'Checkbox', 'Date']);
    // Input types are searchable, but the palette shows one entry per field type.
    expect(getPaletteModel(registry, 'email').items.map((item) => item.id)).toEqual(['text']);
  });

  it('describes the canvas for the active step', () => {
    const builder = createFormBuilder();
    const id = builder.fields.add('string.email');
    const canvas = getCanvasModel(builder.getSnapshot());

    expect(canvas.steps).toHaveLength(1);
    expect(canvas.steps[0]).toMatchObject({ isActive: true, fieldCount: 1 });
    expect(canvas.fields[0]).toMatchObject({
      id,
      label: 'Email',
      isSelected: true,
      fieldType: { id: 'text' },
      inputType: { label: 'Email' },
    });
  });

  it('inspects a step, a field and a mixed multi-selection', () => {
    const builder = createFormBuilder();
    expect(getInspectorModel(builder.getSnapshot()).target.type).toBe('step');

    const a = builder.fields.add('choice', undefined, { key: 'firstChoice' });
    const field = getInspectorModel(builder.getSnapshot());
    const properties = field.sections.flatMap((section) => section.properties);
    const byPath = (path: string) => properties.find((property) => property.descriptor.path === path)!;

    expect(properties.map((property) => property.descriptor.path)).toEqual(
      expect.arrayContaining(['key', 'type', 'label', 'nameTransformCasing', 'defaultValue', 'props.options']),
    );
    expect(byPath('defaultValue').descriptor.control).toBe('value');
    expect(byPath('type').descriptor.options?.map((option) => option.label)).toEqual(['Dropdown', 'Radio group']);
    expect(byPath('label').hint).toBe('First Choice');
    expect(byPath('nameTransformCasing').hint).toBe('title');

    const b = builder.fields.add('boolean', undefined, { key: 'b', label: 'B' });
    builder.select(a);
    builder.select(b, 'toggle');
    const mixed = getInspectorModel(builder.getSnapshot());
    const label = mixed.sections[0]!.properties.find((property) => property.descriptor.path === 'label')!;

    expect(label.mixed).toBe(true);
    const mixedPaths = mixed.sections.flatMap((section) => section.properties.map((property) => property.descriptor.path));
    expect(mixedPaths).not.toContain('key');
    expect(mixedPaths).not.toContain('type');
    // A boolean field has no placeholder, so the shared selection hides it.
    expect(mixedPaths).not.toContain('placeholder');

    setInspectorValue(builder, 'isRequired', true);
    expect(builder.getField(a)?.isRequired).toBe(true);
    expect(builder.getField(b)?.isRequired).toBe(true);
    builder.history.undo();
    expect(builder.getField(a)?.isRequired).toBeUndefined();

    // Empty text clears optional properties so derived values apply again.
    setInspectorValue(builder, 'label', '');
    expect(builder.getField(b)).not.toHaveProperty('label');
  });

  it('surfaces definition issues on inspector properties', () => {
    const builder = createFormBuilder();
    builder.fields.add('text', undefined, { key: 'a' });
    const b = builder.fields.add('text', undefined, { key: 'b' });
    builder.fields.update(b, { key: 'a' });

    const key = getInspectorModel(builder.getSnapshot()).sections[0]!.properties[0]!;
    expect(key.error).toMatch(/already uses the key "a"/);
  });

  it('describes and switches step validation', () => {
    const builder = createFormBuilder();
    const stepId = builder.getSnapshot().activeStepId!;
    builder.fields.add('string.email', undefined, { isRequired: true });

    expect(getStepValidationModel(builder.getSnapshot(), stepId)).toMatchObject({ mode: 'inherit' });
    expect(getStepValidationModel(builder.getSnapshot(), stepId)).not.toHaveProperty('effectiveLibrary');

    builder.settings.update({ validator: 'builtin' });
    expect(getStepValidationModel(builder.getSnapshot(), stepId)).toMatchObject({
      mode: 'inherit',
      effectiveLibrary: 'builtin',
      formLibrary: 'builtin',
    });

    setStepValidationMode(builder, stepId, 'none');
    expect(getStepValidationModel(builder.getSnapshot(), stepId)).toMatchObject({ mode: 'none' });
    expect(getStepValidationModel(builder.getSnapshot(), stepId)).not.toHaveProperty('effectiveLibrary');

    setStepValidationMode(builder, stepId, 'schema', 'builtin');
    expect(builder.getStep(stepId)?.validation).toEqual({ kind: 'schema', library: 'builtin' });
  });

  it('describes form settings', () => {
    const builder = createFormBuilder();
    builder.fields.add('text', undefined, { key: 'firstName' });
    const model = getFormSettingsModel(builder.getSnapshot());

    expect(model.libraries).toEqual([{ library: 'builtin', label: 'Built-in' }]);
    expect(model.casings).toContainEqual({ value: 'kebab', label: 'kebab — first-name' });
  });

  it('edits schemas through the schema editor', () => {
    const builder = createFormBuilder();
    const id = builder.fields.add('object', undefined, { key: 'faces' });
    const actions = createSchemaEditorActions(builder, id);

    const key = actions.addProperty([], 'faces', 'array');
    actions.setKind([key, '#item'], 'object');
    actions.addProperty([key, '#item'], 'id');
    actions.addCheck([key, '#item', 'id'], 'minLength');
    actions.addProperty([], 'faces');

    const model = getSchemaEditorModel(builder.getSnapshot(), id)!;
    expect(model.root.children.map((child) => child.name)).toEqual(['faces', 'faces2']);
    expect(model.root.children[0]!.children[0]).toMatchObject({ role: 'item', schema: { kind: 'object' } });
    expect(model.root.children[0]!.children[0]!.children[0]!.schema).toEqual({
      kind: 'string',
      checks: [{ check: 'minLength', value: 1 }],
    });
    expect(model.root.availableChecks).toEqual([]);
    expect(builder.getField(id)?.defaultValue).toEqual({ faces: [], faces2: '' });

    actions.renameProperty([], 'faces2', 'label');
    actions.removeProperty([], 'faces');
    expect(builder.getField(id)?.schema).toEqual({
      kind: 'object',
      properties: [{ key: 'label', schema: { kind: 'string' } }],
    });
  });
});

describe('keyboard', () => {
  it('resolves shortcuts with platform-neutral modifiers and overrides', () => {
    expect(resolveShortcut({ key: 'z', metaKey: true })).toBe('undo');
    expect(resolveShortcut({ key: 'Z', ctrlKey: true, shiftKey: true })).toBe('redo');
    expect(resolveShortcut({ key: 'd', ctrlKey: true }, { 'mod+d': false })).toBeUndefined();
    expect(resolveShortcut({ key: 'k', ctrlKey: true }, { 'mod+k': 'duplicate' })).toBe('duplicate');
  });

  it('runs actions against the builder', () => {
    const builder = createFormBuilder();
    builder.fields.add('text', undefined, { key: 'a' });
    const b = builder.fields.add('text', undefined, { key: 'b' });
    const keys = () => builder.getSnapshot().definition.steps[0]!.fields.map((field) => field.key);

    expect(handleKeyDown(builder, { key: 'ArrowUp', altKey: true })).toBe(true);
    expect(keys()).toEqual(['b', 'a']);
    expect(handleKeyDown(builder, { key: 'ArrowUp', altKey: true })).toBe(false);

    handleKeyDown(builder, { key: 'd', metaKey: true });
    expect(keys()).toEqual(['b', 'b2', 'a']);

    handleKeyDown(builder, { key: 'ArrowDown' });
    expect(builder.getSnapshot().selection).toMatchObject({ fieldIds: [builder.getSnapshot().definition.steps[0]!.fields[2]!.id] });

    handleKeyDown(builder, { key: 'Delete' });
    expect(keys()).toEqual(['b', 'b2']);
    handleKeyDown(builder, { key: 'z', ctrlKey: true });
    expect(keys()).toEqual(['b', 'b2', 'a']);
    expect(builder.getField(b)).toBeDefined();
  });
});
