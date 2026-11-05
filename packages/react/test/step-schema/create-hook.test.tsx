import type { ReactElement } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = [];

afterEach(async () => {
  for (const { container, root } of mountedRoots.splice(0)) {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  }
});

async function renderInJsdom(ui: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ container, root });

  await act(async () => {
    root.render(ui);
  });

  return container;
}

function createSchema() {
  return defineMultiStepForm({
    steps: {
      step1: {
        fields: {
          consent: {
            defaultValue: {
              promptOpen: false,
              resolvedFor: '',
            },
          },
        },
        title: 'Step 1',
      },
    },
  }).configure()();
}

describe('createHook', () => {
  it('schedules a prepared patch after commit', async () => {
    const schema = createSchema();
    const step = schema.stepSchema.value.step1;
    const patchConsent = step.createUpdate.patch({
      fields: ['fields.consent.defaultValue'],
    });
    const useOpenConsent = step.createHook({
      function: patchConsent,
      render({ run, useSelector }) {
        const promptOpen = useSelector(
          ({ step1 }) => step1.fields.consent.defaultValue.promptOpen,
        );

        run.forConditions([!promptOpen], { promptOpen: true });

        return promptOpen;
      },
    });
    const ConsentState = step.createComponent({
      render() {
        const promptOpen = useOpenConsent();

        return <output data-testid='open'>{String(promptOpen)}</output>;
      },
    });
    const container = await renderInJsdom(<ConsentState />);

    expect(container.querySelector('[data-testid="open"]')?.textContent).toBe(
      'true',
    );
  });

  it('adapts a named createComponent function', async () => {
    const schema = createSchema();
    const step = schema.stepSchema.value.step1;
    const useResolveConsent = step.createHook({
      function: 'onInputChange',
      render({ run }) {
        run({
          fields: ['fields.consent.defaultValue'],
          updater: ({ ctx }) => ({
            ...ctx.step1.fields.consent.defaultValue,
            resolvedFor: 'current',
          }),
        });
      },
    });
    const ConsentState = step.createComponent({
      render({ useSelector }) {
        useResolveConsent();
        const resolvedFor = useSelector(
          ({ step1 }) => step1.fields.consent.defaultValue.resolvedFor,
        );

        return <output data-testid='resolved'>{resolvedFor}</output>;
      },
    });
    const container = await renderInJsdom(<ConsentState />);

    expect(
      container.querySelector('[data-testid="resolved"]')?.textContent,
    ).toBe('current');
  });
});
