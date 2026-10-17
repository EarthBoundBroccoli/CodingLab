import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { User } from '../models/User.js';
import { University } from '../models/University.js';
import { StudentStats } from '../models/StudentStats.js';
import { Contest } from '../models/Contest.js';
import { getGlobalUniversities, getCampusLeaderboard, getMyLeaderboardStats } from '../controllers/leaderboardController.js';
import { getPublicUserProfile } from '../controllers/userController.js';
import { parseLeaderboardPagination, rankLeaderboard, paginateLeaderboard, ratingStages, ratedEligibilityStages, universityLeaderboardPipeline, activeLeaderboardFilter, getUserLeaderboardStats, getUserCampusRank } from '../utils/leaderboard.js';

const universityId = '507f1f77bcf86cd799439011';
const userId = '507f1f77bcf86cd799439012';
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const query = value => ({ populate() { return this; }, lean: async () => value });
beforeEach(t => {
    t.mock.method(Contest, 'exists', async () => ({ _id: 'completed-contest' }));
    t.mock.method(Contest, 'findOne', () => ({ sort: async () => null }));
});

test('ties use competition ranks across a page boundary', () => {
    const ranked = rankLeaderboard([{ rating: 1500 }, { rating: 1500 }, { rating: 1000 }], 'rating');
    assert.deepEqual(ranked.map(row => row.rank), [1, 1, 3]);
    assert.equal(paginateLeaderboard(ranked, { page: 2, limit: 1 }).rows[0].rank, 1);
    assert.deepEqual(paginateLeaderboard([], { page: 4, limit: 20 }), { rows: [], currentPage: 1, totalPages: 1 });
});

for (const invalid of [{ page: -1 }, { page: 'x' }, { limit: -3 }, { limit: 101 }, { page: '1.5' }, { page: ['1', '2'] }]) {
    test(`invalid pagination rejected: ${JSON.stringify(invalid)}`, () => assert.equal(parseLeaderboardPagination(invalid, 20), null));
}

test('missing stats starts at 1000 and real zero ratings are preserved', async t => {
    t.mock.method(StudentStats, 'findOne', () => query(null));
    assert.deepEqual(await getUserLeaderboardStats({ _id: userId }), { stats: null, rating: 1000, maxRating: 1000, isRated: false });
    StudentStats.findOne = () => query({ contestRating: 0, maxRating: 1300 });
    assert.equal((await getUserLeaderboardStats({ _id: userId })).rating, 0);
});

test('auth ID lookup falls back to legacy database ID and recovers peak from history', async t => {
    const ids = [];
    t.mock.method(StudentStats, 'findOne', filter => {
        ids.push(filter.userId);
        return query(filter.userId === userId ? { contestRating: 1000, ratingHistory: [{ oldRating: 1400, newRating: 1200 }] } : null);
    });
    const result = await getUserLeaderboardStats({ id: 'auth-id', _id: userId });
    assert.deepEqual(ids, ['auth-id', userId]);
    assert.equal(result.maxRating, 1400);
});

test('rating join uses both IDs, prioritizes auth ID, and avoids counting a user twice', () => {
    const stages = ratingStages();
    const lookup = stages.find(stage => stage.$lookup).$lookup;
    assert.equal(lookup.let.authId, '$authUserId');
    assert.deepEqual(lookup.pipeline.at(-1), { $limit: 1 });
    assert.equal(stages.at(-1).$addFields.contestRating.$ifNull[1], 1000);
});

test('campus pagination retains tied ranks and sums exactly the top ten', async t => {
    t.mock.method(University, 'findById', async () => ({ toObject: () => ({ _id: universityId, name: 'Campus' }) }));
    t.mock.method(User, 'aggregate', async pipeline => {
        assert.deepEqual(pipeline[0].$match.role, { $in: ['student', 'problem_setter'] });
        assert.ok(pipeline.some(stage => stage.$sort?._id === 1));
        return Array.from({ length: 12 }, (_, index) => ({ _id: String(index), name: 'Student', contestRating: index < 2 ? 1500 : 1000 }));
    });
    const res = response();
    await getCampusLeaderboard({ params: { universityId }, query: { page: 2, limit: 1 } }, res);
    assert.equal(res.body.students[0].rank, 1);
    assert.equal(res.body.university.totalRating, 11000);
    assert.equal(res.body.totalStudents, 12);
});

test('malformed campus ID returns 404 without database access', async t => {
    t.mock.method(University, 'findById', () => assert.fail('Invalid ID reached database'));
    const res = response();
    await getCampusLeaderboard({ params: { universityId: 'invalid' }, query: {} }, res);
    assert.equal(res.statusCode, 404);
});

test('university ranking shares tied ranks and filters orphan universities before pagination', async t => {
    t.mock.method(User, 'aggregate', async pipeline => {
        assert.deepEqual(pipeline[0].$match.role, { $in: ['student', 'problem_setter'] });
        assert.ok(pipeline.some(stage => stage.$unwind === '$university'));
        assert.deepEqual(pipeline.at(-1), { $sort: { totalRating: -1, _id: 1 } });
        return [{ _id: 'a', totalRating: 10000 }, { _id: 'b', totalRating: 10000 }, { _id: 'c', totalRating: 8000 }];
    });
    const res = response();
    await getGlobalUniversities({ query: { page: 2, limit: 1 } }, res);
    assert.equal(res.body.universities[0].rank, 1);
    assert.equal(res.body.totalUniversities, 3);
});

test('admin cannot receive a student campus rank', async t => {
    t.mock.method(User, 'aggregate', () => assert.fail('Admin ranked as a student'));
    assert.equal(await getUserCampusRank({ role: 'admin', university: { _id: universityId } }, 2000), null);
});

test('personal leaderboard uses saved rating even without a university', async t => {
    t.mock.method(User, 'findOne', () => query({ _id: userId, role: 'student', university: null }));
    t.mock.method(StudentStats, 'findOne', () => query({ contestRating: 1450, maxRating: 1600 }));
    const res = response();
    await getMyLeaderboardStats({ user: { id: userId } }, res);
    assert.equal(res.body.rating, 1450);
    assert.equal(res.body.maxRating, 1600);
    assert.equal(res.body.campusRank, null);
});

test('personal and public profile ranks use the same competition rule and rating', async t => {
    const user = { _id: userId, role: 'student', university: { _id: universityId }, name: 'Student' };
    t.mock.method(User, 'findOne', () => query(user));
    t.mock.method(User, 'findById', () => query(user));
    t.mock.method(StudentStats, 'findOne', () => query({ contestRating: 1500 }));
    t.mock.method(User, 'aggregate', async pipeline => {
        const higher = pipeline.find(stage => stage.$match?.contestRating);
        if (higher) {
            assert.deepEqual(higher.$match.contestRating, { $gt: 1500 });
            return [{ higherRanked: 2 }];
        }
        return [{ _id: universityId, totalRating: 10000 }];
    });
    const own = response();
    await getMyLeaderboardStats({ user: { id: userId } }, own);
    const publicProfile = response();
    await getPublicUserProfile({ params: { userId } }, publicProfile);
    assert.equal(own.body.campusRank, 3);
    assert.equal(publicProfile.body.campusRank, own.body.campusRank);
    assert.equal(publicProfile.body.stats.contestRating, own.body.rating);
});

test('a starting balance or fake history does not make a student rated without a finalized contest', async t => {
    t.mock.method(StudentStats, 'findOne', () => query({ contestRating: 1000, points: 0, ratingHistory: [{ contestName: 'Mock result', newRating: 1200 }] }));
    t.mock.method(Contest, 'exists', async filter => {
        assert.equal(filter.status, 'Ended');
        assert.equal(filter.ratingsCalculated, true);
        assert.deepEqual(filter.participants.$elemMatch.userId, { $in: ['auth-id', userId] });
        assert.deepEqual(filter.participants.$elemMatch.newRating, { $type: 'number' });
        return null;
    });
    const result = await getUserLeaderboardStats({ id: 'auth-id', _id: userId });
    assert.equal(result.isRated, false);
    t.mock.method(User, 'aggregate', () => assert.fail('Unrated student received a rank'));
    assert.equal(await getUserCampusRank({ role: 'student', university: universityId }, result.rating, result.isRated), null);
});

test('a completed rated participant remains eligible with zero practice points', async t => {
    t.mock.method(StudentStats, 'findOne', () => query({ contestRating: 1050, points: 0 }));
    assert.equal((await getUserLeaderboardStats({ _id: userId })).isRated, true);
});

test('unrated users have no campus rank and the personal API declares their status', async t => {
    t.mock.method(User, 'findOne', () => query({ _id: userId, role: 'student', university: { _id: universityId } }));
    t.mock.method(StudentStats, 'findOne', () => query({ contestRating: 1000 }));
    t.mock.method(Contest, 'exists', async () => null);
    t.mock.method(User, 'aggregate', async () => []);
    const res = response();
    await getMyLeaderboardStats({ user: { id: userId } }, res);
    assert.equal(res.body.isRated, false);
    assert.equal(res.body.campusRank, null);
    assert.equal(res.body.globalUniversityRank, null);
});

for (const account of [{ role: 'student', banned: true }, { role: 'student', disabledAt: new Date() }, { role: 'admin' }]) {
    test(`ineligible account has no competitive rank: ${JSON.stringify(account)}`, async t => {
        t.mock.method(User, 'aggregate', () => assert.fail('Inactive account ranked'));
        assert.equal(await getUserCampusRank({ ...account, university: universityId }, 2000, true), null);
    });
}

test('both campus and university pipelines filter inactive and unrated accounts before sorting and summing', async t => {
    const verify = pipeline => {
        assert.deepEqual(pipeline[0].$match.banned, { $ne: true });
        assert.equal(pipeline[0].$match.disabledAt, null);
        const eligibility = pipeline.findIndex(stage => stage.$match?.['ratedResults.0']);
        assert.ok(eligibility > 0);
        const sort = pipeline.findIndex(stage => stage.$sort?.contestRating);
        assert.ok(eligibility < sort);
        const lookup = pipeline.find(stage => stage.$lookup?.from === 'contests').$lookup;
        assert.equal(lookup.pipeline[0].$match.status, 'Ended');
        assert.equal(lookup.pipeline[0].$match.ratingsCalculated, true);
    };
    verify(universityLeaderboardPipeline());
    assert.deepEqual(activeLeaderboardFilter(), { role: { $in: ['student', 'problem_setter'] }, banned: { $ne: true }, disabledAt: null });
    assert.equal(ratedEligibilityStages().at(-1).$match['stats.contestRating'].$type, 'number');
    t.mock.method(University, 'findById', async () => ({ toObject: () => ({ _id: universityId }) }));
    t.mock.method(User, 'aggregate', async pipeline => { verify(pipeline); return []; });
    const res = response();
    await getCampusLeaderboard({ params: { universityId }, query: {} }, res);
    assert.equal(res.body.university.totalRating, null);
    assert.equal(res.body.ratedParticipants, 0);
    assert.deepEqual(res.body.students, []);
});
