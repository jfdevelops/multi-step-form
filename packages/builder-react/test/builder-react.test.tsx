import {
  createFormBuilder,
  type FormBuilder as FormBuilderStore,
} from '@jfdevelops/multi-step-form-builder-core';
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ActionButton,
  AddStepButton,
  Canvas,
  CanvasField,
  DragHandle,
  FormBuilder,
  Inspector,
  InspectorProperty,
  Palette,
  PaletteItem,
  PaletteSearch,
  resolveDrop,
  StepList,
  StepTab,
  StepValidation,
} from '../src';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: { root: Root; container: HTMLElement }[] = [];

afterEach(async () => {
  for (const { root, container } of mounted.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
});

async function render(ui: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  await act(async () => root.render(ui));

  const query = <T extends HTMLElement = HTMLElement>(selector: string) => {
    const element = container.querySelector<T>(selector);

    if (!element) throw new Error(`No element matches ${selector}`);

    return element;
  };

  return { container, query, all: (selector: string) => [...container.querySelectorAll<HTMLElement>(selector)] };
}

async function click(element: HTMLElement, init: MouseEventInit = {}) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, ...init }));
  });
}

async function key(element: HTMLElement, init: KeyboardEventInit) {
  await act(async () => {
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  });
}

async function type(element: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function Builder({ builder }: { builder: FormBuilderStore }) {
  return (
    <FormBuilder builder={builder}>
      <Palette data-testid="palette">
        {({ categories }) => (
          <>
            <PaletteSearch data-testid="search" />
            {categories.map((category) =>
              category.items.map((item) => (
                <PaletteItem key={item.type} item={item} data-testid={`palette-${item.type}`}>
                  {item.label}
                </PaletteItem>
              )),
            )}
          </>
        )}
      </Palette>

      <StepList>
        {({ steps }) =>
          steps.map((step) => (
            <StepTab key={step.id} step={step} data-testid={`tab-${step.key}`}>
              {step.title}
            </StepTab>
          ))
        }
      </StepList>
      <AddStepButton data-testid="add-step">Add step</AddStepButton>

      <Canvas data-testid="canvas">
        {({ fields }) =>
          fields.map((field) => (
            <CanvasField key={field.id} field={field} data-testid={`field-${field.key}`} className="card">
              {({ isSelected }) => (
                <>
                  <DragHandle />
                  <span>{typeof field.field.label === 'string' ? field.field.label : field.key}</span>
                  {isSelected ? <em>selected</em> : null}
                </>
              )}
            </CanvasField>
          ))
        }
      </Canvas>

      <Inspector data-testid="inspector">
        {({ sections }) =>
          sections.map((section) => (
            <section key={section.id}>
              {section.properties.map((property) => (
                <InspectorProperty key={property.descriptor.path} property={property}>
                  {({ controlProps, labelProps, setValue, value, mixed, error, errorProps }) => (
                    <>
                      <label {...labelProps}>{property.descriptor.label}</label>
                      {property.descriptor.control === 'switch' ? (
                        <input
                          {...controlProps}
                          type="checkbox"
                          data-testid={`prop-${property.descriptor.path}`}
                          checked={Boolean(value)}
                          onChange={(event) => setValue(event.target.checked)}
                        />
                      ) : (
                        <input
                          {...controlProps}
                          data-testid={`prop-${property.descriptor.path}`}
                          placeholder={mixed ? 'Mixed' : undefined}
                          value={mixed ? '' : String(value ?? '')}
                          onChange={(event) => setValue(event.target.value)}
                        />
                      )}
                      {error ? <p {...errorProps}>{error}</p> : null}
                    </>
                  )}
                </InspectorProperty>
              ))}
            </section>
          ))
        }
      </Inspector>

      <StepValidation data-testid="validation">
        {({ mode, setMode, fields }) => (
          <>
            <span data-testid="validation-mode">{mode}</span>
            <button data-testid="use-schema" onClick={() => setMode('schema')}>Schema</button>
            <ul>
              {fields.map((entry) => (
                <li key={entry.field.id}>
                  {entry.field.key}:{entry.rules.checks?.map((check) => check.check).join(',')}
                </li>
              ))}
            </ul>
          </>
        )}
      </StepValidation>

      <ActionButton action="undo" data-testid="undo">Undo</ActionButton>
      <ActionButton action="delete" data-testid="delete">Delete</ActionButton>
    </FormBuilder>
  );
}

const fieldKeys = (builder: FormBuilderStore) =>
  builder.getSnapshot().definition.steps[0]!.fields.map((field) => field.key);

describe('headless builder components', () => {
  it('adds fields from the palette by click and keyboard', async () => {
    const builder = createFormBuilder();
    const { query } = await render(<Builder builder={builder} />);

    expect(query('[data-testid="palette-string.email"]').getAttribute('role')).toBe('option');
    await click(query('[data-testid="palette-string.email"]'));
    await key(query('[data-testid="palette-number"]'), { key: 'Enter' });

    expect(fieldKeys(builder)).toEqual(['email', 'number']);
    expect(query('[data-testid="field-email"]').className).toBe('card');
  });

  it('filters the palette with the search box', async () => {
    const builder = createFormBuilder();
    const { query, all } = await render(<Builder builder={builder} />);

    await type(query<HTMLInputElement>('[data-testid="search"]'), 'toggle');
    expect(all('[role="option"][data-type]').map((element) => element.dataset.type)).toEqual(['boolean.switch']);
  });

  it('selects fields with click modifiers and exposes state attributes', async () => {
    const builder = createFormBuilder();
    builder.fields.add('string', undefined, { key: 'a' });
    builder.fields.add('string', undefined, { key: 'b' });
    builder.fields.add('string', undefined, { key: 'c' });
    builder.select(null);
    const { query } = await render(<Builder builder={builder} />);

    await click(query('[data-testid="field-a"]'));
    await click(query('[data-testid="field-c"]'), { shiftKey: true });

    for (const keyName of ['a', 'b', 'c']) {
      const element = query(`[data-testid="field-${keyName}"]`);
      expect(element.getAttribute('aria-selected')).toBe('true');
      expect(element.hasAttribute('data-selected')).toBe(true);
    }

    await click(query('[data-testid="field-b"]'), { metaKey: true });
    expect(query('[data-testid="field-b"]').getAttribute('aria-selected')).toBe('false');
    expect(query('[data-testid="field-a"]').tabIndex).toBe(0);
    expect(query('[data-testid="field-c"]').tabIndex).toBe(-1);
  });

  it('handles keyboard shortcuts on the canvas', async () => {
    const builder = createFormBuilder();
    builder.fields.add('string', undefined, { key: 'a' });
    const b = builder.fields.add('string', undefined, { key: 'b' });
    const { query } = await render(<Builder builder={builder} />);
    const canvas = query('[data-testid="canvas"]');

    expect(builder.getSnapshot().selection).toMatchObject({ fieldIds: [b] });
    await key(canvas, { key: 'ArrowUp', altKey: true });
    expect(fieldKeys(builder)).toEqual(['b', 'a']);

    await key(canvas, { key: 'Delete' });
    expect(fieldKeys(builder)).toEqual(['a']);

    await key(canvas, { key: 'z', ctrlKey: true });
    expect(fieldKeys(builder)).toEqual(['b', 'a']);
  });

  it('ignores shortcuts typed into inputs inside the canvas', async () => {
    const builder = createFormBuilder();
    builder.fields.add('string', undefined, { key: 'a' });
    const { query } = await render(
      <FormBuilder builder={builder}>
        <Canvas>
          <input data-testid="inner" />
        </Canvas>
      </FormBuilder>,
    );

    await key(query('[data-testid="inner"]'), { key: 'Backspace' });
    expect(fieldKeys(builder)).toEqual(['a']);
  });

  it('edits the selection through the inspector with ARIA wiring and errors', async () => {
    const builder = createFormBuilder();
    builder.fields.add('string', undefined, { key: 'a' });
    const b = builder.fields.add('string', undefined, { key: 'b' });
    const { query } = await render(<Builder builder={builder} />);

    const label = query<HTMLInputElement>('[data-testid="prop-label"]');
    expect(query(`label[for="${label.id}"]`).textContent).toBe('Label');

    await type(label, 'Last name');
    expect(builder.getField(b)?.label).toBe('Last name');

    await type(query<HTMLInputElement>('[data-testid="prop-key"]'), 'a');
    const keyInput = query<HTMLInputElement>('[data-testid="prop-key"]');
    expect(keyInput.getAttribute('aria-invalid')).toBe('true');
    const errorId = keyInput.getAttribute('aria-describedby')!.split(' ').pop()!;
    expect(document.getElementById(errorId)?.textContent).toMatch(
      /already uses the key/,
    );

    await click(query<HTMLInputElement>('[data-testid="prop-isRequired"]'));
    expect(builder.getField(b)?.isRequired).toBe(true);
  });

  it('inspects the active step when no field is selected', async () => {
    const builder = createFormBuilder();
    const { query } = await render(<Builder builder={builder} />);

    expect(query('[data-testid="inspector"]').dataset.target).toBe('step');
    await type(query<HTMLInputElement>('[data-testid="prop-title"]'), 'Contact');
    expect(builder.getSnapshot().definition.steps[0]!.title).toBe('Contact');
    expect(query('[data-testid="tab-step1"]').textContent).toBe('Contact');
  });

  it('manages steps through tabs', async () => {
    const builder = createFormBuilder();
    const { query } = await render(<Builder builder={builder} />);

    await click(query('[data-testid="add-step"]'));
    const second = query('[data-testid="tab-step2"]');
    expect(second.getAttribute('aria-selected')).toBe('true');
    expect(query('[data-testid="canvas"]').getAttribute('aria-labelledby')).toBe(second.id);

    await key(second, { key: 'ArrowLeft' });
    expect(query('[data-testid="tab-step1"]').getAttribute('aria-selected')).toBe('true');
  });

  it('switches step validation and shows inferred rules', async () => {
    const builder = createFormBuilder();
    builder.fields.add('string.email');
    const { query } = await render(<Builder builder={builder} />);

    expect(query('[data-testid="validation-mode"]').textContent).toBe('none');
    await click(query('[data-testid="use-schema"]'));
    expect(query('[data-testid="validation-mode"]').textContent).toBe('schema');
    expect(query('[data-testid="validation"]').textContent).toContain('email:email');
  });

  it('disables action buttons that would do nothing', async () => {
    const builder = createFormBuilder();
    const { query } = await render(<Builder builder={builder} />);
    const undo = query<HTMLButtonElement>('[data-testid="undo"]');

    expect(undo.disabled).toBe(true);
    expect(query<HTMLButtonElement>('[data-testid="delete"]').disabled).toBe(true);

    await click(query('[data-testid="palette-string"]'));
    expect(undo.disabled).toBe(false);
    await click(query('[data-testid="delete"]'));
    expect(fieldKeys(builder)).toEqual([]);
    await click(undo);
    expect(fieldKeys(builder)).toEqual(['shortText']);
  });

  it('supports custom elements through render', async () => {
    const builder = createFormBuilder();
    const { query } = await render(
      <FormBuilder builder={builder}>
        <ActionButton action="undo" render={(props, { enabled }) => <a {...props} data-testid="link">{enabled ? 'on' : 'off'}</a>} />
      </FormBuilder>,
    );

    expect(query('[data-testid="link"]').tagName).toBe('A');
    expect(query('[data-testid="link"]').textContent).toBe('off');
  });
});

describe('resolveDrop', () => {
  const field = (index: number, group = 's1', initialIndex = index, initialGroup = group) => ({
    data: { kind: 'field', fieldId: 'f1', stepId: initialGroup, index: initialIndex },
    index,
    group,
    initialIndex,
    initialGroup,
  });

  it('uses the sortable position for reordered fields', () => {
    expect(resolveDrop(field(2, 's1', 0), field(2))).toEqual({
      source: { kind: 'field', fieldId: 'f1' },
      target: { stepId: 's1', index: 2 },
    });
    expect(resolveDrop(field(1), field(1))).toBeNull();
  });

  it('moves fields to the end of a step dropped on its tab', () => {
    expect(resolveDrop(field(0), { data: { kind: 'step', stepId: 's2', fieldCount: 3 } })).toEqual({
      source: { kind: 'field', fieldId: 'f1' },
      target: { stepId: 's2', index: 3 },
    });
    expect(resolveDrop(field(0), { data: { kind: 'step', stepId: 's1', fieldCount: 3 } })).toBeNull();
  });

  it('inserts palette items before the field they are dropped on, or at the end', () => {
    const palette = { data: { kind: 'palette', fieldType: 'string' } };

    expect(resolveDrop(palette, { data: { kind: 'field', fieldId: 'f2', stepId: 's1', index: 1 }, index: 1 })).toEqual({
      source: { kind: 'palette', fieldType: 'string' },
      target: { stepId: 's1', index: 1 },
    });
    expect(resolveDrop(palette, { data: { kind: 'canvas', stepId: 's1', fieldCount: 4 } })).toEqual({
      source: { kind: 'palette', fieldType: 'string' },
      target: { stepId: 's1', index: 4 },
    });
    expect(resolveDrop(palette, null)).toBeNull();
  });
});
