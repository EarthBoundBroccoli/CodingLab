import assert from 'node:assert/strict';
import test from 'node:test';
import { auth } from '../lib/auth.js';
import { User } from '../models/User.js';
import { requireAdmin } from '../middleware/auth.js';
import adminRoutes from '../routes/adminRoutes.js';
import contestRoutes from '../routes/contestRoutes.js';

const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});

test('every admin route uses the shared admin guard', () => {
    assert.equal(adminRoutes.stack[0].handle, requireAdmin);
    assert.ok(adminRoutes.stack.some(layer => layer.route?.path === '/session'));
    for (const [path, method] of [['/', 'post'], ['/:id', 'put'], ['/:id', 'delete'], ['/:id/end', 'put']]) {
        const route = contestRoutes.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route;
        assert.equal(route.stack[0].handle, requireAdmin);
    }
});

test('the old bypass header cannot grant an anonymous user access', async t => {
    t.mock.method(auth.api, 'getSession', async () => null);
    t.mock.method(User, 'findOne', () => assert.fail('Anonymous request queried users'));
    const res = response();
    await requireAdmin({ headers: { 'x-admin-token': 'admin123' }, user: { role: 'admin' } }, res,
        () => assert.fail('Anonymous request reached controller'));
    assert.equal(res.statusCode, 401);
});

for (const role of ['student', 'problem_setter']) {
    test(`database ${role} cannot use a cached admin role or privileged email`, async t => {
        t.mock.method(auth.api, 'getSession', async () => ({ user: {
            id: '507f1f77bcf86cd799439011', role: 'admin', email: 'admin@example.com'
        } }));
        t.mock.method(User, 'findOne', async () => ({ role }));
        t.mock.method(User, 'updateOne', () => assert.fail('Authorization must never promote a user'));
        const res = response();
        await requireAdmin({ headers: { 'x-admin-token': 'admin123' } }, res,
            () => assert.fail('Non-admin request reached controller'));
        assert.equal(res.statusCode, 403);
    });
}

for (const id of ['507f1f77bcf86cd799439011', 'better-auth-string-id']) {
    test(`current database admin is allowed with identity ${id}`, async t => {
        const session = { user: { id, role: 'student', email: 'owner@example.com' } };
        t.mock.method(auth.api, 'getSession', async () => session);
        const lookup = t.mock.method(User, 'findOne', async () => ({ role: 'admin' }));
        const req = { headers: {} };
        let proceeded = false;
        await requireAdmin(req, response(), () => { proceeded = true; });
        assert.equal(proceeded, true);
        assert.equal(req.user.role, 'admin');
        assert.equal(req.user.id, id);
        assert.equal(session.user.role, 'student');
        assert.deepEqual(lookup.mock.calls[0].arguments[0], {
            $or: id.length === 24 ? [{ id }, { _id: id }] : [{ id }]
        });
    });
}

test('a deleted user cannot access admin routes with an old session', async t => {
    t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'deleted', role: 'admin' } }));
    t.mock.method(User, 'findOne', async () => null);
    const res = response();
    await requireAdmin({ headers: {} }, res, () => assert.fail('Deleted user was allowed'));
    assert.equal(res.statusCode, 401);
});

test('database failure denies access', async t => {
    t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'user', role: 'admin' } }));
    t.mock.method(User, 'findOne', async () => { throw new Error('Database unavailable'); });
    t.mock.method(console, 'error', () => {});
    const res = response();
    await requireAdmin({ headers: {} }, res, () => assert.fail('Database failure allowed access'));
    assert.equal(res.statusCode, 500);
});
