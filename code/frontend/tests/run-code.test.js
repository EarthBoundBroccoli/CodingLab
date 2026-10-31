import test from 'node:test';
import assert from 'node:assert/strict';
import { missingRunInput, runCode } from '../src/lib/run-code.js';
import { boilerplates } from '../src/lib/editor-templates.js';

test('custom input guard allows input-free problems and supplied sample input', () => {
  const problem = { samples: [{ input: '2 3' }] };
  assert.equal(missingRunInput(problem, '  '), true);
  assert.equal(missingRunInput(problem, '2 3'), false);
  assert.equal(missingRunInput({ samples: [{ input: '' }] }, ''), false);
});

for (const contest of [false, true]) {
  for (const language of ['cpp', 'java', 'python']) {
    test(`${contest ? 'contest' : 'practice'} runs ${language} with the current code and custom input`, async () => {
      const code = boilerplates[language] + '\n// edited by user';
      assert.equal(typeof boilerplates[language], 'string');
      let calls = 0;
      const result = await runCode({ baseURL: 'https://api.example.test', code, language, customInput: '2\n3', contest }, async (url, body, options) => {
        calls++;
        assert.equal(url, 'https://api.example.test/api/submissions/run');
        assert.deepEqual(body, { code, language, customInput: '2\n3' });
        assert.deepEqual(options, {
          headers: { 'Content-Type': 'application/json' }, withCredentials: true, timeout: 90000
        });
        return { status: 200, data: { output: '5', statusCode: 0, memory: 128, cpuTime: '0.01' } };
      });
      assert.equal(calls, 1);
      assert.deepEqual(result, { output: '5', statusCode: 0, memory: 128, cpuTime: '0.01', isError: false });
    });
  }

  test(`${contest ? 'contest' : 'practice'} preserves timeout and server error output`, async () => {
    const args = { baseURL: '', code: 'code', language: 'cpp', customInput: '', contest };
    const timeout = await runCode(args, async () => { throw { code: 'ECONNABORTED' }; });
    assert.equal(timeout.isError, true);
    assert.match(timeout.output, /90 seconds/);
    const error = await runCode(args, async () => {
      throw { response: { data: { message: 'Execution unavailable', error: { output: 'Details' } } } };
    });
    assert.deepEqual(error, { output: contest ? 'Execution unavailable' : 'Execution unavailable\nDetails', isError: true });
  });
}
