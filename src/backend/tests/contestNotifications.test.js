import test from 'node:test';
import assert from 'node:assert/strict';
import { Contest } from '../models/Contest.js';
import { User } from '../models/User.js';
import { Problem } from '../models/Problem.js';
import { Notification } from '../models/Notification.js';
import { createContest } from '../controllers/contestController.js';

for (const fail of [false, true]) {
    test(`contest and announcements ${fail ? 'roll back together on delivery failure' : 'commit together using canonical user identities'}`, async t => {
        const session = {};
        let stagedContest = false;
        let committed = false;
        t.mock.method(Contest.db, 'transaction', async callback => {
            try { await callback(session); committed = true; }
            catch (error) { stagedContest = false; throw error; }
        });
        t.mock.method(Problem, 'countDocuments', async () => 1);
        t.mock.method(Contest.prototype, 'save', async function(options) {
            assert.equal(options.session, session);
            stagedContest = true;
            return this;
        });
        t.mock.method(User, 'find', filter => {
            assert.deepEqual(filter, { banned: { $ne: true }, disabledAt: null });
            return { session: async value => {
                assert.equal(value, session);
                return [
                    { id:'virtual-id', toObject: () => ({ id:'real-auth-id', _id:'db-id' }) },
                    { id:'real-auth-id', _id:'db-id' },
                    { _id:'legacy-id' },
                ];
            } };
        });
        t.mock.method(Notification, 'insertMany', async (rows, options) => {
            assert.equal(options.session, session);
            assert.equal(stagedContest, true);
            assert.deepEqual(rows.map(row=>row.userId), ['real-auth-id','legacy-id']);
            assert.ok(rows.every(row=>row.type==='contest' && row.isRead===false && row.message.includes('ML')));
            assert.ok(rows.every(row => row.contestId));
            if (fail) throw new Error('Simulated notification write failure');
        });
        t.mock.method(console, 'error', () => {});
        const res={statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
        await createContest({user:{id:'admin'},body:{name:'ML',startTime:'2026-11-01T10:00:00Z',endTime:'2026-11-01T11:00:00Z',problems:['507f1f77bcf86cd799439011']}},res);
        assert.equal(res.statusCode,fail?500:201);
        assert.equal(committed,!fail);
        assert.equal(stagedContest,!fail);
    });
}
