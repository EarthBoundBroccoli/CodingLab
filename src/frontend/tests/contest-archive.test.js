import assert from 'node:assert/strict';
import test from 'node:test';
import { buildContestArchive, filterContestArchive, formatArchiveDate } from '../src/lib/contest-archive.js';

const source = [
  { _id: 'a', name: 'Alpha Round', status: 'Ended', createdBy: { name: 'Campus Club' }, participants: [{ userId: '1' }, { userId: '2' }], startTime: '2026-10-01T12:00:00Z' },
  { _id: 'b', name: 'Beta Round', status: 'Ended', createdBy: 'unresolved-id', participants: [], startTime: '2026-10-12T12:00:00Z' },
  { _id: 'c', name: 'Upcoming', status: 'Upcoming', startTime: '2026-10-20' },
  { _id: 'd', name: 'Running', status: 'Ongoing' },
];

test('archive contains only completed contests with real IDs and participant counts', () => {
  const archive = buildContestArchive(source);
  assert.deepEqual(archive.map(contest => contest.id), ['a', 'b']);
  assert.equal(archive[0].participants, 2);
  assert.equal(archive[1].participants, 0);
  assert.equal(archive[0].host, 'Campus Club');
  assert.equal(archive[1].host, 'Host unavailable');
});

test('empty database produces an empty archive', () => assert.deepEqual(buildContestArchive([]), []));

test('search matches saved contest titles and host names', () => {
  const archive = buildContestArchive(source);
  assert.equal(filterContestArchive(archive, { searchTerm: ' CAMPUS ' })[0].id, 'a');
  assert.equal(filterContestArchive(archive, { searchTerm: 'beta' })[0].id, 'b');
  assert.deepEqual(filterContestArchive(archive, { searchTerm: 'no match' }), []);
});

test('date sorting uses saved start dates without modifying the source list', () => {
  const archive = buildContestArchive(source);
  assert.deepEqual(filterContestArchive(archive, { dateSort: 'newest' }).map(row => row.id), ['b', 'a']);
  assert.deepEqual(filterContestArchive(archive, { dateSort: 'oldest' }).map(row => row.id), ['a', 'b']);
  assert.deepEqual(archive.map(row => row.id), ['a', 'b']);
});

test('alphabetical and popularity ordering remain available', () => {
  const archive = buildContestArchive(source);
  assert.deepEqual(filterContestArchive(archive, { alphaSort: 'desc' }).map(row => row.id), ['b', 'a']);
  assert.deepEqual(filterContestArchive(archive, { popularitySort: 'most' }).map(row => row.id), ['a', 'b']);
  assert.deepEqual(filterContestArchive(archive, { popularitySort: 'least' }).map(row => row.id), ['b', 'a']);
});

test('missing or invalid dates do not invent a date', () => {
  assert.equal(formatArchiveDate(undefined), 'Date unavailable');
  assert.equal(formatArchiveDate('invalid'), 'Date unavailable');
});
