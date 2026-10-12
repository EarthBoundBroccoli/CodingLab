import assert from 'node:assert/strict';
import test from 'node:test';
import { auth } from '../lib/auth.js';
import { SupportRequest } from '../models/SupportRequest.js';
import { createSupportRequest, getSupportRequests, updateSupportStatus } from '../controllers/supportController.js';
import { limitSupportRequests } from '../routes/supportRoutes.js';
import adminRoutes from '../routes/adminRoutes.js';
import { requireAdmin } from '../middleware/auth.js';

const id = '507f1f77bcf86cd799439011';
const response = () => ({
    statusCode: 200, headers: {},
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    json(body) { this.body = body; return this; }
});
const form = { name: ' Student ', email: ' STUDENT@EXAMPLE.COM ', message: ' Please help with my contest submission. ' };

for (const user of [null, { id: 'authenticated-student' }]) {
    test(`support saves a ${user ? 'signed-in' : 'guest'} message and only returns its reference`, async t => {
        t.mock.method(auth.api, 'getSession', async () => user ? { user } : null);
        t.mock.method(SupportRequest, 'create', async data => {
            assert.deepEqual(data, {
                name: 'Student', email: 'student@example.com', message: form.message.trim(), userId: user?.id || null
            });
            return { _id: id, ...data };
        });
        const res = response();
        await createSupportRequest({ headers: {}, body: { ...form, userId: 'forged-user', status: 'resolved' } }, res);
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.id, id);
        assert.equal(res.body.email, undefined);
    });
}

test('invalid support fields never reach the database', async t => {
    t.mock.method(SupportRequest, 'create', () => assert.fail('Invalid message saved'));
    for (const changes of [{ name: '  ' }, { email: 'bad' }, { message: 'short' }, { message: 'x'.repeat(5001) }, { name: {} }, { email: {} }]) {
        const res = response();
        await createSupportRequest({ headers: {}, body: { ...form, ...changes } }, res);
        assert.equal(res.statusCode, 400);
    }
});

test('a failed database save never reports success', async t => {
    t.mock.method(auth.api, 'getSession', async () => null);
    t.mock.method(SupportRequest, 'create', async () => { throw new Error('Database unavailable'); });
    t.mock.method(console, 'error', () => {});
    const res = response();
    await createSupportRequest({ headers: {}, body: form }, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.id, undefined);
});

test('support review and status changes are protected by the admin guard', () => {
    assert.equal(adminRoutes.stack[0].handle, requireAdmin);
    for (const [path, method] of [['/support-requests', 'get'], ['/support-requests/:id/status', 'patch']]) {
        assert.ok(adminRoutes.stack.some(layer => layer.route?.path === path && layer.route.methods[method]));
    }
});

test('support queue filters status and clamps pagination when the last page empties', async t => {
    t.mock.method(SupportRequest, 'countDocuments', async filter => {
        assert.deepEqual(filter, { status: 'open' });
        return 21;
    });
    t.mock.method(SupportRequest, 'find', filter => {
        assert.deepEqual(filter, { status: 'open' });
        return { sort: order => {
            assert.deepEqual(order, { createdAt: -1, _id: -1 });
            return { skip: skip => { assert.equal(skip, 20); return { limit: async limit => {
                assert.equal(limit, 20); return [{ _id: id }];
            } }; } };
        } };
    });
    const res = response();
    await getSupportRequests({ query: { page: '99', status: 'open' } }, res);
    assert.equal(res.body.page, 2);
    assert.equal(res.body.totalPages, 2);
    assert.equal(res.body.total, 21);
    assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('queue rejects invalid filters and page numbers', async t => {
    t.mock.method(SupportRequest, 'countDocuments', () => assert.fail('Invalid query'));
    for (const query of [{ status: 'deleted' }, { page: '0' }, { page: '1.5' }, { page: 'bad' }]) {
        const res = response();
        await getSupportRequests({ query }, res);
        assert.equal(res.statusCode, 400);
    }
});

test('resolve and reopen persist status with an administrator audit', async t => {
    for (const status of ['resolved', 'open']) {
        t.mock.method(SupportRequest, 'findByIdAndUpdate', async (requestId, update, options) => {
            assert.equal(requestId, id);
            assert.equal(options.new, true);
            assert.equal(update.$set.status, status);
            if (status === 'resolved') {
                assert.ok(update.$set.resolvedAt instanceof Date);
                assert.equal(update.$set.resolvedBy, 'administrator');
            } else {
                assert.equal(update.$set.resolvedAt, null);
                assert.equal(update.$set.resolvedBy, null);
            }
            return { _id: id, ...update.$set };
        });
        const res = response();
        await updateSupportStatus({ params: { id }, user: { id: 'administrator' }, body: { status } }, res);
        assert.equal(res.body.request.status, status);
    }
});

test('status updates reject invalid IDs and report missing requests', async t => {
    const invalid = response();
    await updateSupportStatus({ params: { id: 'bad-id' }, body: { status: 'resolved' } }, invalid);
    assert.equal(invalid.statusCode, 400);
    t.mock.method(SupportRequest, 'findByIdAndUpdate', async () => null);
    const missing = response();
    await updateSupportStatus({ params: { id }, user: { id: 'administrator' }, body: { status: 'resolved' } }, missing);
    assert.equal(missing.statusCode, 404);
});

test('public support submission limit blocks bursts and expires', t => {
    let now = 1000;
    t.mock.method(Date, 'now', () => now);
    const req = { ip: 'support-test-client' };
    let allowed = 0;
    for (let attempt = 0; attempt < 5; attempt++) limitSupportRequests(req, response(), () => { allowed++; });
    const blocked = response();
    limitSupportRequests(req, blocked, () => assert.fail('Rate limit bypassed'));
    assert.equal(allowed, 5);
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.headers['Retry-After'], '900');
    now += 900001;
    limitSupportRequests(req, response(), () => { allowed++; });
    assert.equal(allowed, 6);
});
