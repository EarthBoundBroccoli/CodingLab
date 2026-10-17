import assert from 'node:assert/strict';
import test from 'node:test';
import { Contest } from '../models/Contest.js';
import { registerForContest } from '../controllers/contestController.js';

const id = '507f1f77bcf86cd799439011';
const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});
const request = (userId = 'student') => ({ params: { id }, user: { id: userId } });

// Inspect real Mongoose query construction and simulate a single atomic document
// update without connecting to the project's database.
function database(t, overrides = {}) {
    const state = { contest: { _id: id, status: 'Upcoming', endTime: new Date(Date.now() + 60000), participants: [], ...overrides } };
    const originalUpdate = Contest.findOneAndUpdate.bind(Contest);
    t.mock.method(Contest, 'findOneAndUpdate', (...args) => {
        const query = originalUpdate(...args);
        query.exec = async () => {
            const filter = query.getFilter();
            const update = query.getUpdate();
            assert.equal(filter._id, id);
            assert.deepEqual(filter.status, { $in: ['Upcoming', 'Ongoing'] });
            assert.deepEqual(filter.$expr, { $gt: ['$endTime', '$$NOW'] });
            assert.equal(query.options.new, true);
            assert.equal(query.options.runValidators, true);
            const userId = filter['participants.userId'].$ne;
            assert.deepEqual(update, { $push: { participants: { userId, score: 0, penalty: 0, solved: [] } } });
            state.beforeUpdate?.();
            const contest = state.contest;
            if (!contest || !filter.status.$in.includes(contest.status) || contest.endTime <= new Date()
                || contest.participants.some(p => p.userId === userId)) return null;
            contest.participants.push({ ...update.$push.participants });
            return structuredClone(contest);
        };
        return query;
    });
    t.mock.method(Contest, 'findById', async () => state.contest ? structuredClone(state.contest) : null);
    t.mock.method(Contest.prototype, 'save', () => assert.fail('Registration must not save a stale document'));
    return state;
}

for (const status of ['Upcoming', 'Ongoing']) {
    test(`registration succeeds for a ${status} contest before its deadline`, async t => {
        const state = database(t, { status });
        const res = response();
        await registerForContest(request(), res);
        assert.equal(res.statusCode, 200);
        assert.equal(state.contest.participants.length, 1);
        assert.deepEqual(state.contest.participants[0], { userId: 'student', score: 0, penalty: 0, solved: [] });
    });
    test(`registration rejects a ${status} contest with an expired end time`, async t => {
        const state = database(t, { status, endTime: new Date(Date.now() - 1000) });
        const res = response();
        await registerForContest(request(), res);
        assert.equal(res.statusCode, 400);
        assert.match(res.body.message, /ended/);
        assert.equal(state.contest.participants.length, 0);
    });
}

test('manually ended contests reject registration even before their scheduled end', async t => {
    const state = database(t, { status: 'Ended' });
    const res = response();
    await registerForContest(request(), res);
    assert.equal(res.statusCode, 400);
    assert.equal(state.contest.participants.length, 0);
});

test('simultaneous requests from one student create one registration', async t => {
    const state = database(t);
    const responses = [response(), response(), response()];
    await Promise.all(responses.map(res => registerForContest(request(), res)));
    assert.deepEqual(responses.map(res => res.statusCode).sort(), [200, 400, 400]);
    assert.equal(state.contest.participants.length, 1);
    assert.match(responses.find(res => res.statusCode === 400).body.message, /already registered/);
});

test('simultaneous registrations from different students preserve every participant', async t => {
    const state = database(t, { participants: [{ userId: 'existing', score: 100, penalty: 10, solved: [] }] });
    const responses = [response(), response()];
    await Promise.all(responses.map((res, index) => registerForContest(request(`student-${index}`), res)));
    assert.ok(responses.every(res => res.statusCode === 200));
    assert.equal(state.contest.participants.length, 3);
    assert.equal(state.contest.participants[0].score, 100);
});

test('contest ending while the registration waits prevents the write', async t => {
    const state = database(t);
    state.beforeUpdate = () => { state.contest.endTime = new Date(Date.now() - 1); };
    const res = response();
    await registerForContest(request(), res);
    assert.equal(res.statusCode, 400);
    assert.equal(state.contest.participants.length, 0);
});

test('missing contests return 404', async t => {
    const state = database(t);
    state.contest = null;
    const res = response();
    await registerForContest(request(), res);
    assert.equal(res.statusCode, 404);
});

test('malformed contest IDs return 404 without querying the database', async t => {
    t.mock.method(Contest, 'findOneAndUpdate', () => assert.fail('Malformed ID queried'));
    const res = response();
    await registerForContest({ ...request(), params: { id: 'bad-id' } }, res);
    assert.equal(res.statusCode, 404);
});
