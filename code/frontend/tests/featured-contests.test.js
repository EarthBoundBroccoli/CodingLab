import assert from 'node:assert/strict';
import test from 'node:test';
import { selectFeaturedContests } from '../src/lib/featured-contests.js';

const now = new Date('2026-10-13T12:00:00Z');
const contest = (_id, status, startTime, endTime) => ({ _id, status, startTime, endTime });

test('Home excludes completed, expired, malformed, and missing-ID contests', () => {
  const ongoing = contest('valid', 'Ongoing', '2026-10-13T11:00:00Z', '2026-10-13T13:00:00Z');
  assert.deepEqual(selectFeaturedContests([
    contest('ended', 'Ended', '2026-10-12', '2026-10-13'),
    contest('expired', 'Ongoing', '2026-10-12', '2026-10-13T12:00:00Z'),
    contest('invalid', 'Upcoming', 'invalid', 'invalid'),
    contest(null, 'Upcoming', '2026-10-14', '2026-10-15'), ongoing,
  ], now), [ongoing]);
});

test('ongoing rounds ending soon appear before upcoming rounds starting soon', () => {
  const source = [
    contest('later', 'Upcoming', '2026-10-15', '2026-10-16'),
    contest('ongoing-later', 'Ongoing', '2026-10-13T10:00:00Z', '2026-10-13T15:00:00Z'),
    contest('soon', 'Upcoming', '2026-10-14', '2026-10-15'),
    contest('ongoing-soon', 'Ongoing', '2026-10-13T10:00:00Z', '2026-10-13T13:00:00Z'),
  ];
  assert.deepEqual(selectFeaturedContests(source, now).map(row => row._id), ['ongoing-soon', 'ongoing-later', 'soon']);
  assert.equal(source[0]._id, 'later');
});

test('empty contest data produces an empty list', () => assert.deepEqual(selectFeaturedContests([], now), []));
