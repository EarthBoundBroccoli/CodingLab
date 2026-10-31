import assert from 'node:assert/strict';
import test from 'node:test';
import { Contest } from '../models/Contest.js';
import { updateContest, deleteContest, endContest, getLeaderboard } from '../controllers/contestController.js';
import { User } from '../models/User.js';
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('a finalized contest cannot be reopened or edited', async t => {
    t.mock.method(Contest, 'findById', async () => ({ ratingsCalculated: true }));
    const res = response();
    await updateContest({ params: { id: 'contest' }, body: { status: 'Ongoing' } }, res);
    assert.equal(res.statusCode, 409);
});

test('deletion atomically excludes rated contests so leaderboard eligibility is preserved', async t => {
    t.mock.method(Contest, 'findOneAndDelete', async filter => {
        assert.deepEqual(filter, { _id: 'contest', ratingsCalculated: { $ne: true } });
        return null;
    });
    t.mock.method(Contest, 'exists', async () => ({ _id: 'contest' }));
    const res = response();
    await deleteContest({ params: { id: 'contest' } }, res);
    assert.equal(res.statusCode, 409);
});

test('ending a finalized round again preserves its finish time', async t => {
    const endTime = new Date('2026-01-01T12:00:00Z');
    const contest = { status: 'Ended', ratingsCalculated: true, endTime };
    t.mock.method(Contest, 'findById', async () => contest);
    const res = response();
    await endContest({ params: { id: 'contest' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(contest.endTime, endTime);
});

test('contest API returns shared ranks and resolves string auth IDs without ObjectId casting', async t => {
    t.mock.method(Contest, 'findById', async () => ({ status: 'Ended', ratingsCalculated: true,
        participants: ['auth-b', 'auth-a', 'auth-c'].map((userId, index) => ({ userId, score: index === 2 ? 0 : 100, penalty: 0 })) }));
    t.mock.method(User, 'findOne', filter => {
        assert.equal(filter.$or.length, 1);
        const id = filter.$or[0].id;
        return { select: async () => ({ id, name: id }) };
    });
    const res = response();
    await getLeaderboard({ params: { id: 'contest' } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.map(p => p.rank), [1, 1, 3]);
    assert.ok(res.body.every(p => p.userId.name.startsWith('auth-')));
});
