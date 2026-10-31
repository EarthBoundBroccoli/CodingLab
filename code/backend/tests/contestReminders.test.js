import test from 'node:test';
import assert from 'node:assert/strict';
import { Contest } from '../models/Contest.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { sendContestReminders } from '../utils/contestReminders.js';

for (const claimed of [true, false]) {
    test(`reminder ${claimed ? 'delivers linked notifications' : 'skips an already claimed contest'}`, async t => {
        const now = new Date('2026-11-01T09:50:00Z');
        const contest = { _id: 'contest-id', name: 'Weekly', startTime: new Date('2026-11-01T10:00:00Z') };
        const session = {};
        t.mock.method(Contest, 'find', async filter => {
            assert.equal(filter.startTime.$gt, now);
            assert.equal(filter.startTime.$lte.toISOString(), contest.startTime.toISOString());
            assert.equal(filter.status.$ne, 'Ended');
            return [contest];
        });
        t.mock.method(Contest.db, 'transaction', async callback => callback(session));
        t.mock.method(Contest, 'updateOne', async (filter, update, options) => {
            assert.equal(filter.reminderSentFor.$ne, contest.startTime);
            assert.equal(update.$set.reminderSentFor, contest.startTime);
            assert.equal(options.session, session);
            return { modifiedCount: Number(claimed) };
        });
        t.mock.method(User, 'find', filter => {
            assert.deepEqual(filter, { banned: { $ne: true }, disabledAt: null });
            return { session: async () => [{ id: 'alice' }, { id: 'alice' }, { _id: 'bob' }] };
        });
        const insert = t.mock.method(Notification, 'insertMany', async (rows, options) => {
            assert.equal(options.session, session);
            assert.deepEqual(rows.map(row => row.userId), ['alice', 'bob']);
            assert.ok(rows.every(row => row.contestId === contest._id && row.message.includes('10 minutes')));
        });
        await sendContestReminders(now);
        assert.equal(insert.mock.callCount(), Number(claimed));
    });
}

test('delivery failure rejects the transaction so the claim can be retried', async t => {
    const contest = { _id: 'contest-id', name: 'Weekly', startTime: new Date() };
    t.mock.method(Contest, 'find', async () => [contest]);
    t.mock.method(Contest.db, 'transaction', async callback => callback({}));
    t.mock.method(Contest, 'updateOne', async () => ({ modifiedCount: 1 }));
    t.mock.method(User, 'find', () => ({ session: async () => [{ id: 'alice' }] }));
    t.mock.method(Notification, 'insertMany', async () => { throw new Error('delivery failed'); });
    await assert.rejects(sendContestReminders(), /delivery failed/);
});
