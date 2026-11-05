import type { ReactElement } from 'react';
import { act, useLayoutEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { useDeferredExecution } from '../src';

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

  return { container, root };
}

describe('useDeferredExecution', () => {
  it('keeps a stable callback that uses the latest committed arguments', async () => {
    const execute = vi.fn((value: string) => `executed:${value}`);
    const deferredFunctions: Array<() => string> = [];
    let executionResult: string | undefined;

    function DeferredExecution({ value }: { value: string }) {
      const deferredExecution = useDeferredExecution(execute, value);

      expectTypeOf(deferredExecution).toEqualTypeOf<() => string>();

      useLayoutEffect(() => {
        deferredFunctions.push(deferredExecution);
      });

      return (
        <button
          type='button'
          onClick={() => {
            executionResult = deferredExecution();
          }}
        >
          Execute
        </button>
      );
    }

    const { container, root } = await renderInJsdom(
      <DeferredExecution value='first' />,
    );

    await act(async () => {
      root.render(<DeferredExecution value='second' />);
    });

    expect(deferredFunctions).toHaveLength(2);
    expect(deferredFunctions[1]).toBe(deferredFunctions[0]);

    await act(async () => {
      container.querySelector('button')?.click();
    });

    expect(executionResult).toBe('executed:second');
    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith('second');
  });
});
