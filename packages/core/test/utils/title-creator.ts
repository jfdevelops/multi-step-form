export function titleCreator<testName extends string>(testName: testName) {
  return function <title extends string>(title: title) {
    return `${testName}:${title}` as const;
  };
}
