import assert from 'node:assert/strict';
import test from 'node:test';
import { auth } from '../lib/auth.js';
import { requireAdminOrSetter } from '../middleware/auth.js';
import contestRoutes from '../routes/contestRoutes.js';
import { calculateContestRatingsForContest } from '../controllers/contestController.js';
import { Contest } from '../models/Contest.js';
import { StudentStats } from '../models/StudentStats.js';
import { User } from '../models/User.js';

const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});

test('rating route requires an authenticated admin or setter', () => {
    const route = contestRoutes.stack.find(layer => layer.route?.path === '/:id/calculate-ratings').route;
    assert.equal(route.stack[0].handle, requireAdminOrSetter);
});

for (const role of [null, 'student', 'admin', 'problem_setter']) {
    test(`rating access for ${role || 'anonymous'} user`, async t => {
        t.mock.method(auth.api, 'getSession', async () => role ? { user: { id: 'user', role } } : null);
        const req = { headers: {} };
        const res = response();
        let proceeded = false;
        await requireAdminOrSetter(req, res, () => { proceeded = true; });
        const permitted = role === 'admin' || role === 'problem_setter';
        assert.equal(proceeded, permitted);
        assert.equal(res.statusCode, role === null ? 401 : permitted ? 200 : 403);
        if (permitted) assert.equal(req.user.role, role);
    });
}

test('admin bypass header cannot authorize a rating request', async t => {
    t.mock.method(auth.api, 'getSession', async () => null);
    const req = { headers: { 'x-admin-token': 'admin123' }, user: { role: 'admin' } };
    const res = response();
    await requireAdminOrSetter(req, res, () => assert.fail('Unauthenticated request reached controller'));
    assert.equal(res.statusCode, 401);
});

for (const status of ['Upcoming', 'Ongoing']) {
    test(`reject ${status} contest without calculating or saving ratings`, async t => {
        const contest = { status, endTime: new Date(Date.now() + 60_000) };
        t.mock.method(Contest, 'findById', async () => contest);
        t.mock.method(StudentStats, 'find', () => assert.fail('Unfinished contest accessed rating data'));
        const res = response();
        await calculateContestRatingsForContest({ params: { id: 'contest' } }, res);
        assert.equal(res.statusCode, 400);
        assert.match(res.body.message, /after the contest ends/);
        assert.equal(contest.status, status);
        assert.equal(contest.ratingsCalculated, undefined);
    });
}

test('completed contest with saved ratings returns successfully without reapplying them', async t => {
    const userId = '507f1f77bcf86cd799439011';
    const contest = new Contest({
        name: 'Finished', status: 'Ended',
        startTime: new Date(Date.now() - 120_000), endTime: new Date(Date.now() - 60_000),
        participants: [{ userId }]
    });
    contest.ratingsCalculated = true;
    const stats = { userId, contestRating: 1200, ratingHistory: [], save: async () => {} };
    t.mock.method(Contest, 'findById', async () => contest);
    t.mock.method(contest, 'save', async () => contest);
    t.mock.method(StudentStats, 'find', async () => [stats]);
    t.mock.method(StudentStats, 'findOne', async () => stats);
    t.mock.method(User, 'find', async () => []);
    t.mock.method(User, 'findOne', async () => null);
    const res = response();
    await calculateContestRatingsForContest({ params: { id: contest._id.toString() } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(stats.ratingHistory.length, 0);
    assert.equal(contest.ratingsCalculated, true);
});

test('elapsed contest with stale status is recognized as ended', async t => {
    const contest = {
        status: 'Ongoing', startTime: new Date(Date.now() - 120_000),
        endTime: new Date(Date.now() - 60_000), participants: [], save: async () => {}
    };
    t.mock.method(Contest, 'findById', async () => contest);
    const res = response();
    await calculateContestRatingsForContest({ params: { id: 'contest' } }, res);
    assert.equal(contest.status, 'Ended');
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /No participants/);
});
