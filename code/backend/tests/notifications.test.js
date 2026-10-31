import assert from 'node:assert/strict';
import test from 'node:test';
import { auth } from '../lib/auth.js';
import { Notification } from '../models/Notification.js';
import { Contest } from '../models/Contest.js';
import { getNotifications, readAllNotifications } from '../controllers/notificationController.js';

const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});
const id = '507f1f77bcf86cd799439011';

for (const matches of [0, 1, 2]) {
    test(`legacy announcement resolves only one matching contest (${matches} matches)`, async t => {
        t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'owner' } }));
        const row = new Notification({ userId: 'owner', type: 'contest', title: 'New Contest Created', message: 'A new contest "Weekly" has been created!' });
        t.mock.method(Notification, 'find', () => ({ sort: async () => [row] }));
        t.mock.method(Contest, 'find', filter => {
            assert.deepEqual(filter, { name: { $in: ['Weekly'] } });
            return { select: () => ({ lean: async () => Array.from({ length: matches }, () => ({ _id: id, name: 'Weekly' })) }) };
        });
        const res = response();
        await getNotifications({ headers: {} }, res);
        assert.equal(res.body[0].contestId, matches === 1 ? id : undefined);
    });
}

test('anonymous requests cannot load or mark notifications read', async t => {
    t.mock.method(auth.api, 'getSession', async () => null);
    t.mock.method(Notification, 'find', () => assert.fail('Anonymous read'));
    t.mock.method(Notification, 'updateMany', () => assert.fail('Anonymous update'));
    for (const handler of [getNotifications, readAllNotifications]) {
        const res = response();
        await handler({ headers: {}, body: { ids: [id] } }, res);
        assert.equal(res.statusCode, 401);
    }
});

test('inbox fetch is scoped to the authenticated user and newest first', async t => {
    t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'owner' } }));
    t.mock.method(Notification, 'find', filter => {
        assert.deepEqual(filter, { userId: 'owner' });
        return { sort: async order => { assert.deepEqual(order, { createdAt: -1 }); return []; } };
    });
    const res = response();
    await getNotifications({ headers: {} }, res);
    assert.deepEqual(res.body, []);
});

test('marking the loaded inbox excludes other users and newly arrived notifications', async t => {
    t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'owner' } }));
    const records = [
        { _id: id, userId: 'owner', isRead: false },
        { _id: '507f1f77bcf86cd799439012', userId: 'owner', isRead: false },
        { _id: id, userId: 'someone-else', isRead: false },
    ];
    t.mock.method(Notification, 'updateMany', async (filter, update) => {
        assert.deepEqual(filter, { userId: 'owner', isRead: false, _id: { $in: [id] } });
        for (const record of records) {
            if (record.userId === filter.userId && filter._id.$in.includes(record._id)) Object.assign(record, update.$set);
        }
    });
    await readAllNotifications({ headers: {}, body: { ids: [id], userId: 'someone-else' } }, response());
    assert.deepEqual(records.map(item => item.isRead), [true, false, false]);
});

test('invalid ID lists cannot perform a read update', async t => {
    t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'owner' } }));
    t.mock.method(Notification, 'updateMany', () => assert.fail('Invalid update'));
    for (const ids of ['all', [null], ['bad-id'], [{ $ne: null }]]) {
        const res = response();
        await readAllNotifications({ headers: {}, body: { ids } }, res);
        assert.equal(res.statusCode, 400);
    }
});
