import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import { auth } from '../lib/auth.js';
import { Problem } from '../models/Problem.js';
import { Contest } from '../models/Contest.js';
import { Submission } from '../models/Submission.js';
import { StudentStats } from '../models/StudentStats.js';
import { submitProblemSolution } from '../controllers/submissionController.js';
import { submitToContest } from '../controllers/contestController.js';

const problemId = '507f1f77bcf86cd799439011';
const contestId = '507f1f77bcf86cd799439012';
const userId = 'student';
const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});
const request = id => ({
    headers: {}, user: { id: userId }, params: { id: contestId },
    body: { problemId: id, code: 'print(2)', language: 'python' }
});
const contestFixture = () => ({
    _id: contestId, status: 'Ongoing',
    startTime: new Date(Date.now() - 60000), endTime: new Date(Date.now() + 60000),
    problems: [problemId], participants: [{ userId, solved: [], score: 0, penalty: 0 }],
});

function setup(t, status) {
    t.mock.method(auth.api, 'getSession', async () => ({ user: { id: userId } }));
    const contest = contestFixture();
    t.mock.method(Contest, 'findById', async () => contest);
    const originalFind = Problem.findOne.bind(Problem);
    t.mock.method(Problem, 'findOne', (...args) => {
        const query = originalFind(...args);
        query.exec = async () => {
            assert.deepEqual(query.getFilter(), { _id: problemId, status: 'approved' });
            return status === 'approved' ? {
                _id: problemId, title: 'Approved exercise', status, difficulty: 'easy',
                hiddenInput: '1', hiddenOutput: '2', memoryLimit: 256, timeLimit: 1000
            } : null;
        };
        return query;
    });
    return contest;
}

for (const [kind, handler] of [['practice', submitProblemSolution], ['contest', submitToContest]]) {
    for (const status of ['pending', 'rejected', undefined, 'missing']) {
        test(`${kind} rejects ${status || 'unclassified'} problems before any judging or updates`, async t => {
            const contest = setup(t, status);
            contest.save = () => assert.fail('Rejected submission changed contest state');
            // Even an ended contest must not trigger rating writes for an unavailable problem.
            contest.status = 'Ended';
            t.mock.method(axios, 'get', () => assert.fail('Hidden tests fetched'));
            t.mock.method(axios, 'post', () => assert.fail('Code executed'));
            t.mock.method(StudentStats, 'findOne', () => assert.fail('Stats accessed'));
            t.mock.method(StudentStats.prototype, 'save', () => assert.fail('Stats saved'));
            t.mock.method(Submission.prototype, 'save', () => assert.fail('Submission saved'));
            const res = response();
            await handler(request(problemId), res);
            assert.equal(res.statusCode, 404);
            assert.deepEqual(res.body, { message: 'Problem not found.' });
            assert.equal(contest.participants[0].score, 0);
        });
    }

    test(`${kind} treats malformed IDs as unavailable without a database lookup`, async t => {
        t.mock.method(auth.api, 'getSession', async () => ({ user: { id: userId } }));
        t.mock.method(Problem, 'findOne', () => assert.fail('Malformed problem lookup'));
        t.mock.method(Contest, 'findById', () => assert.fail('Malformed contest lookup'));
        for (const id of ['bad-id', { $ne: null }]) {
            const res = response();
            await handler(request(id), res);
            assert.equal(res.statusCode, 404);
        }
    });

    test(`${kind} still evaluates approved problems and saves accepted results`, async t => {
        const contest = setup(t, 'approved');
        let contestSaves = 0;
        contest.save = async () => { contestSaves++; };
        const previous = { id: process.env.JDOODLE_CLIENT_ID, secret: process.env.JDOODLE_CLIENT_SECRET };
        process.env.JDOODLE_CLIENT_ID = 'test-client';
        process.env.JDOODLE_CLIENT_SECRET = 'test-secret';
        t.after(() => {
            if (previous.id === undefined) delete process.env.JDOODLE_CLIENT_ID;
            else process.env.JDOODLE_CLIENT_ID = previous.id;
            if (previous.secret === undefined) delete process.env.JDOODLE_CLIENT_SECRET;
            else process.env.JDOODLE_CLIENT_SECRET = previous.secret;
        });
        t.mock.method(console, 'log', () => {});
        t.mock.method(axios, 'post', async () => ({ data: { output: '2', statusCode: 200, cpuTime: '0.001', memory: '100' } }));
        const stats = new StudentStats({ userId });
        t.mock.method(StudentStats, 'findOne', async () => stats);
        let statsSaves = 0;
        let submissionSaves = 0;
        t.mock.method(StudentStats.prototype, 'save', async () => { statsSaves++; });
        t.mock.method(Submission.prototype, 'save', async function () {
            assert.equal(this.verdict, 'Accepted');
            assert.equal(String(this.problemId), problemId);
            submissionSaves++;
        });
        const res = response();
        await handler(request(problemId), res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.verdict, 'Accepted');
        assert.equal(statsSaves, 1);
        assert.equal(submissionSaves, 1);
        assert.equal(stats.totalSubmissionsCount, 1);
        assert.equal(contestSaves, kind === 'contest' ? 1 : 0);
    });
}

test('approved contest problems still require registration and contest membership', async t => {
    const contest = setup(t, 'approved');
    t.mock.method(axios, 'post', () => assert.fail('Unauthorized contest execution'));
    contest.participants = [];
    const unregistered = response();
    await submitToContest(request(problemId), unregistered);
    assert.equal(unregistered.statusCode, 400);
    assert.match(unregistered.body.message, /register/);
    contest.participants = [{ userId }];
    contest.problems = [];
    const unrelated = response();
    await submitToContest(request(problemId), unrelated);
    assert.equal(unrelated.statusCode, 400);
    assert.match(unrelated.body.message, /not part/);
});
