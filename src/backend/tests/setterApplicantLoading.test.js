import assert from 'node:assert/strict';
import test from 'node:test';
import { SetterRequest } from '../models/SetterRequest.js';
import { User } from '../models/User.js';
import { getPendingSetterRequests } from '../controllers/adminController.js';

const mongoId = '507f1f77bcf86cd799439011';
const response = () => ({
    statusCode: 200, headers: {},
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    json(body) { this.body = body; return this; }
});
function mockRequests(t, records) {
    t.mock.method(SetterRequest, 'find', filter => {
        assert.deepEqual(filter, { status: 'pending' });
        return { sort: order => {
            assert.deepEqual(order, { createdAt: -1 });
            return { lean: async () => records };
        } };
    });
}

test('queue loads auth string IDs and MongoDB IDs together with one safe user lookup', async t => {
    const records = [
        { _id: 'request-1', userId: 'auth-string-id', motivation: 'First application' },
        { _id: 'request-2', userId: mongoId },
        { _id: 'request-3', userId: 'deleted-account' },
        { _id: 'request-4', userId: 'auth-string-id' },
    ];
    mockRequests(t, records);
    let reads = 0;
    t.mock.method(User, 'find', filter => {
        reads++;
        assert.deepEqual(filter, { $or: [
            { id: { $in: ['auth-string-id', mongoId, 'deleted-account'] } },
            { _id: { $in: [mongoId] } },
        ] });
        return { select: fields => {
            assert.equal(fields, '_id id name email');
            return { lean: async () => [
                { _id: '507f1f77bcf86cd799439012', id: 'auth-string-id', name: 'Auth student', email: 'auth@example.com', privateField: 'never return' },
                { _id: mongoId, name: 'Mongo student', email: 'mongo@example.com' },
            ] };
        } };
    });
    const res = response();
    await getPendingSetterRequests({}, res);
    assert.equal(res.statusCode, 200);
    assert.equal(reads, 1);
    assert.equal(res.body.length, 4);
    assert.equal(res.body[0].userId.name, 'Auth student');
    assert.equal(res.body[1].userId.name, 'Mongo student');
    assert.equal(res.body[2].userId, null);
    assert.equal(res.body[2].accountMissing, true);
    assert.equal(res.body[2].applicantId, 'deleted-account');
    assert.equal(res.body[3].userId.name, 'Auth student');
    assert.equal(res.body[0].userId.privateField, undefined);
    assert.equal(res.body[0].motivation, 'First application');
    assert.equal(records[0].userId, 'auth-string-id');
    assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('explicit auth ID takes precedence over an overlapping database ID', async t => {
    mockRequests(t, [{ userId: mongoId }]);
    t.mock.method(User, 'find', () => ({ select: () => ({ lean: async () => [
        { _id: mongoId, name: 'Database match' },
        { _id: '507f1f77bcf86cd799439012', id: mongoId, name: 'Auth match' },
    ] }) }));
    const res = response();
    await getPendingSetterRequests({}, res);
    assert.equal(res.body[0].userId.name, 'Auth match');
});

test('an empty queue skips the user lookup', async t => {
    mockRequests(t, []);
    t.mock.method(User, 'find', () => assert.fail('Empty queue queried users'));
    const res = response();
    await getPendingSetterRequests({}, res);
    assert.deepEqual(res.body, []);
});

test('malformed legacy applicant IDs do not crash the queue', async t => {
    mockRequests(t, [{ userId: null }, { userId: '' }]);
    t.mock.method(User, 'find', () => assert.fail('Invalid identities queried users'));
    const res = response();
    await getPendingSetterRequests({}, res);
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.every(request => request.accountMissing));
});

test('database failure reports an error instead of an empty approval queue', async t => {
    mockRequests(t, [{ userId: 'auth-id' }]);
    t.mock.method(User, 'find', () => { throw new Error('Unavailable'); });
    t.mock.method(console, 'error', () => {});
    const res = response();
    await getPendingSetterRequests({}, res);
    assert.equal(res.statusCode, 500);
});
