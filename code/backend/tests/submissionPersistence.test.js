import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import { auth } from '../lib/auth.js';
import { Contest } from '../models/Contest.js';
import { Problem } from '../models/Problem.js';
import { StudentStats } from '../models/StudentStats.js';
import { Submission } from '../models/Submission.js';
import { submitProblemSolution } from '../controllers/submissionController.js';
import { submitToContest } from '../controllers/contestController.js';

const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
const contestId = '507f1f77bcf86cd799439013';
const userId = 'student';
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const req = problemId => ({ headers: {}, user: { id: userId }, params: { id: contestId }, body: { problemId, code: 'print(2)', language: 'python' } });
const clone = value => JSON.parse(JSON.stringify(value));

function database(t) {
    const state = {
        stats: new StudentStats({ userId }).toObject(),
        contest: new Contest({ _id: contestId, name: 'Live contest', status: 'Ongoing',
            startTime: new Date(Date.now() - 60000), endTime: new Date(Date.now() + 600000),
            problems: ids, participants: [{ userId, score: 0, penalty: 0, solved: [] }],
        }).toObject(),
        submissions: [], failure: null, replay: false, duplicateFirst: false,
    };
    const previous = [process.env.JDOODLE_CLIENT_ID, process.env.JDOODLE_CLIENT_SECRET];
    process.env.JDOODLE_CLIENT_ID = 'test-client';
    process.env.JDOODLE_CLIENT_SECRET = 'test-secret';
    t.after(() => ['JDOODLE_CLIENT_ID', 'JDOODLE_CLIENT_SECRET'].forEach((key, i) => {
        if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i];
    }));
    t.mock.method(console, 'log', () => {});
    t.mock.method(console, 'error', () => {});
    t.mock.method(auth.api, 'getSession', async () => ({ user: { id: userId } }));
    state.execution = t.mock.method(axios, 'post', async () => ({ data: { output: '2', statusCode: 200, cpuTime: '0.001', memory: 100 } }));
    t.mock.method(Problem, 'findOne', async filter => ({ _id: filter._id, status: 'approved', title: 'Exercise', difficulty: 'easy', hiddenInput: '1', hiddenOutput: '2', timeLimit: 1000, memoryLimit: 256 }));
    const assertSession = session => assert.ok(session?.testTransaction);
    const query = read => ({
        then: (resolve, reject) => Promise.resolve().then(read).then(resolve, reject),
        session: async session => { assertSession(session); return read(); },
    });
    t.mock.method(Contest, 'findById', () => query(() => Contest.hydrate(clone(state.contest))));
    t.mock.method(StudentStats, 'findOne', () => query(() => state.stats ? StudentStats.hydrate(clone(state.stats)) : null));
    let queue = Promise.resolve();
    t.mock.method(StudentStats.db, 'transaction', async callback => {
        const prior = queue;
        let release;
        queue = new Promise(resolve => { release = resolve; });
        await prior;
        const backup = clone({ stats: state.stats, contest: state.contest, submissions: state.submissions });
        try {
            if (state.duplicateFirst) {
                state.duplicateFirst = false;
                throw Object.assign(new Error('First stats insert raced'), { code: 11000, keyPattern: { userId: 1 } });
            }
            if (state.replay) {
                state.replay = false;
                await callback({ testTransaction: true });
                Object.assign(state, clone(backup));
            }
            return await callback({ testTransaction: true });
        } catch (error) { Object.assign(state, backup); throw error; }
        finally { release(); }
    });
    t.mock.method(Contest.prototype, 'save', async function (options) {
        assertSession(options?.session);
        if (state.failure === 'contest') throw new Error('Contest write failed');
        state.contest = this.toObject();
    });
    t.mock.method(StudentStats.prototype, 'save', async function (options) {
        assertSession(options?.session);
        if (state.failure === 'stats') throw new Error('Stats write failed');
        state.stats = this.toObject();
    });
    t.mock.method(Submission.prototype, 'save', async function (options) {
        assertSession(options?.session);
        if (state.failure === 'submission') throw new Error('Submission write failed');
        state.submissions.push(this.toObject());
    });
    return state;
}

test('contest closing during judging rejects the result without partial writes', async t => {
    const state = database(t);
    t.mock.method(axios, 'post', async () => {
        state.contest.status = 'Ended';
        return { data: { output: '2', statusCode: 200, cpuTime: '0.001', memory: 100 } };
    });
    const res = response();
    await submitToContest(req(ids[0]), res);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /no longer ongoing/);
    assert.equal(state.stats.totalSubmissionsCount, 0);
    assert.equal(state.contest.participants[0].score, 0);
    assert.equal(state.submissions.length, 0);
});

for (const [kind, handler] of [['practice', submitProblemSolution], ['contest', submitToContest]]) {
    test(`${kind}: judging configuration errors retain their response shape without writes`, async t => {
        const state = database(t);
        t.mock.method(axios, 'post', () => assert.fail('Invalid configuration reached execution'));
        const unsupported = req(ids[0]);
        unsupported.body.language = 'unsupported';
        const badLanguage = response();
        await handler(unsupported, badLanguage);
        assert.equal(badLanguage.statusCode, 400);
        assert.deepEqual(badLanguage.body, { message: 'Unsupported language selection: unsupported' });

        delete process.env.JDOODLE_CLIENT_SECRET;
        const missingSecret = response();
        await handler(req(ids[0]), missingSecret);
        assert.equal(missingSecret.statusCode, 500);
        assert.deepEqual(missingSecret.body, { message: 'Code execution service is currently misconfigured.' });
        assert.equal(state.submissions.length, 0);
        assert.equal(state.stats.totalSubmissionsCount, 0);
    });

    test(`${kind}: judging timeout preserves the unscored response`, async t => {
        const state = database(t);
        t.mock.method(axios, 'post', async () => { throw Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }); });
        const res = response();
        await handler(req(ids[0]), res);
        assert.equal(res.statusCode, 504);
        assert.deepEqual(res.body, { message: 'The judging service or test-data download timed out. This attempt was not scored. Please try again.' });
        assert.equal(state.submissions.length, 0);
        assert.equal(state.stats.totalSubmissionsCount, 0);
        assert.equal(state.contest.participants[0].score, 0);
    });

    test(`${kind}: wrapped syntax failures remain compilation errors`, async t => {
        database(t);
        t.mock.method(axios, 'post', async (_url, payload) => {
            const marker = payload.script.match(/CODINGLAB_RUNTIME_[a-f0-9]+:/)[0];
            return { data: { output: '', stderr: `${marker}CE:SyntaxError at line 1`, statusCode: 200, memory: null } };
        });
        const res = response();
        await handler(req(ids[0]), res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.verdict, 'Compilation Error');
        assert.match(res.body.compileOutput, /SyntaxError/);
    });

    test(`${kind}: wrapper runtime failure overrides matching output and saves diagnostics`, async t => {
        const state = database(t);
        t.mock.method(axios, 'post', async (_url, payload) => {
            const marker = payload.script.match(/CODINGLAB_RUNTIME_[a-f0-9]+:/)?.[0];
            assert.ok(marker);
            return { data: { output: '2', stderr: `\n${marker}ZeroDivisionError at line 1\n`, statusCode: 200, cpuTime: '0.001', memory: 100 } };
        });
        const res = response();
        await handler(req(ids[0]), res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.verdict, 'Runtime Error');
        assert.equal(res.body.evaluationVerdict, 'RE');
        assert.match(res.body.compileOutput, /ZeroDivisionError at line 1/);
        assert.equal(state.submissions[0].verdict, 'Runtime Error');
        assert.equal(state.submissions[0].compileOutput, res.body.compileOutput);
        assert.equal(state.stats.points, 0);
        assert.equal(state.stats.solvedProblems.length, 0);
        if (kind === 'contest') assert.equal(state.contest.participants[0].score, 0);
    });

    test(`${kind}: normal output mismatch remains Wrong Answer`, async t => {
        database(t);
        t.mock.method(axios, 'post', async () => ({ data: { output: 'Runtime Error is ordinary text here', statusCode: 200, cpuTime: '0.001', memory: 100 } }));
        const res = response();
        await handler(req(ids[0]), res);
        assert.equal(res.body.verdict, 'Wrong Answer');
        assert.equal(res.body.evaluationVerdict, 'WA');
    });

    for (const memory of [262143, '262144', '262145']) {
        test(`${kind}: memory ${memory} KB is compared against a 256 MB limit`, async t => {
            const state = database(t);
            t.mock.method(axios, 'post', async () => ({ data: { output: '2', statusCode: 200, cpuTime: '0.001', memory } }));
            const res = response();
            await handler(req(ids[0]), res);
            const exceeded = Number(memory) > 256 * 1024;
            assert.equal(res.statusCode, 200);
            assert.equal(res.body.verdict, exceeded ? 'Memory Limit Exceeded' : 'Accepted');
            assert.equal(res.body.evaluationVerdict, exceeded ? 'MLE' : 'AC');
            assert.equal(state.submissions[0].verdict, res.body.verdict);
            assert.equal(state.submissions[0].memoryUsed, Number(memory));
            assert.equal(state.stats.points, exceeded ? 0 : 10);
            assert.equal(state.stats.solvedProblems.length, exceeded ? 0 : 1);
            if (kind === 'contest') assert.equal(state.contest.participants[0].score, exceeded ? 0 : 100);
        });
    }

    test(`${kind}: malformed memory usage does not save an accepted result`, async t => {
        const state = database(t);
        for (const memory of [null, undefined, '', 'not-a-number', -1, Infinity, {}]) {
            t.mock.method(axios, 'post', async () => ({ data: { output: '2', statusCode: 200, cpuTime: '0.001', memory } }));
            const res = response();
            await handler(req(ids[0]), res);
            assert.equal(res.statusCode, 500);
            assert.equal(state.submissions.length, 0);
            assert.equal(state.stats.totalSubmissionsCount, 0);
        }
    });

    test(`${kind}: timeouts retain priority when both resource limits are exceeded`, async t => {
        database(t);
        t.mock.method(axios, 'post', async () => ({ data: { output: '2', statusCode: 200, cpuTime: '2', memory: 300000 } }));
        const res = response();
        await handler(req(ids[0]), res);
        assert.equal(res.body.verdict, 'Time Limit Exceeded');
    });

    test(`${kind}: failed execution is not relabeled as memory limit exceeded`, async t => {
        const state = database(t);
        t.mock.method(axios, 'post', async () => ({ data: { output: 'Compilation failed', statusCode: 400, cpuTime: '0', memory: 300000 } }));
        const res = response();
        await handler(req(ids[0]), res);
        assert.equal(res.body.verdict, 'Compilation Error');
        assert.equal(state.stats.points, 0);
    });

    for (const failure of kind === 'practice' ? ['stats', 'submission'] : ['contest', 'stats', 'submission']) {
        test(`${kind}: failed ${failure} write rolls back stats, score, and history`, async t => {
            const state = database(t);
            const before = clone({ stats: state.stats, contest: state.contest, submissions: state.submissions });
            state.failure = failure;
            const res = response();
            await handler(req(ids[0]), res);
            assert.equal(res.statusCode, 500);
            assert.deepEqual(clone({ stats: state.stats, contest: state.contest, submissions: state.submissions }), before);
            state.failure = null;
            const retry = response();
            await handler(req(ids[0]), retry);
            assert.equal(retry.statusCode, 200);
            assert.equal(state.stats.totalSubmissionsCount, 1);
            assert.equal(state.submissions.length, 1);
        });
    }

    for (const sameProblem of [true, false]) {
        test(`${kind}: simultaneous accepts for ${sameProblem ? 'one problem' : 'different problems'} retain every submission`, async t => {
            const state = database(t);
            const responses = [response(), response()];
            await Promise.all([handler(req(ids[0]), responses[0]), handler(req(sameProblem ? ids[0] : ids[1]), responses[1])]);
            assert.ok(responses.every(res => res.statusCode === 200));
            assert.equal(state.stats.totalSubmissionsCount, 2);
            assert.equal(state.submissions.length, 2);
            assert.equal(state.stats.solvedProblems.length, sameProblem ? 1 : 2);
            assert.equal(state.stats.points, sameProblem ? 10 : 20);
            if (kind === 'contest') assert.equal(state.contest.participants[0].score, sameProblem ? 100 : 200);
        });
    }

    test(`${kind}: transaction replay does not judge twice or duplicate the result`, async t => {
        const state = database(t);
        state.replay = true;
        const res = response();
        await handler(req(ids[0]), res);
        assert.equal(res.statusCode, 200);
        assert.equal(state.execution.mock.calls.length, 1);
        assert.equal(state.stats.totalSubmissionsCount, 1);
        assert.equal(state.submissions.length, 1);
    });

    test(`${kind}: racing first stats insert retries without executing code again`, async t => {
        const state = database(t);
        state.stats = null;
        state.duplicateFirst = true;
        const res = response();
        await handler(req(ids[0]), res);
        assert.equal(res.statusCode, 200);
        assert.equal(state.execution.mock.calls.length, 1);
        assert.equal(state.stats.totalSubmissionsCount, 1);
        assert.equal(state.submissions.length, 1);
    });
}
