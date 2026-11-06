import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';
import { describe, expect, it } from 'vitest';
import {
  compileDefinition,
  compileStepValidator,
  createBuiltinValidator,
  createFormBuilder,
  createRegistry,
  fromStepsConfig,
  getCanvasModel,
  getInspectorModel,
  getPaletteModel,
  getStepValidationModel,
  handleKeyDown,
  resolveShortcut,
  setInspectorValue,
  setStepValidationMode,
  toSource,
  type FormDefinition,
  type StepDefinition,
} from '../src';

const registry = createRegistry();

function validate(step: StepDefinition, values: Record<string, unknown>) {
  const validator = compileStepValidator(step, registry)!;
  const result = validator['~standard'].validate(values) as {
    issues?: { message: string; path?: readonly PropertyKey[] }[];
  };

  return (result.issues ?? []).map((issue) => `${String(issue.path?.[0])}: ${issue.message}`);
}

const signupStep: StepDefinition = {
  id: 's1',
  title: 'Account',
  validation: {
    kind: 'schema',
    library: 'builtin',
    fields: {
      password: { type: 'string', checks: [{ check: 'minLength', value: 8 }] },
      confirm: {
        type: 'string',
        checks: [{ check: 'equalsField', field: 'password', message: 'Passwords must match' }],
      },
    },
  },
  fields: [
    { id: 'f1', key: 'email', type: 'string.email', defaultValue: '', isRequired: true },
    { id: 'f2', key: 'password', type: 'string.password', defaultValue: '', isRequired: true },
    { id: 'f3', key: 'confirm', type: 'string.password', defaultValue: '', isRequired: true },
    { id: 'f4', key: 'nickname', type: 'string', defaultValue: '' },
    {
      id: 'f5',
      key: 'plan',
      type: 'string.select',
      defaultValue: '',
      props: { options: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }] },
    },
  ],
};

describe('builtin validator', () => {
  it('combines inferred and explicit rules', () => {
    expect(validate(signupStep, { email: '', password: '', confirm: '', nickname: '', plan: '' })).toEqual([
      'email: Required',
      'password: Required',
      'confirm: Required',
    ]);

    expect(
      validate(signupStep, {
        email: 'nope',
        password: 'short',
        confirm: 'other',
        nickname: '',
        plan: 'enterprise',
      }),
    ).toEqual([
      'email: Must be a valid email address',
      'password: Must be at least 8 characters',
      'confirm: Passwords must match',
      'plan: Must be one of the allowed values',
    ]);

    expect(
      validate(signupStep, {
        email: 'a@b.co',
        password: 'long enough',
        confirm: 'long enough',
        nickname: '',
        plan: 'pro',
      }),
    ).toEqual([]);
  });

  it('validates types, numbers and dates', () => {
    const validator = createBuiltinValidator({
      age: { type: 'number', optional: false, checks: [{ check: 'min', value: 18 }, { check: 'integer' }] },
      start: { type: 'date', optional: true, checks: [{ check: 'min', value: '2026-01-01' }] },
    });
    const run = (values: Record<string, unknown>) =>
      (validator['~standard'].validate(values) as { issues?: unknown[] }).issues?.length ?? 0;

    expect(run({ age: 'x' })).toBe(1);
    expect(run({ age: 17.5 })).toBe(2);
    expect(run({ age: 30, start: new Date('2025-06-01') })).toBe(1);
    expect(run({ age: 30, start: new Date('2026-06-01') })).toBe(0);
    expect(run({ age: 30 })).toBe(0);
  });

  it("checks only presence for kind: 'required'", () => {
    const step: StepDefinition = { ...signupStep, validation: { kind: 'required' } };

    expect(validate(step, { email: 'not-an-email', password: 'x', confirm: 'y', nickname: '', plan: '' })).toEqual([]);
    expect(validate(step, { email: '', password: 'x', confirm: 'y' })).toEqual(['email: Required']);
  });
});

describe('compileDefinition', () => {
  const definition: FormDefinition = {
    schemaVersion: 1,
    id: 'signup',
    revision: 0,
    steps: [
      signupStep,
      {
        id: 's2',
        title: 'Profile',
        fields: [
          { id: 'f6', key: 'birthday', type: 'date', defaultValue: '2000-01-01T00:00:00.000Z' },
          { id: 'f7', key: 'newsletter', type: 'boolean.switch', defaultValue: false, label: 'Newsletter' },
        ],
      },
    ],
  };

  it('produces a config defineMultiStepForm accepts, with completeness from the validator', () => {
    const schema = defineMultiStepForm(compileDefinition(definition) as never).configure()();
    const steps = schema.stepSchema.value as Record<string, any>;

    expect(Object.keys(steps)).toEqual(['step1', 'step2']);
    expect(steps.step1.isComplete).toBe(false);
    expect(steps.step2.isComplete).toBe(true);
    expect(steps.step2.fields.birthday.defaultValue).toBeInstanceOf(Date);
    expect(steps.step2.fields.newsletter.label).toBe('Newsletter');
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

  it('round-trips a hand-written steps config', () => {
    const steps = {
      step1: {
        title: 'Contact',
        fields: {
          email: { defaultValue: '', type: 'string.email', isRequired: true, placeholder: 'you@example.com' },
          since: { defaultValue: new Date('2024-05-01T00:00:00.000Z') },
          prefs: { defaultValue: { theme: 'light' } },
        },
        validateFields: createBuiltinValidator({}),
      },
    };
    const schema = defineMultiStepForm({ steps }).configure()();
    const imported = fromStepsConfig(schema.stepSchema.original as Record<string, unknown>, { id: 'contact' });
    const step = imported.steps[0]!;

    expect(step.validation).toEqual({ kind: 'code', ref: 'step1.validateFields' });
    expect(step.fields.map(({ key, type, defaultValue }) => ({ key, type, defaultValue }))).toEqual([
      { key: 'email', type: 'string.email', defaultValue: '' },
      { key: 'since', type: 'date', defaultValue: '2024-05-01T00:00:00.000Z' },
      { key: 'prefs', type: 'object', defaultValue: { theme: 'light' } },
    ]);
    expect(step.fields[0]).toMatchObject({ isRequired: true, placeholder: 'you@example.com' });

    const builder = createFormBuilder({ initial: imported });
    expect(builder.getSnapshot().issues).toEqual([]);
  });

  it('exports source code with emitted validators', () => {
    const source = toSource(definition, { importFrom: '@jfdevelops/multi-step-form-core' });

    expect(source).toContain("import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';");
    expect(source).toContain('validateFields: createBuiltinValidator(');
    expect(source).toContain('defaultValue: new Date("2000-01-01T00:00:00.000Z")');
    expect(source).toMatch(/step2: \{\n\s+title: "Profile"/);
  });
});

describe('models', () => {
  it('groups and filters the palette', () => {
    const palette = getPaletteModel(registry);

    expect(palette.categories.map((category) => category.name)).toEqual(['Basic', 'Choice', 'Advanced']);
    expect(getPaletteModel(registry, 'toggle').items.map((item) => item.type)).toEqual(['boolean.switch']);
  });

  it('describes the canvas for the active step', () => {
    const builder = createFormBuilder();
    const id = builder.fields.add('string.email');
    const canvas = getCanvasModel(builder.getSnapshot());

    expect(canvas.steps).toHaveLength(1);
    expect(canvas.steps[0]).toMatchObject({ isActive: true, fieldCount: 1 });
    expect(canvas.fields[0]).toMatchObject({ id, isSelected: true, fieldType: { label: 'Email' } });
  });

  it('inspects a step, a field and a mixed multi-selection', () => {
    const builder = createFormBuilder();
    expect(getInspectorModel(builder.getSnapshot()).target.type).toBe('step');

    const a = builder.fields.add('string.select', undefined, { key: 'a', label: 'A' });
    const field = getInspectorModel(builder.getSnapshot());
    const paths = field.sections.flatMap((section) => section.properties.map((property) => property.descriptor.path));

    expect(paths).toEqual(expect.arrayContaining(['key', 'label', 'defaultValue', 'props.options']));
    expect(field.sections.find((section) => section.id === 'value')!.properties[0]!.descriptor.control).toBe('select');

    const b = builder.fields.add('boolean', undefined, { key: 'b', label: 'B' });
    builder.select(a);
    builder.select(b, 'toggle');
    const mixed = getInspectorModel(builder.getSnapshot());
    const label = mixed.sections[0]!.properties.find((property) => property.descriptor.path === 'label')!;

    expect(label.mixed).toBe(true);
    expect(mixed.sections.flatMap((section) => section.properties.map((property) => property.descriptor.path))).not.toContain('key');
    // A boolean field has no placeholder, so the shared selection hides it.
    expect(mixed.sections[0]!.properties.map((property) => property.descriptor.path)).not.toContain('placeholder');

    setInspectorValue(builder, 'isRequired', true);
    expect(builder.getField(a)?.isRequired).toBe(true);
    expect(builder.getField(b)?.isRequired).toBe(true);
    builder.history.undo();
    expect(builder.getField(a)?.isRequired).toBeUndefined();
  });

  it('surfaces definition issues on inspector properties', () => {
    const builder = createFormBuilder();
    builder.fields.add('string', undefined, { key: 'a' });
    const b = builder.fields.add('string', undefined, { key: 'b' });
    builder.fields.update(b, { key: 'a' });

    const key = getInspectorModel(builder.getSnapshot()).sections[0]!.properties[0]!;
    expect(key.error).toMatch(/already uses the key "a"/);
  });

  it('describes and switches step validation', () => {
    const builder = createFormBuilder();
    const stepId = builder.getSnapshot().activeStepId!;
    builder.fields.add('string.email', undefined, { isRequired: true });

    expect(getStepValidationModel(builder.getSnapshot(), stepId)!.mode).toBe('none');

    setStepValidationMode(builder, stepId, 'schema');
    const model = getStepValidationModel(builder.getSnapshot(), stepId)!;

    expect(model).toMatchObject({ mode: 'schema', library: 'builtin' });
    expect(model.fields[0]).toMatchObject({
      isCustomized: false,
      isRequired: true,
      rules: { type: 'string', checks: [{ check: 'email' }] },
    });
    expect(model.fields[0]!.availableChecks).toContain('pattern');
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
    builder.fields.add('string', undefined, { key: 'a' });
    const b = builder.fields.add('string', undefined, { key: 'b' });
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
