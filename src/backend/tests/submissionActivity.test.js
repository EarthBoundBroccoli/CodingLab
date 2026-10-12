import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSubmissionActivity } from '../utils/submissionActivity.js';
import { buildYearActivity } from '../../frontend/src/lib/profile-activity.js';
import { getUserStats } from '../controllers/submissionController.js';
import { Submission } from '../models/Submission.js';
import { StudentStats } from '../models/StudentStats.js';

const now = new Date('2026-10-13T12:00:00Z');
const accepted = (problemId, createdAt) => ({ problemId, createdAt });

test('empty accounts have zero solves and zero heatmap activity', () => {
    const result = buildSubmissionActivity([], now);
    assert.equal(result.codeforcesStats.solvedAllTime, 0);
    assert.equal(result.codeforcesStats.solvedLastYear, 0);
    assert.equal(result.codeforcesStats.solvedLastMonth, 0);
    assert.equal(result.currentStreak, 0);
    assert.equal(result.heatmap365.length, 365);
    assert.ok(result.heatmap365.every(day => day.count === 0 && day.level === 0));
    assert.deepEqual(result.activityHistory, []);
});

test('repeat accepts count as activity but do not create new solves', () => {
    // Deliberately unsorted to verify that the earliest acceptance determines a solve.
    const result = buildSubmissionActivity([
        accepted('old', '2026-10-13T10:00:00Z'),
        accepted('new', '2026-10-13T09:00:00Z'),
        accepted('old', '2024-01-01T08:00:00Z'),
        accepted('new', '2026-10-13T11:00:00Z')
    ], now);
    assert.equal(result.codeforcesStats.solvedAllTime, 2);
    assert.equal(result.codeforcesStats.solvedLastYear, 1);
    assert.equal(result.codeforcesStats.solvedLastMonth, 1);
    assert.equal(result.heatmap365.at(-1).count, 3);
    assert.equal(result.activityHistory[0].date, '2024-01-01');
    assert.deepEqual(result.firstSolveHistory, [
        { problemId: 'old', date: '2024-01-01' },
        { problemId: 'new', date: '2026-10-13' }
    ]);
});

test('rolling windows include today and their first UTC calendar day', () => {
    const result = buildSubmissionActivity([
        accepted('month-in', '2026-09-14T00:00:00Z'),
        accepted('month-out', '2026-09-13T23:59:59Z'),
        accepted('year-in', '2025-10-14T00:00:00Z'),
        accepted('year-out', '2025-10-13T23:59:59Z')
    ], now);
    assert.equal(result.codeforcesStats.solvedAllTime, 4);
    assert.equal(result.codeforcesStats.solvedLastMonth, 1);
    assert.equal(result.codeforcesStats.solvedLastYear, 3);
    assert.equal(result.heatmap365[0].date, '2025-10-14');
    assert.equal(result.heatmap365[0].count, 1);
    assert.equal(result.heatmap365.at(-1).date, '2026-10-13');
});

test('invalid and future timestamps do not invent activity', () => {
    const result = buildSubmissionActivity([
        accepted('future', '2026-10-14T00:00:00Z'),
        accepted('invalid', 'not-a-date'), accepted('missing', null),
        accepted(null, '2026-10-13T00:00:00Z')
    ], now);
    assert.equal(result.codeforcesStats.solvedAllTime, 0);
    assert.deepEqual(result.activityHistory, []);
});

test('historical streaks come from dated submissions rather than cached totals', () => {
    const result = buildSubmissionActivity([
        accepted('a', '2024-01-01'), accepted('b', '2024-01-02'), accepted('c', '2024-01-03'),
        accepted('d', '2026-10-10'), accepted('e', '2026-10-11')
    ], now);
    assert.equal(result.codeforcesStats.maxStreakAllTime, 3);
    assert.equal(result.codeforcesStats.maxStreakLastYear, 2);
    assert.equal(result.codeforcesStats.maxStreakLastMonth, 2);
    assert.equal(result.currentStreak, 0);
});

test('year calendar includes leap day and leaves missing dates empty', () => {
    const year = buildYearActivity([{ date: '2024-02-29', count: 2 }, { date: '2025-01-01', count: 7 }], 2024);
    assert.equal(year.data.length, 366);
    assert.equal(year.data[0].date, '2024-01-01');
    assert.equal(year.data.at(-1).date, '2024-12-31');
    assert.equal(year.total, 2);
    assert.equal(year.data.find(day => day.date === '2024-02-29').count, 2);
    assert.equal(year.data.filter(day => day.count > 0).length, 1);
    assert.equal(buildYearActivity([], 2026).total, 0);
});

test('stats endpoint counts each submission once despite duplicate cached activity', async t => {
    const today = new Date();
    const date = today.toISOString().slice(0, 10);
    t.mock.method(Submission, 'aggregate', async () => [{ totalAttempted: 1, totalSolved: 1 }]);
    t.mock.method(Submission, 'find', filter => {
        assert.equal(filter.userId, 'target-user');
        assert.equal(filter.verdict, 'Accepted');
        return { select: () => ({ lean: async () => [accepted('problem', today)] }) };
    });
    t.mock.method(StudentStats, 'findOne', async () => ({
        solvedProblems: Array(100).fill('problem'),
        activityHistory: [{ date, count: 100 }], longestStreak: 50, currentStreak: 50
    }));
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await getUserStats({ query: { userId: 'target-user' }, user: { id: 'viewer' } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.totalSolved, 1);
    assert.equal(res.body.codeforcesStats.solvedLastMonth, 1);
    assert.equal(res.body.codeforcesStats.solvedLastYear, 1);
    assert.equal(res.body.heatmap365.at(-1).count, 1);
    assert.equal(res.body.currentStreak, 1);
    assert.deepEqual(res.body.activityHistory, [{ date, count: 1 }]);
    assert.deepEqual(res.body.firstSolveHistory, [{ problemId: 'problem', date }]);
});

for (const { name, dates, expected } of [
    { name: 'consecutive days ending today', dates: ['2026-10-11', '2026-10-12', '2026-10-13'], expected: 3 },
    { name: 'yesterday remains active while today is unfinished', dates: ['2026-10-11', '2026-10-12'], expected: 2 },
    { name: 'a complete missed day expires the streak', dates: ['2026-10-10', '2026-10-11'], expected: 0 },
    { name: 'activity today starts again after a gap', dates: ['2026-10-10', '2026-10-11', '2026-10-13'], expected: 1 },
    { name: 'multiple accepted submissions in one day count as one streak day', dates: ['2026-10-12', '2026-10-13', '2026-10-13'], expected: 2 }
]) {
    test(`current streak: ${name}`, () => {
        const result = buildSubmissionActivity(dates.map((date, index) => accepted(`problem-${index}`, date)), now);
        assert.equal(result.currentStreak, expected);
    });
}

test('current streak is not capped at the monthly reporting window', () => {
    const submissions = Array.from({ length: 40 }, (_, index) => accepted(
        `problem-${index}`, new Date(now.getTime() - index * 86400000)
    ));
    const result = buildSubmissionActivity(submissions, now);
    assert.equal(result.currentStreak, 40);
    assert.equal(result.codeforcesStats.maxStreakLastMonth, 30);
});

test('streak stays active across UTC midnight and expires after the next full missed day', () => {
    const submissions = [accepted('problem', '2026-10-12T23:59:00Z')];
    assert.equal(buildSubmissionActivity(submissions, new Date('2026-10-13T00:01:00Z')).currentStreak, 1);
    assert.equal(buildSubmissionActivity(submissions, new Date('2026-10-14T00:00:00Z')).currentStreak, 0);
});

for (const { name, stats, expected } of [
    { name: 'saved peak survives a rating drop', stats: { contestRating: 1200, maxRating: 1800 }, expected: 1800 },
    { name: 'history recovers a peak missing from the saved maximum', stats: {
        contestRating: 1200, maxRating: 1000, ratingHistory: [{ oldRating: 1600, newRating: 1500 }]
    }, expected: 1600 },
    { name: 'new personal best is at least the current rating', stats: {
        contestRating: 2000, maxRating: 1800, ratingHistory: [{ newRating: 1900 }]
    }, expected: 2000 },
    { name: 'legacy history without an old rating remains usable', stats: {
        contestRating: 1300, ratingHistory: [{ newRating: 1700 }, {}]
    }, expected: 1700 },
    { name: 'new account receives its initial maximum', stats: null, expected: 1000 }
]) {
    test(`maximum rating: ${name}`, async t => {
        t.mock.method(Submission, 'aggregate', async () => []);
        t.mock.method(Submission, 'find', () => ({ select: () => ({ lean: async () => [] }) }));
        t.mock.method(StudentStats, 'findOne', async () => stats);
        const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
        await getUserStats({ query: {}, user: { id: 'user' } }, res);
        assert.equal(res.code, 200);
        assert.equal(res.body.maxRating, expected);
    });
}
