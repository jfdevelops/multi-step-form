// @vitest-environment jsdom
/**
 * Renders the whole example and walks through it: the palette, the inspector (input type, casing,
 * default value), the schema editor, form settings and the live preview.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';

vi.mock('../src/monaco', () => ({
  loadTypes: async () => {},
  syncGeneratedFiles: vi.fn(),
  disposeGeneratedFiles: vi.fn(),
}));

vi.mock('@monaco-editor/react', () => ({
  default: function Editor({ path, value }: { path: string; value: string }) {
    return <pre data-editor-path={path}>{value}</pre>;
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('PointerEvent', MouseEvent);
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
  }));
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

let root: Root | undefined;
let container: HTMLElement;

afterEach(async () => {
  await act(async () => root?.unmount());
  container.remove();
});

async function renderApp() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(<App />));
}

const all = (selector: string) => [...document.body.querySelectorAll<HTMLElement>(selector)];
const byText = (selector: string, text: string) => {
  const element = all(selector).find((candidate) => candidate.textContent?.trim() === text);
  if (!element) throw new Error(`No ${selector} with text "${text}"`);
  return element;
};
const labelled = <T extends HTMLElement>(text: string) => {
  const label = all('label').find((candidate) => candidate.textContent?.trim() === text) as
    HTMLLabelElement | undefined;
  const control = label && (document.getElementById(label.htmlFor) as T | null);
  if (!control) throw new Error(`No control labelled "${text}"`);
  return control;
};

async function click(element: HTMLElement) {
  await act(async () => {
    element.focus();
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: false }));
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, ctrlKey: false }));
    element.click();
  });
}

async function change(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  await act(async () => {
    const prototype = Object.getPrototypeOf(element) as object;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(
      new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }),
    );
  });
}

describe('form builder example', () => {
  it('starts from the sample and edits fields, schemas and settings', async () => {
    await renderApp();

    expect(container.querySelector('[data-slot="sidebar"][data-side="left"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="sidebar"][data-side="right"]')).not.toBeNull();

    // The sample's first step, with labels resolved from keys.
    expect(all('.canvas-field').map((field) => field.querySelector('span')?.textContent)).toEqual([
      'First Name*',
      'Last Name*',
      'Email*',
      'Organization',
    ]);

    // One text field type; the inspector picks the input type, which adds the email check.
    await click(byText('.palette-item', 'Text'));
    await click(byText('.inspector [data-slot="accordion-trigger"]', 'Validation'));
    await change(labelled<HTMLSelectElement>('Input type'), 'string.email');
    expect(container.querySelector('.inspector')?.textContent).toContain('Email');

    // Keys drive labels, with the field's casing.
    await click(byText('.inspector [data-slot="accordion-trigger"]', 'Data'));
    await change(labelled<HTMLInputElement>('Key'), 'workEmail');
    await click(byText('.inspector [data-slot="accordion-trigger"]', 'Advanced'));
    await change(labelled<HTMLSelectElement>('Label casing'), 'sentence');
    expect(all('.canvas-field')[4]!.textContent).toContain('Work email');

    // A number's default value stays a number, even when the box is cleared.
    await click(byText('.palette-item', 'Number'));
    const dataSection = byText('.inspector [data-slot="accordion-trigger"]', 'Data');
    if (dataSection.getAttribute('data-state') !== 'open') {
      await click(byText('.inspector [data-slot="accordion-trigger"]', 'Data'));
    }
    await change(labelled<HTMLInputElement>('Default value'), '');
    expect(labelled<HTMLInputElement>('Default value').value).toBe('0');

    // The schema editor builds nested values, and the default value follows.
    await click(byText('.palette-item', 'Group'));
    await click(byText('button', 'Add property'));
    expect(container.querySelector('.schema-property')).not.toBeNull();
    expect(container.querySelector('.nested-row .nested-key')?.textContent).toBe('property');

    // Form settings.
    await click(document.querySelector<HTMLElement>('[aria-label="Form settings"]')!);
    const validator = all('.settings select')[0] as HTMLSelectElement;
    await change(validator, 'valibot');
    expect(validator.value).toBe('valibot');
  });

  it('edits persistence in the settings sheet and retains the setting after closing it', async () => {
    await renderApp();
    const trigger = document.querySelector<HTMLElement>('[aria-label="Form settings"]')!;
    await click(trigger);
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Form settings');
    await click(byText('[role="tab"]', 'Storage'));
    expect(labelled<HTMLInputElement>('Storage key').disabled).toBe(true);
    await click(labelled<HTMLElement>('Persist progress'));
    expect(labelled<HTMLInputElement>('Storage key').disabled).toBe(false);
    await change(labelled<HTMLInputElement>('Storage key'), 'workshop-progress');
    await click(byText('button', 'Done'));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await click(trigger);
    await click(byText('[role="tab"]', 'Storage'));
    expect(labelled<HTMLInputElement>('Storage key').value).toBe('workshop-progress');
    await click(labelled<HTMLElement>('Persist progress'));
    expect(labelled<HTMLInputElement>('Storage key').disabled).toBe(true);
  });

  it('adds, renames and removes named instances with undo support', async () => {
    await renderApp();

    await click(document.querySelector<HTMLElement>('[aria-label="Form settings"]')!);
    await click(all('[role="tab"]').find((tab) => tab.textContent?.startsWith('Instances'))!);
    await click(byText('button', 'Add instance'));
    await click(byText('button', 'Done'));
    await click(document.querySelector<HTMLElement>('[aria-label="Undo"]')!);
    await click(document.querySelector<HTMLElement>('[aria-label="Form settings"]')!);
    await click(all('[role="tab"]').find((tab) => tab.textContent?.startsWith('Instances'))!);
    expect(all('.instance-row')).toHaveLength(0);
    await click(byText('button', 'Done'));
    await click(document.querySelector<HTMLElement>('[aria-label="Redo"]')!);
    await click(document.querySelector<HTMLElement>('[aria-label="Form settings"]')!);
    await click(all('[role="tab"]').find((tab) => tab.textContent?.startsWith('Instances'))!);
    const first = document.querySelector<HTMLInputElement>('[aria-label="Instance 1 name"]')!;
    expect(first.value).toBe('instance1');
    await change(first, 'organizer');
    await click(byText('button', 'Add instance'));
    expect(all('.instance-row input').map((input) => (input as HTMLInputElement).value)).toEqual([
      'organizer',
      'instance1',
    ]);

    await click(document.querySelector<HTMLElement>('[aria-label="Remove instance 1"]')!);
    expect(all('.instance-row input').map((input) => (input as HTMLInputElement).value)).toEqual([
      'instance1',
    ]);

    await click(document.querySelector<HTMLElement>('[aria-label="Remove instance 1"]')!);
    expect(all('.instance-row')).toHaveLength(0);
    expect(all('.settings .error')).toHaveLength(0);
  });

  it('shows generated modules in file tabs and falls back when a selected file disappears', async () => {
    await renderApp();
    await click(byText('[role="tab"]', 'Code'));
    await act(async () => {
      await import('../src/code-panel');
    });

    expect(all('.file-tabs button').map((button) => button.textContent)).toEqual([
      'form.ts',
      'steps/step1.ts',
      'steps/step2.ts',
      'steps/step3.ts',
    ]);
    expect(container.querySelector('pre')?.textContent).toContain("import { step1 } from './steps/step1.js'");
    await click(byText('.file-tabs button', 'steps/step2.ts'));
    expect(container.querySelector('pre')?.textContent).toContain('Hands-on lab');
    expect(container.querySelector('pre')?.textContent).toContain('export const step2Schema');
    expect(container.querySelector('pre')?.textContent).toContain('defineMultiStepForm.defineStep({');
    expect(container.querySelector('pre')?.textContent).not.toContain('../validators.js');
    expect(container.querySelector('pre')?.getAttribute('data-editor-path')).toBe(
      'file:///generated/steps/step2.ts',
    );
    await act(async () =>
      byText('.file-tabs button', 'steps/step2.ts').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
      ),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.querySelector('pre')?.getAttribute('data-editor-path')).toBe(
      'file:///generated/form.ts',
    );
    await click(byText('[role="tab"]', 'Standard Schema'));
    expect(all('.file-tabs button').map((button) => button.textContent)).toEqual([
      'steps/step1.ts',
      'steps/step2.ts',
      'steps/step3.ts',
    ]);
    await click(byText('[role="tab"]', 'Generated code'));
    await click(byText('.file-tabs button', 'steps/step3.ts'));
    await click(document.querySelector<HTMLElement>('[aria-label="More actions"]')!);
    await click(byText('[role="menuitem"]', 'Clear form'));
    expect(all('.file-tabs button').map((button) => button.textContent)).toEqual([
      'form.ts',
      'steps/step1.ts',
    ]);
    expect(container.querySelector('pre')?.getAttribute('data-editor-path')).toBe(
      'file:///generated/form.ts',
    );
  });

  it('preserves preview values across modes and widths, and reveals errors after interaction', async () => {
    await renderApp();
    expect(container.querySelector<HTMLDivElement>('[data-mode="preview"]')?.hidden).toBe(true);
    await click(byText('[role="tab"]', 'Preview'));
    const input = container.querySelector<HTMLInputElement>('.preview-field input')!;
    expect(all('.preview .error')).toHaveLength(0);
    await act(async () => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    expect(all('.preview .error')).toHaveLength(1);
    await change(input, 'Ada');
    await click(byText('button', 'Mobile'));
    expect(container.querySelector('.preview-surface')?.getAttribute('data-width')).toBe('mobile');
    await click(byText('[role="tab"]', 'Build'));
    expect(container.querySelector<HTMLDivElement>('[data-mode="preview"]')?.hidden).toBe(true);
    await click(byText('[role="tab"]', 'Preview'));
    expect(container.querySelector<HTMLInputElement>('.preview-field input')?.value).toBe('Ada');
    await click(byText('.preview button', 'Reset'));
    expect(all('.preview .error')).toHaveLength(0);
    const toggle = all('.preview-options [role="checkbox"]')[0]!;
    await click(toggle);
    expect(all('.preview .error').length).toBeGreaterThan(1);
  });

  it('derives new field keys from labels until a key is explicitly edited', async () => {
    await renderApp();
    await click(byText('.palette-item', 'Text'));
    await change(labelled<HTMLInputElement>('Label'), 'Company size');
    await click(byText('.inspector [data-slot="accordion-trigger"]', 'Data'));
    expect(labelled<HTMLInputElement>('Key').value).toBe('companySize');
    await change(labelled<HTMLInputElement>('Key'), 'headcount');
    await change(labelled<HTMLInputElement>('Label'), 'Team size');
    expect(labelled<HTMLInputElement>('Key').value).toBe('headcount');
    await click(byText('button', 'Edit step settings'));
    expect(container.querySelector('.inspector h2')?.textContent).toBe('Step settings');
    await click(container.querySelector<HTMLElement>('[aria-label="Actions for headcount"]')!);
    await click(byText('[role="menuitem"]', 'Remove field'));
    expect(all('.canvas-field')).toHaveLength(4);
  });

  it('previews the form and validates steps', async () => {
    await renderApp();
    await click(byText('[role="tab"]', 'Preview'));
    expect(all('.preview .error')).toHaveLength(0);
    expect(container.querySelector('.preview-actions')?.textContent).not.toContain('incomplete');

    expect(container.querySelector('.preview h3')?.textContent).toBe('Organizer');

    // Required fields block the step and show their messages.
    await click(byText('.preview button', 'Next'));
    expect(container.querySelector('.preview h3')?.textContent).toBe('Organizer');
    expect(all('.preview .error').map((error) => error.textContent)).toContain('Required');

    const inputs = all('.preview-field input') as HTMLInputElement[];
    await change(inputs[0]!, 'Ada');
    await change(inputs[1]!, 'Lovelace');
    await change(inputs[2]!, 'ada@example.com');
    expect(container.querySelector('.preview-actions .ok')?.textContent).toBe('Step complete');

    await click(byText('.preview button', 'Next'));
    expect(container.querySelector('.preview h3')?.textContent).toBe('Workshop plan');

    // Choices render from their options; nested values use the schema-driven editor.
    expect(all('.preview [role="radiogroup"] label').map((label) => label.textContent)).toEqual([
      'Hands-on lab',
      'Live demonstration',
    ]);
    expect(container.querySelector('.preview .nested')).not.toBeNull();
  });
});
