import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { judgeSubmission } from '../services/judgingService.js';

test('remote testcases retain batching, normalization, timeouts and result fields', async t => {
    const previous = { id: process.env.JDOODLE_CLIENT_ID, secret: process.env.JDOODLE_CLIENT_SECRET };
    process.env.JDOODLE_CLIENT_ID = 'test-client';
    process.env.JDOODLE_CLIENT_SECRET = 'test-secret';
    t.after(() => {
        for (const [key, value] of [['JDOODLE_CLIENT_ID', previous.id], ['JDOODLE_CLIENT_SECRET', previous.secret]]) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });
    t.mock.method(console, 'log', () => {});
    const downloads = t.mock.method(axios, 'get', async (url, options) => {
        assert.deepEqual(options, { responseType: 'text', timeout: 15000 });
        return { data: url.endsWith('/input') ? '1\r\n///\r\n2' : '2\r\n///\r\n4' };
    });
    const execution = t.mock.method(axios, 'post', async (url, payload, options) => {
        assert.equal(url, 'https://api.jdoodle.com/v1/execute');
        assert.equal(options.timeout, 30000);
        assert.equal(payload.stdin, '1\n///\n2');
        assert.match(payload.script, /CODINGLAB_RUNTIME_/);
        return { data: { output: ' 2\r\n///\r\n4\n', statusCode: 200, cpuTime: '0.0016', memory: '100' } };
    });
    const result = await judgeSubmission({
        problem: { title: 'Double', hiddenInput: 'https://example.test/input', hiddenOutput: 'https://example.test/output', timeLimit: 1000, memoryLimit: 256 },
        code: 'print(int(input()) * 2)', language: 'python'
    });
    assert.deepEqual(result, {
        dbVerdict: 'Accepted', evaluationVerdict: 'AC', timeTaken: 2,
        memoryUsed: 100, compileOutput: '', jdoodleOutput: ' 2\r\n///\r\n4\n'
    });
    assert.equal(downloads.mock.callCount(), 2);
    assert.equal(execution.mock.callCount(), 1);
});
test('evaluates c++ output matching despite CRLF and whitespace differences', async t => {
    const previous = { id: process.env.JDOODLE_CLIENT_ID, secret: process.env.JDOODLE_CLIENT_SECRET };
    process.env.JDOODLE_CLIENT_ID = 'test-client';
    process.env.JDOODLE_CLIENT_SECRET = 'test-secret';
    t.after(() => {
        for (const [key, value] of [['JDOODLE_CLIENT_ID', previous.id], ['JDOODLE_CLIENT_SECRET', previous.secret]]) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });
    t.mock.method(console, 'log', () => {});
    t.mock.method(axios, 'post', async (url, payload, options) => {
        return { data: { output: 'Hello World\r\n///\r\nLine1\r\nLine2\r\n', statusCode: 200, cpuTime: '0.005', memory: '120' } };
    });
    const result = await judgeSubmission({
        problem: { title: 'Test', hiddenInput: '1\n///\n2', hiddenOutput: 'Hello World\n///\nLine1\nLine2\n', timeLimit: 1000, memoryLimit: 256 },
        code: '#include <iostream>\nint main() { return 0; }', language: 'cpp'
    });
    assert.equal(result.dbVerdict, 'Accepted');
    assert.equal(result.evaluationVerdict, 'AC');
});
