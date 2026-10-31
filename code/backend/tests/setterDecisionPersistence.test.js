import assert from 'node:assert/strict';
import test from 'node:test';
import { SetterRequest } from '../models/SetterRequest.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { decideSetterRequest } from '../controllers/adminController.js';

const id = '507f1f77bcf86cd799439011';
const userId = 'auth-string-id';
const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});
const request = (status = 'accepted', reason) => ({ params: { id }, body: { status, reason } });

// Exercise controller writes and Mongoose serialization in an isolated transaction
// double. These tests never connect to or modify the user's database.
function database(t) {
    const state = {
        request: { _id: id, userId, status: 'pending' },
        user: { _id: '507f1f77bcf86cd799439012', id: userId, name: 'Student', email: 'student@example.com', role: 'student' },
        notifications: [], failNotification: false, failRole: false,
    };
    let queue = Promise.resolve();
    t.mock.method(SetterRequest.db, 'transaction', async callback => {
        const previous = queue;
        let release;
        queue = new Promise(resolve => { release = resolve; });
        await previous;
        const backup = JSON.parse(JSON.stringify({ request: state.request, user: state.user, notifications: state.notifications }));
        try { return await callback({ testTransaction: true }); }
        catch (error) { Object.assign(state, backup); throw error; }
        finally { release(); }
    });
    const assertSession = session => assert.equal(session?.testTransaction, true);
    t.mock.method(SetterRequest, 'findOneAndUpdate', async (filter, update, options) => {
        assertSession(options.session);
        assert.equal(filter.status, 'pending');
        assert.equal(options.new, true);
        if (!state.request || state.request.status !== 'pending') return null;
        Object.assign(state.request, update.$set);
        return SetterRequest.hydrate(state.request);
    });
    t.mock.method(SetterRequest, 'findById', () => ({ session: async session => {
        assertSession(session);
        return state.request ? SetterRequest.hydrate(state.request) : null;
    } }));
    t.mock.method(User, 'findOne', filter => ({ session: async session => {
        assertSession(session);
        assert.deepEqual(filter, { $or: [{ id: userId }] });
        return state.user ? User.hydrate(state.user) : null;
    } }));
    t.mock.method(User.prototype, 'save', async function (options) {
        assertSession(options.session);
        if (state.failRole) throw new Error('Role write failed');
        state.user = this.toObject();
        return this;
    });
    t.mock.method(Notification.prototype, 'save', async function (options) {
        assertSession(options.session);
        if (state.failNotification) throw new Error('Notification write failed');
        state.notifications.push(this.toObject());
        return this;
    });
    t.mock.method(console, 'error', () => {});
    return state;
}

test('approval commits the decision, role, and one notification together', async t => {
    const state = database(t);
    const res = response();
    await decideSetterRequest(request(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(state.request.status, 'accepted');
    assert.equal(state.user.role, 'problem_setter');
    assert.equal(state.notifications.length, 1);
    assert.equal(state.notifications[0].userId, userId);
    assert.equal(state.notifications[0].isRead, false);
    assert.match(state.notifications[0].title, /Approved/);
});

test('rejection commits its notification and reason while retaining the student role', async t => {
    const state = database(t);
    const res = response();
    await decideSetterRequest(request('rejected', '  Please provide more information.  '), res);
    assert.equal(res.statusCode, 200);
    assert.equal(state.request.status, 'rejected');
    assert.equal(state.user.role, 'student');
    assert.equal(state.notifications[0].note, 'Please provide more information.');
});

for (const status of ['accepted', 'rejected']) {
    test(`${status} notification failure rolls back every write and allows a retry`, async t => {
        const state = database(t);
        state.failNotification = true;
        const failed = response();
        await decideSetterRequest(request(status), failed);
        assert.equal(failed.statusCode, 500);
        assert.equal(state.request.status, 'pending');
        assert.equal(state.user.role, 'student');
        assert.equal(state.notifications.length, 0);
        state.failNotification = false;
        const retried = response();
        await decideSetterRequest(request(status), retried);
        assert.equal(retried.statusCode, 200);
        assert.equal(state.request.status, status);
        assert.equal(state.notifications.length, 1);
    });
}

test('failed role write leaves the request pending without a notification', async t => {
    const state = database(t);
    state.failRole = true;
    const res = response();
    await decideSetterRequest(request(), res);
    assert.equal(res.statusCode, 500);
    assert.equal(state.request.status, 'pending');
    assert.equal(state.user.role, 'student');
    assert.equal(state.notifications.length, 0);
});

test('concurrent decisions produce exactly one decision and notification', async t => {
    const state = database(t);
    const approved = response();
    const rejected = response();
    await Promise.all([
        decideSetterRequest(request(), approved),
        decideSetterRequest(request('rejected', 'Not eligible'), rejected),
    ]);
    assert.deepEqual([approved.statusCode, rejected.statusCode].sort(), [200, 409]);
    assert.equal(state.request.status, 'accepted');
    assert.equal(state.user.role, 'problem_setter');
    assert.equal(state.notifications.length, 1);
});

test('already-decided requests cannot create duplicate notifications', async t => {
    const state = database(t);
    await decideSetterRequest(request('rejected'), response());
    const res = response();
    await decideSetterRequest(request(), res);
    assert.equal(res.statusCode, 409);
    assert.equal(state.request.status, 'rejected');
    assert.equal(state.user.role, 'student');
    assert.equal(state.notifications.length, 1);
});

test('missing requests return 404', async t => {
    const state = database(t);
    state.request = null;
    const res = response();
    await decideSetterRequest(request(), res);
    assert.equal(res.statusCode, 404);
    assert.equal(state.notifications.length, 0);
});

for (const account of [null, { banned: true }, { disabledAt: new Date() }, { role: 'admin' }]) {
    test(`ineligible applicant cannot be promoted (${JSON.stringify(account)})`, async t => {
        const state = database(t);
        state.user = account ? { ...state.user, ...account } : null;
        const res = response();
        await decideSetterRequest(request(), res);
        assert.equal(res.statusCode, 409);
        assert.equal(state.request.status, 'pending');
        assert.equal(state.notifications.length, 0);
    });
}

test('invalid decisions and reasons never start a transaction', async t => {
    t.mock.method(SetterRequest.db, 'transaction', () => assert.fail('Invalid transaction'));
    for (const body of [{ status: 'pending' }, { status: 'rejected', reason: {} }, { status: 'rejected', reason: 'x'.repeat(2001) }]) {
        const res = response();
        await decideSetterRequest({ params: { id }, body }, res);
        assert.equal(res.statusCode, 400);
    }
    const res = response();
    await decideSetterRequest({ params: { id: 'bad-id' }, body: { status: 'accepted' } }, res);
    assert.equal(res.statusCode, 404);
});
