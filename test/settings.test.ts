import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileRules, sanitize } from '../src/settings.ts';

test('rules transform complete mailto URLs without changing prose or Markdown', () => {
  const rules = compileRules({
    rules: [{
      pattern: '^mailto:([^?\\s]+)(?:\\?[^\\s]*)?$',
      flags: 'i',
      replacement: '$1',
    }],
  });

  assert.equal(sanitize('MAILTO:hello@example.com?subject=Hello', rules), 'hello@example.com');
  for (const text of ['hello@example.com', 'Contact mailto:hello@example.com', '[Email](mailto:hello@example.com)']) {
    assert.equal(sanitize(text, rules), text);
  }
});

test('rules run in order, support captures and reset stateful regexes between copies', () => {
  const rules = compileRules({
    rules: [
      { pattern: 'a', flags: 'gy', replacement: 'b' },
      { pattern: '(b+)', flags: 'g', replacement: '[$1]' },
    ],
  });

  assert.equal(sanitize('aa aa', rules), '[bb] aa');
  assert.equal(sanitize('aa aa', rules), '[bb] aa');
  const sticky = compileRules({ rules: [{ pattern: 'a', flags: 'y', replacement: '' }] });
  assert.equal(sanitize('a', sticky), '');
  assert.equal(sanitize('a', sticky), '');
});

test('missing and empty rules leave text unchanged', () => {
  for (const settings of [undefined, {}, { rules: [] }]) {
    assert.equal(sanitize('mailto:hello@example.com', compileRules(settings)), 'mailto:hello@example.com');
  }
});

test('invalid settings and rules are diagnosed while valid rules still work', context => {
  const errors = context.mock.method(console, 'error', () => {});
  for (const settings of [null, [], 'invalid', { rules: {} }]) {
    assert.deepEqual(compileRules(settings), []);
  }

  const rules = compileRules({
    rules: [
      { pattern: '[', replacement: '' },
      { pattern: '.', flags: 'gg', replacement: '' },
      { pattern: '.', replacement: 1 },
      { pattern: '.', flags: 1, replacement: '' },
      null,
      { pattern: '\\u200B', flags: 'g', replacement: '' },
    ],
  });

  assert.equal(errors.mock.callCount(), 9);
  assert.match(String(errors.mock.calls[4].arguments[0]), /Rule 1: Invalid regular expression/);
  assert.equal(sanitize('a\u200Bb\u200B', rules), 'ab');
});
