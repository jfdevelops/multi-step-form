import { afterEach, expect, it, vi } from 'vitest';
import { editorTypes } from '../editor-types';

/** Exercise Vite's hooks with just the context methods each hook uses. */
afterEach(() => vi.useRealTimers());

it('watches declaration files and refreshes cached type bundles after a rebuild', () => {
  vi.useFakeTimers();
  const plugin = editorTypes(['@jfdevelops/react-multi-step-form']);
  const watched: string[] = [];
  const load = plugin.load;
  const hotUpdate = plugin.handleHotUpdate;

  if (typeof load !== 'function' || typeof hotUpdate !== 'function') {
    throw new Error('Expected callable Vite hooks');
  }

  Reflect.apply(load, { addWatchFile: (file: string) => watched.push(file) }, [
    '\0virtual:editor-types/@jfdevelops/react-multi-step-form',
  ]);
  const declaration = watched.find((file) => file.replaceAll('\\', '/').endsWith('/core/dist/define.d.mts'))!;
  const module = { id: '\0virtual:editor-types/@jfdevelops/react-multi-step-form' };
  const invalidateModule = vi.fn();
  const send = vi.fn();
  const server = {
    moduleGraph: { idToModuleMap: new Map([[module.id, module]]), invalidateModule },
    ws: { send },
  };

  expect(declaration).toBeDefined();
  Reflect.apply(hotUpdate, undefined, [{ file: declaration, server }]);
  Reflect.apply(hotUpdate, undefined, [{ file: declaration, server }]);
  vi.runAllTimers();

  expect(invalidateModule).toHaveBeenCalledWith(module);
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'full-reload' });
});
