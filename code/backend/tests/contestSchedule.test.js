import assert from 'node:assert/strict';
import test from 'node:test';
import { Contest } from '../models/Contest.js';
import { Problem } from '../models/Problem.js';
import { User } from '../models/User.js';
import { createContest, updateContest } from '../controllers/contestController.js';
import { validateContestSchedule } from '../utils/contestSchedule.js';

const problemId = '507f1f77bcf86cd799439011';
const startTime = '2026-11-01T10:00:00.000Z';
const endTime = '2026-11-01T12:00:00.000Z';
const body = { name: 'Weekly contest', startTime, endTime, problems: [problemId] };
const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});
const req = body => ({ params: { id: problemId }, user: { id: 'admin' }, body });

for (const [kind, handler] of [['create', createContest], ['edit', updateContest]]) {
    test(`${kind} rejects malformed dates, impossible days, and invalid intervals without saving`, async t => {
        const contest = new Contest({ ...body, createdBy: 'admin' });
        t.mock.method(Contest, 'findById', async () => contest);
        t.mock.method(Contest.prototype, 'save', () => assert.fail('Invalid schedule saved'));
        t.mock.method(Problem, 'countDocuments', () => assert.fail('Invalid schedule queried problems'));
        for (const change of [
            { startTime: 'invalid' }, { endTime: 'invalid' }, { startTime: '2026-02-30T10:00:00Z' },
            { startTime: '2026-02-29T10:00:00Z' }, { endTime: null }, { startTime: {} },
            { startTime: [] }, { startTime: true }, { startTime: 1 }, { startTime: '' },
            { startTime: endTime }, { endTime: startTime },
            { startTime: '2026-11-02T10:00:00Z' }, { endTime: '2026-11-01T09:00:00Z' },
        ]) {
            const res = response();
            await handler(req(kind === 'create' ? { ...body, ...change } : change), res);
            assert.equal(res.statusCode, 400, JSON.stringify(change));
            assert.equal(contest.startTime.toISOString(), startTime);
            assert.equal(contest.endTime.toISOString(), endTime);
        }
    });
}

test('partial edits compare the replacement date with the unchanged date', async t => {
    t.mock.method(Problem, 'countDocuments', async () => 1);
    t.mock.method(Contest.prototype, 'save', async function () { return this; });
    for (const change of [{ startTime: '2026-11-01T11:00:00Z' }, { endTime: '2026-11-01T13:00:00Z' }]) {
        const contest = new Contest({ ...body, createdBy: 'admin' });
        t.mock.method(Contest, 'findById', async () => contest);
        const res = response();
        await updateContest(req(change), res);
        assert.equal(res.statusCode, 200);
        assert.equal(contest.startTime.toISOString(), new Date(change.startTime || startTime).toISOString());
        assert.equal(contest.endTime.toISOString(), new Date(change.endTime || endTime).toISOString());
    }
});

test('valid creation saves the parsed dates', async t => {
    t.mock.method(Contest.db, 'transaction', async callback => callback({}));
    t.mock.method(User, 'find', () => ({ session: async () => [] }));
    t.mock.method(Problem, 'countDocuments', async () => 1);
    t.mock.method(Contest.prototype, 'save', async function () {
        assert.equal(this.startTime.toISOString(), startTime);
        assert.equal(this.endTime.toISOString(), endTime);
        return this;
    });
    const res = response();
    await createContest(req(body), res);
    assert.equal(res.statusCode, 201);
});

test('schedule handles leap days and compares timezone offsets as instants', () => {
    assert.ok(!validateContestSchedule('2028-02-29T10:00:00Z', '2028-02-29T11:00:00Z').error);
    const offset = validateContestSchedule('2026-11-01T16:00:00+06:00', '2026-11-01T11:00:00Z');
    assert.equal(offset.start.toISOString(), startTime);
    assert.ok(!offset.error);
    assert.match(validateContestSchedule('2026-11-01T16:00:00+06:00', '2026-11-01T09:00:00Z').error, /after/);
    assert.ok(validateContestSchedule(new Date('invalid'), new Date(endTime)).error);
});
