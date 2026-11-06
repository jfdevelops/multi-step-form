// @vitest-environment jsdom
/**
 * Renders the whole example and walks through it: the palette, the inspector (input type, casing,
 * default value), the schema editor, form settings and the live preview.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../src/App';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const all = (selector: string) => [...container.querySelectorAll<HTMLElement>(selector)];
const byText = (selector: string, text: string) => {
  const element = all(selector).find((candidate) => candidate.textContent?.trim() === text);
  if (!element) throw new Error(`No ${selector} with text "${text}"`);
  return element;
};
const labelled = <T extends HTMLElement>(text: string) => {
  const label = all('label').find((candidate) => candidate.textContent?.trim() === text) as HTMLLabelElement | undefined;
  const control = label && (document.getElementById(label.htmlFor) as T | null);
  if (!control) throw new Error(`No control labelled "${text}"`);
  return control;
};

async function click(element: HTMLElement) {
  await act(async () => element.click());
}

async function change(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  await act(async () => {
    const prototype = Object.getPrototypeOf(element) as object;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}

describe('form builder example', () => {
  it('starts from the sample and edits fields, schemas and settings', async () => {
    await renderApp();

    // The sample's first step, with labels resolved from keys.
    expect(all('.canvas-field').map((field) => field.querySelector('span')?.textContent)).toEqual([
      'First Name* firstName',
      'Last Name* lastName',
      'Email* email',
      'Phone Number phoneNumber',
    ]);

    // One text field type; the inspector picks the input type, which adds the email check.
    await click(byText('.palette-item', 'Text'));
    await change(labelled<HTMLSelectElement>('Input type'), 'string.email');
    expect(container.querySelector('.schema-editor')?.textContent).toContain('Email');

    // Keys drive labels, with the field's casing.
    await change(labelled<HTMLInputElement>('Key'), 'workEmail');
    await change(labelled<HTMLSelectElement>('Label casing'), 'sentence');
    expect(all('.canvas-field')[4]!.textContent).toContain('Work email');

    // A number's default value stays a number, even when the box is cleared.
    await click(byText('.palette-item', 'Number'));
    await change(labelled<HTMLInputElement>('Default value'), '');
    expect(labelled<HTMLInputElement>('Default value').value).toBe('0');

    // The schema editor builds nested values, and the default value follows.
    await click(byText('.palette-item', 'Group'));
    await click(byText('button', 'Add property'));
    expect(container.querySelector('.schema-property')).not.toBeNull();
    expect(container.querySelector('.nested-row .nested-key')?.textContent).toBe('property');

    // Form settings.
    const validator = all('.settings select')[0] as HTMLSelectElement;
    await change(validator, 'valibot');
    expect(validator.value).toBe('valibot');
  });

  it('previews the form and validates steps', async () => {
    await renderApp();

    expect(container.querySelector('.preview h3')?.textContent).toBe('Your information');

    // Required fields block the step and show their messages.
    await click(byText('.preview button', 'Next'));
    expect(container.querySelector('.preview h3')?.textContent).toBe('Your information');
    expect(all('.preview .error').map((error) => error.textContent)).toContain('Required');

    const inputs = all('.preview-field input') as HTMLInputElement[];
    await change(inputs[0]!, 'Ada');
    await change(inputs[1]!, 'Lovelace');
    await change(inputs[2]!, 'ada@example.com');
    expect(container.querySelector('.preview-actions .ok')?.textContent).toBe('Step complete');

    await click(byText('.preview button', 'Next'));
    expect(container.querySelector('.preview h3')?.textContent).toBe('Booking details');

    // Choices render from their options; nested values use the schema-driven editor.
    expect(all('.preview [role="radiogroup"] label').map((label) => label.textContent)).toEqual(['Come to me', 'I come to you']);
    expect(container.querySelector('.preview .nested')).not.toBeNull();
  });
});
