import assert from 'node:assert/strict';
import test from 'node:test';
import { Contest } from '../models/Contest.js';
import { Problem } from '../models/Problem.js';
import { User } from '../models/User.js';
import { createContest, updateContest } from '../controllers/contestController.js';

const approvedId = '507f1f77bcf86cd7994390ab';
const otherId = '507f1f77bcf86cd7994390ac';
const contestId = '507f1f77bcf86cd799439012';
const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});
const form = problems => ({
    name: 'Weekly contest', startTime: '2026-11-01T10:00:00Z', endTime: '2026-11-01T12:00:00Z', problems,
});
const req = body => ({ user: { id: 'admin' }, params: { id: contestId }, body });
function existingContest(t) {
    const contest = new Contest({ ...form([approvedId]), createdBy: 'admin' });
    t.mock.method(Contest, 'findById', async () => contest);
    return contest;
}

for (const [kind, handler] of [['create', createContest], ['edit', updateContest]]) {
    for (const [label, problems] of [
        ['empty', []], ['not an array', approvedId], ['malformed', ['bad-id']],
        ['object', [{ _id: approvedId }]], ['duplicate', [approvedId, approvedId]],
        ['duplicate with different casing', [approvedId, approvedId.toUpperCase()]],
    ]) {
        test(`${kind} rejects ${label} problem selections without querying problems or saving`, async t => {
            const contest = existingContest(t);
            const originalName = contest.name;
            t.mock.method(Problem, 'countDocuments', () => assert.fail('Invalid selection queried'));
            t.mock.method(Contest.prototype, 'save', () => assert.fail('Invalid contest saved'));
            const res = response();
            await handler(req(form(problems)), res);
            assert.equal(res.statusCode, 400);
            assert.equal(contest.name, originalName);
        });
    }

    for (const status of ['pending', 'rejected', 'missing']) {
        test(`${kind} rejects a selection containing a ${status} problem`, async t => {
            const contest = existingContest(t);
            const originalProblems = contest.problems.map(String);
            t.mock.method(Problem, 'countDocuments', async filter => {
                assert.deepEqual(filter, { _id: { $in: [approvedId, otherId] }, status: 'approved' });
                return 1;
            });
            t.mock.method(Contest.prototype, 'save', () => assert.fail('Unavailable problem saved'));
            const res = response();
            await handler(req(form([approvedId, otherId])), res);
            assert.equal(res.statusCode, 400);
            assert.match(res.body.message, /exist and be approved/);
            assert.deepEqual(contest.problems.map(String), originalProblems);
        });
    }

    test(`${kind} saves an approved problem selection in its chosen order`, async t => {
        t.mock.method(Contest.db, 'transaction', async callback => callback({}));
        t.mock.method(User, 'find', () => ({ session: async () => [] }));
        existingContest(t);
        t.mock.method(Problem, 'countDocuments', async filter => {
            assert.deepEqual(filter, { _id: { $in: [otherId, approvedId] }, status: 'approved' });
            return 2;
        });
        let saves = 0;
        t.mock.method(Contest.prototype, 'save', async function () {
            saves++;
            assert.deepEqual(this.problems.map(String), [otherId, approvedId]);
            return this;
        });
        const res = response();
        await handler(req(form([otherId, approvedId])), res);
        assert.equal(res.statusCode, kind === 'create' ? 201 : 200);
        assert.equal(saves, 1);
    });
}

test('editing without a replacement list validates the existing problem selection', async t => {
    const contest = existingContest(t);
    t.mock.method(Problem, 'countDocuments', async filter => {
        assert.deepEqual(filter, { _id: { $in: [approvedId] }, status: 'approved' });
        return 0;
    });
    t.mock.method(Contest.prototype, 'save', () => assert.fail('Unavailable existing selection saved'));
    const res = response();
    await updateContest(req({ name: 'Renamed contest' }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(contest.name, 'Weekly contest');
});

test('metadata edits keep an approved problem list intact', async t => {
    existingContest(t);
    t.mock.method(Problem, 'countDocuments', async () => 1);
    t.mock.method(Contest.prototype, 'save', async function () { return this; });
    const res = response();
    await updateContest(req({ name: 'Renamed contest' }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.name, 'Renamed contest');
    assert.deepEqual(res.body.problems.map(String), [approvedId]);
});
