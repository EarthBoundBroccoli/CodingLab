import assert from 'node:assert/strict';
import test from 'node:test';
import { Problem } from '../models/Problem.js';
import { Contest } from '../models/Contest.js';
import { getApprovedProblems, getProblemById, getDailyChallenge } from '../controllers/problemController.js';
import { getProblemRequests } from '../controllers/adminController.js';
import { getContestById } from '../controllers/contestController.js';
import adminRoutes from '../routes/adminRoutes.js';
import { requireAdmin } from '../middleware/auth.js';
import { PUBLIC_PROBLEM_FIELDS } from '../utils/publicProblem.js';

const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    set() { return this; },
    json(body) { this.body = body; return this; }
});
const id = '507f1f77bcf86cd799439011';
const records = [
    { _id: id, title: 'Approved', status: 'approved', samples: [{ input: '1', output: '2' }], hiddenInput: 'secret-input', hiddenOutput: 'secret-output' },
    { _id: '507f1f77bcf86cd799439012', title: 'Pending', status: 'pending', hiddenInput: 'pending-input' },
    { _id: '507f1f77bcf86cd799439013', title: 'Rejected', status: 'rejected', hiddenOutput: 'rejected-output' }
];

// Exercise real Mongoose filter/projection construction without requiring a live database.
const mockProblemReads = t => {
    for (const method of ['find', 'findOne']) {
        const original = Problem[method].bind(Problem);
        t.mock.method(Problem, method, (...args) => {
            const query = original(...args);
            query.exec = async () => {
                const filter = query.getFilter();
                let matches = records.filter(record => Object.entries(filter).every(([key, value]) => record[key] === value));
                if (query.options.skip) matches = matches.slice(query.options.skip);
                const projection = query.projection();
                if (projection) matches = matches.map(record => Object.fromEntries(
                    Object.entries(record).filter(([key]) => projection[key] === 1)
                ));
                return method === 'find' ? matches : matches[0] || null;
            };
            return query;
        });
    }
};

const assertSafe = problem => {
    assert.equal(problem.status, 'approved');
    assert.equal(Object.hasOwn(problem, 'hiddenInput'), false);
    assert.equal(Object.hasOwn(problem, 'hiddenOutput'), false);
};

test('public list returns only approved problems and omits hidden test data', async t => {
    mockProblemReads(t);
    const res = response();
    await getApprovedProblems({}, res);
    assert.equal(res.body.length, 1);
    assertSafe(res.body[0]);
    assert.deepEqual(res.body[0].samples, records[0].samples);
});

test('public detail keeps sample cases but hides private test files', async t => {
    mockProblemReads(t);
    const res = response();
    await getProblemById({ params: { id } }, res);
    assertSafe(res.body);
    assert.deepEqual(res.body.samples, records[0].samples);
});

for (const record of records.slice(1)) {
    test(`direct access to a ${record.status} problem returns 404`, async t => {
        mockProblemReads(t);
        const res = response();
        await getProblemById({ params: { id: record._id } }, res);
        assert.equal(res.statusCode, 404);
    });
}

test('malformed problem ID returns 404 without querying the database', async t => {
    t.mock.method(Problem, 'findOne', () => assert.fail('Malformed ID queried database'));
    const res = response();
    await getProblemById({ params: { id: 'invalid' } }, res);
    assert.equal(res.statusCode, 404);
});

test('daily challenge counts and selects only approved problems with safe fields', async t => {
    mockProblemReads(t);
    t.mock.method(Problem, 'countDocuments', async filter => {
        assert.deepEqual(filter, { status: 'approved' });
        return 1;
    });
    const res = response();
    await getDailyChallenge({}, res);
    assertSafe(res.body);
});

test('daily challenge returns 404 when no approved problem exists', async t => {
    t.mock.method(Problem, 'countDocuments', async () => 0);
    t.mock.method(Problem, 'findOne', () => assert.fail('Empty approved set was queried'));
    const res = response();
    await getDailyChallenge({}, res);
    assert.equal(res.statusCode, 404);
});

test('admin review retains pending, rejected, and hidden test data behind the admin guard', async t => {
    assert.equal(adminRoutes.stack[0].handle, requireAdmin);
    const route = adminRoutes.stack.find(layer => layer.route?.path === '/problems').route;
    assert.equal(route.stack[0].handle, getProblemRequests);
    mockProblemReads(t);
    const res = response();
    await getProblemRequests({}, res);
    assert.equal(res.body.length, 3);
    assert.equal(res.body[0].hiddenOutput, 'secret-output');
});

test('public contest details populate only approved problems with safe fields', async t => {
    t.mock.method(Contest, 'findById', () => ({
        populate(options) {
            assert.deepEqual(options, { path: 'problems', match: { status: 'approved' }, select: PUBLIC_PROBLEM_FIELDS });
            return Promise.resolve({ status: 'Ended', ratingsCalculated: true, problems: [] });
        }
    }));
    const res = response();
    await getContestById({ params: { id } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.problems, []);
});
