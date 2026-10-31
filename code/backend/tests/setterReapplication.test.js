import assert from 'node:assert/strict';
import test from 'node:test';
import { auth } from '../lib/auth.js';
import { User } from '../models/User.js';
import { SetterRequest } from '../models/SetterRequest.js';
import { applyForSetter, getSetterStatus } from '../controllers/setterController.js';

const userId = 'student';
const form = { institute: ' University ', deptProgram: 'CSE', currSemester: '4', cgpa: '3.5', profileLinks: 'https://example.com/student', motivation: 'I want to write problems.' };
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, set() { return this; }, json(body) { this.body = body; return this; } });
const req = body => ({ headers: {}, body });

function database(t) {
    const state = { requests: [], user: { role: 'student' }, failSave: false };
    t.mock.method(auth.api, 'getSession', async () => ({ user: { id: userId } }));
    let queue = Promise.resolve();
    t.mock.method(SetterRequest.db, 'transaction', async callback => {
        const previous = queue;
        let release;
        queue = new Promise(resolve => { release = resolve; });
        await previous;
        const backup = structuredClone(state.requests);
        try { return await callback({ testTransaction: true }); }
        catch (error) { state.requests = backup; throw error; }
        finally { release(); }
    });
    t.mock.method(User, 'findOneAndUpdate', async (filter, update, options) => {
        assert.deepEqual(filter.$or, [{ id: userId }]);
        assert.equal(filter.role, 'student');
        assert.deepEqual(filter.banned, { $ne: true });
        assert.equal(filter.disabledAt, null);
        assert.deepEqual(update, { $inc: { setterApplicationVersion: 1 } });
        assert.ok(options.session.testTransaction);
        return state.user?.role === 'student' && !state.user.banned && !state.user.disabledAt ? state.user : null;
    });
    t.mock.method(SetterRequest, 'findOne', filter => ({
        session: async session => {
            assert.ok(session.testTransaction);
            assert.deepEqual(filter, { userId, status: { $in: ['pending', 'accepted'] } });
            return state.requests.find(request => filter.status.$in.includes(request.status)) || null;
        },
        sort: async order => {
            assert.deepEqual(filter, { userId });
            assert.deepEqual(order, { createdAt: -1, _id: -1 });
            return state.requests.at(-1) || null;
        },
    }));
    t.mock.method(SetterRequest.prototype, 'save', async function (options) {
        assert.ok(options.session.testTransaction);
        if (state.failSave) throw new Error('Database unavailable');
        state.requests.push(this.toObject());
        return this;
    });
    t.mock.method(console, 'error', () => {});
    return state;
}

test('reapplication preserves the rejection and stores corrected fields as a new pending request', async t => {
    const state = database(t);
    const previous = { _id: 'previous', userId, status: 'rejected', decisionReason: 'Provide more experience', institute: 'Old institute', decidedBy: 'admin' };
    state.requests.push(previous);
    const res = response();
    await applyForSetter(req({ ...form, status: 'accepted', userId: 'forged' }), res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(state.requests[0], previous);
    assert.equal(state.requests.length, 2);
    assert.equal(state.requests[1].status, 'pending');
    assert.equal(state.requests[1].institute, 'University');
    assert.equal(state.requests[1].userId, userId);
    const status = response();
    await getSetterStatus(req(), status);
    assert.equal(status.body.status, 'pending');
    assert.equal(status.body.request.institute, 'University');
});

test('a first application saves successfully', async t => {
    const state = database(t);
    const res = response();
    await applyForSetter(req(form), res);
    assert.equal(res.statusCode, 201);
    assert.equal(state.requests.length, 1);
});

for (const status of ['pending', 'accepted']) {
    test(`${status} applications block another application`, async t => {
        const state = database(t);
        state.requests.push({ userId, status });
        const res = response();
        await applyForSetter(req(form), res);
        assert.equal(res.statusCode, 409);
        assert.equal(state.requests.length, 1);
    });
}

test('simultaneous reapplications create only one pending request', async t => {
    const state = database(t);
    state.requests.push({ userId, status: 'rejected' });
    const responses = [response(), response()];
    await Promise.all(responses.map(res => applyForSetter(req(form), res)));
    assert.deepEqual(responses.map(res => res.statusCode).sort(), [201, 409]);
    assert.equal(state.requests.filter(request => request.status === 'pending').length, 1);
    assert.equal(state.requests.filter(request => request.status === 'rejected').length, 1);
});

test('failed reapplication keeps earlier decisions and can be retried', async t => {
    const state = database(t);
    state.requests.push({ userId, status: 'rejected', decisionReason: 'Missing details' });
    state.failSave = true;
    const res = response();
    await applyForSetter(req(form), res);
    assert.equal(res.statusCode, 500);
    assert.equal(state.requests.length, 1);
    assert.equal(state.requests[0].decisionReason, 'Missing details');
    state.failSave = false;
    const retry = response();
    await applyForSetter(req(form), retry);
    assert.equal(retry.statusCode, 201);
});

test('invalid or empty form fields are rejected', async t => {
    database(t);
    for (const changes of [{ institute: '   ' }, { cgpa: {} }, { motivation: 'x'.repeat(5001) }]) {
        const res = response();
        await applyForSetter(req({ ...form, ...changes }), res);
        assert.equal(res.statusCode, 400);
    }
});

test('non-students and inactive accounts cannot apply', async t => {
    const state = database(t);
    for (const user of [{ role: 'problem_setter' }, { role: 'admin' }, { role: 'student', banned: true }, { role: 'student', disabledAt: new Date() }, null]) {
        state.user = user;
        const res = response();
        await applyForSetter(req(form), res);
        assert.equal(res.statusCode, 403);
        assert.equal(state.requests.length, 0);
    }
});

test('anonymous users cannot apply or read application status', async t => {
    database(t);
    t.mock.method(auth.api, 'getSession', async () => null);
    for (const handler of [applyForSetter, getSetterStatus]) {
        const res = response();
        await handler(req(form), res);
        assert.equal(res.statusCode, 401);
    }
});
