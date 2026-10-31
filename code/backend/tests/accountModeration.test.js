import assert from 'node:assert/strict';
import test from 'node:test';
import { auth } from '../lib/auth.js';
import { User } from '../models/User.js';
import { Submission } from '../models/Submission.js';
import { Contest } from '../models/Contest.js';
import { StudentStats } from '../models/StudentStats.js';
import { updateUserAccess, getAllUsers } from '../controllers/adminController.js';
import { enforceAccountAccess } from '../middleware/accountAccess.js';
import { requireAdmin } from '../middleware/auth.js';
import { beforeSessionCreate } from '../utils/accountAccess.js';
import adminRoutes from '../routes/adminRoutes.js';

const id = '507f1f77bcf86cd799439011';
const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    set() { return this; },
    json(body) { this.body = body; return this; }
});
const request = (action, reason) => ({ headers: {}, params: { id }, body: { action, reason }, user: { id: 'administrator' } });

test('account actions sit behind the existing admin guard', () => {
    assert.equal(adminRoutes.stack[0].handle, requireAdmin);
    const route = adminRoutes.stack.find(layer => layer.route?.path === '/users/:id/access');
    assert.ok(route.route.methods.patch);
});

test('ban, unban, disable and restore persist without deleting student history', async t => {
    const record = { _id: id, id: 'auth-id', role: 'student', disabledAt: null, banned: false };
    t.mock.method(User, 'findOne', async () => ({ ...record }));
    t.mock.method(User, 'findOneAndUpdate', async (filter, update) => {
        assert.equal(filter._id, id);
        assert.deepEqual(filter.role, { $ne: 'admin' });
        Object.assign(record, update.$set);
        return { ...record };
    });
    let revocations = 0;
    t.mock.method(User.db, 'collection', name => {
        assert.equal(name, 'session');
        return { deleteMany: async filter => {
            assert.ok(filter.userId.$in.includes('auth-id'));
            assert.ok(filter.userId.$in.includes(id));
            revocations++;
        } };
    });
    for (const model of [User, Submission, Contest, StudentStats]) {
        t.mock.method(model, 'deleteMany', () => assert.fail('History must not be deleted'));
        t.mock.method(model, 'deleteOne', () => assert.fail('History must not be deleted'));
    }
    let res = response();
    await updateUserAccess(request('ban', '  Cheating  '), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.banned, true);
    assert.equal(record.banReason, 'Cheating');
    await updateUserAccess(request('disable'), response());
    assert.ok(record.disabledAt instanceof Date);
    await updateUserAccess(request('restore'), response());
    assert.equal(record.disabledAt, null);
    assert.equal(record.banned, true, 'Restoring must not silently clear an existing ban');
    await updateUserAccess(request('unban'), response());
    assert.equal(record.banned, false);
    assert.equal(record.banReason, '');
    assert.equal(revocations, 2);
});

test('administrator and self accounts cannot be moderated', async t => {
    t.mock.method(User, 'findOneAndUpdate', () => assert.fail('Protected account was changed'));
    for (const account of [{ _id: id, role: 'admin' }, { _id: id, id: 'administrator', role: 'student' }]) {
        t.mock.method(User, 'findOne', async () => account);
        const res = response();
        await updateUserAccess(request('disable'), res);
        assert.equal(res.statusCode, 403);
    }
});

test('invalid actions and ban reasons are rejected before writing', async t => {
    t.mock.method(User, 'findOneAndUpdate', () => assert.fail('Invalid account update'));
    for (const [action, reason] of [['delete'], ['ban'], ['ban', '  '], ['ban', 'x'.repeat(1001)], ['ban', {}]]) {
        const res = response();
        await updateUserAccess(request(action, reason), res);
        assert.equal(res.statusCode, 400);
    }
});

test('missing users and changes to disabled accounts fail clearly', async t => {
    t.mock.method(User, 'findOneAndUpdate', () => assert.fail('Invalid account update'));
    t.mock.method(User, 'findOne', async () => null);
    const missing = response();
    await updateUserAccess(request('disable'), missing);
    assert.equal(missing.statusCode, 404);
    t.mock.method(User, 'findOne', async () => ({ _id: id, role: 'student', disabledAt: new Date() }));
    const disabled = response();
    await updateUserAccess(request('unban'), disabled);
    assert.equal(disabled.statusCode, 409);
});

test('admin user list returns only fields needed for moderation', async t => {
    t.mock.method(User, 'find', () => ({ select: fields => {
        assert.ok(fields.includes('banned'));
        assert.ok(fields.includes('disabledAt'));
        assert.ok(!fields.includes('password'));
        return { sort: async () => [] };
    } }));
    const res = response();
    await getAllUsers({}, res);
    assert.deepEqual(res.body, []);
});

for (const account of [{ banned: true }, { disabledAt: new Date() }, null]) {
    test(`blocked or missing account cannot reuse an existing session (${JSON.stringify(account)})`, async t => {
        t.mock.method(auth.api, 'getSession', async () => ({ user: { id, role: 'student' } }));
        t.mock.method(User, 'findOne', async () => account);
        const res = response();
        await enforceAccountAccess({ headers: {} }, res, () => assert.fail('Blocked account passed'));
        assert.equal(res.statusCode, 403);
        await assert.rejects(beforeSessionCreate({ userId: id }), error => error.status === 'FORBIDDEN');
    });
}

test('active accounts can access API routes and create new sessions', async t => {
    t.mock.method(auth.api, 'getSession', async () => ({ user: { id } }));
    t.mock.method(User, 'findOne', async () => ({ _id: id, role: 'student' }));
    let proceeded = false;
    await enforceAccountAccess({ headers: {} }, response(), () => { proceeded = true; });
    assert.equal(proceeded, true);
    const session = { userId: id };
    assert.deepEqual(await beforeSessionCreate(session), { data: session });
});

test('anonymous public access does not require a database account', async t => {
    t.mock.method(auth.api, 'getSession', async () => null);
    t.mock.method(User, 'findOne', () => assert.fail('Anonymous lookup'));
    let proceeded = false;
    await enforceAccountAccess({ headers: {} }, response(), () => { proceeded = true; });
    assert.equal(proceeded, true);
});

test('access check fails closed when the database is unavailable', async t => {
    t.mock.method(auth.api, 'getSession', async () => ({ user: { id } }));
    t.mock.method(User, 'findOne', async () => { throw new Error('Unavailable'); });
    t.mock.method(console, 'error', () => {});
    const res = response();
    await enforceAccountAccess({ headers: {} }, res, () => assert.fail('Unverified access'));
    assert.equal(res.statusCode, 500);
});
