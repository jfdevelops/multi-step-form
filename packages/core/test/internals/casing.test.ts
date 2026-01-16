import { changeCasing } from '@/utils';
import { it, expect } from 'vitest';

it('should change the casing of a string', () => {
  const result = changeCasing('hello world', 'title');
  expect(result).toBe('Hello World');

  const result2 = changeCasing('hello world', 'camel');
  expect(result2).toBe('helloWorld');

  const result3 = changeCasing('hello world', 'snake');
  expect(result3).toBe('hello_world');

  const result4 = changeCasing('hello world', 'kebab');
  expect(result4).toBe('hello-world');

  const result5 = changeCasing('hello world', 'pascal');
  expect(result5).toBe('HelloWorld');

  const result6 = changeCasing('hello world', 'upper');
  expect(result6).toBe('HELLO WORLD');

  const result7 = changeCasing('hello world', 'lower');
  expect(result7).toBe('hello world');

  const result8 = changeCasing('hello world', 'sentence');
  expect(result8).toBe('Hello world');

  const result9 = changeCasing('hello world', 'flat');
  expect(result9).toBe('helloworld');
});
