import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPracticeProgress, findRetrySubmission, formatLanguage, formatSubmissionDate } from '../src/lib/growth-progress.js';
import { buildSubmissionActivity } from '../../backend/utils/submissionActivity.js';

const now = new Date('2026-10-13T12:00:00Z');
const data = buildSubmissionActivity([
  { problemId: 'old', createdAt: '2025-01-01T00:00:00Z' },
  { problemId: 'old', createdAt: '2026-10-13T10:00:00Z' },
  { problemId: 'new', createdAt: '2026-10-13T11:00:00Z' },
  { problemId: 'week-start', createdAt: '2026-10-07T00:00:00Z' },
  { problemId: 'week-outside', createdAt: '2026-10-06T23:59:59Z' },
  { problemId: 'month-start', createdAt: '2026-09-14T00:00:00Z' },
  { problemId: 'month-outside', createdAt: '2026-09-13T23:59:59Z' },
], now);

test('7-day progress includes the UTC boundary and counts repeat accepts only as activity', () => {
  assert.deepEqual(buildPracticeProgress(data, 7, now), { newlySolved: 2, activeDays: 2, acceptedSubmissions: 3 });
});

test('30-day progress includes its first calendar day and excludes older first solves', () => {
  assert.deepEqual(buildPracticeProgress(data, 30, now), { newlySolved: 4, activeDays: 4, acceptedSubmissions: 5 });
});

test('empty account returns zero progress without invalid percentages', () => {
  assert.deepEqual(buildPracticeProgress({}, 7, now), { newlySolved: 0, activeDays: 0, acceptedSubmissions: 0 });
});

test('future activity is excluded', () => {
  const stats = { activityHistory: [{ date: '2026-10-14', count: 3 }], firstSolveHistory: [{ date: '2026-10-14', problemId: 'future' }] };
  assert.deepEqual(buildPracticeProgress(stats, 30, now), { newlySolved: 0, activeDays: 0, acceptedSubmissions: 0 });
});

test('retry suggestion skips solved, withdrawn, deleted, and accepted problems', () => {
  const submission = (id, verdict, status = 'approved') => ({ problemId: { _id: id, status }, verdict });
  const candidate = submission('unsolved', 'Time Limit Exceeded');
  assert.equal(findRetrySubmission([
    submission('old', 'Wrong Answer'), submission('pending', 'Wrong Answer', 'pending'),
    { problemId: null, verdict: 'Wrong Answer' }, submission('accepted', 'Accepted'), candidate,
  ], data.firstSolveHistory), candidate);
  assert.equal(candidate.verdict, 'Time Limit Exceeded');
  assert.equal(findRetrySubmission([], []), null);
});

test('formatting preserves unsupported language labels and handles missing dates', () => {
  assert.equal(formatLanguage('cpp'), 'C++');
  assert.equal(formatLanguage('javascript'), 'javascript');
  assert.equal(formatSubmissionDate('invalid'), 'Date unavailable');
});
