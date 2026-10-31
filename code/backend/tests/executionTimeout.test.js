import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { runCodeExecution } from '../controllers/executionController.js';

test('a stalled execution returns a clear gateway timeout instead of waiting indefinitely', async t => {
    const saved = [process.env.JDOODLE_CLIENT_ID, process.env.JDOODLE_CLIENT_SECRET];
    process.env.JDOODLE_CLIENT_ID = 'test-id';
    process.env.JDOODLE_CLIENT_SECRET = 'test-secret';
    t.after(() => {
        for (const [index, key] of ['JDOODLE_CLIENT_ID','JDOODLE_CLIENT_SECRET'].entries()) {
            if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index];
        }
    });
    t.mock.method(axios, 'post', async (_url, _payload, options) => {
        assert.equal(options.timeout, 30000);
        throw Object.assign(new Error('Request stalled'), {code:'ECONNABORTED'});
    });
    const res = { statusCode:200, status(code){this.statusCode=code;return this;}, json(body){this.body=body;return this;} };
    await runCodeExecution({body:{code:'print(1)',language:'python'}}, res);
    assert.equal(res.statusCode,504);
    assert.match(res.body.message,/30 seconds/);
});
