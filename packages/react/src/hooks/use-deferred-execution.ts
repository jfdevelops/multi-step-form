import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';

const useCommitEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Returns a stable callback that invokes the latest committed function and
 * arguments.
 */
export function useDeferredExecution<
  functionArguments extends unknown[],
  result,
>(
  callback: (...functionArguments: functionArguments) => result,
  ...functionArguments: functionArguments
) {
  const executionRef = useRef({ callback, functionArguments });

  useCommitEffect(() => {
    executionRef.current = { callback, functionArguments };
  });

  return useCallback(
    () =>
      executionRef.current.callback(
        ...executionRef.current.functionArguments,
      ),
    [],
  );
}
