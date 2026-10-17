import assert from 'node:assert/strict';
import test from 'node:test';
import { Contest } from '../models/Contest.js';
import { StudentStats } from '../models/StudentStats.js';
import { User } from '../models/User.js';
import { processRatingsForContest, refreshPendingContestRatings } from '../utils/contestRatings.js';
import { calculateContestRatingsForContest } from '../controllers/contestController.js';

const userIds = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});

// Use real Mongoose serialization with an in-memory transactional database.
// Nothing connects to or modifies the user's database.
function database(t) {
    const contest = new Contest({
        name: 'Weekly contest', status: 'Ended',
        startTime: new Date(Date.now() - 120_000), endTime: new Date(Date.now() - 60_000),
        participants: userIds.map((userId, i) => ({ userId, score: 2 - i }))
    });
    const state = {
        contests: new Map([[contest.id, contest.toObject()]]),
        stats: new Map(userIds.map(userId => [userId, new StudentStats({ userId, contestRating: 1200 }).toObject()])),
        users: new Map(userIds.map((id, i) => [id, new User({ _id: id, name: `User ${i}`, email: `${i}@example.com`, rating: 1200 }).toObject()])),
        statsSaves: 0,
        failUserId: null
    };
    const query = read => ({
        session(session) { assert.ok(session?.testTransaction); return Promise.resolve(read()); },
        then(resolve, reject) { return Promise.resolve().then(read).then(resolve, reject); }
    });
    const hydrateContest = id => Contest.hydrate(state.contests.get(id.toString()));
    let queue = Promise.resolve();
    t.mock.method(Contest.db, 'transaction', async callback => {
        const previous = queue;
        let release;
        queue = new Promise(resolve => { release = resolve; });
        await previous;
        const backup = Object.fromEntries(['contests', 'stats', 'users'].map(key => [
            key, new Map([...state[key]].map(([id, doc]) => [id, JSON.parse(JSON.stringify(doc))]))
        ]));
        try { return await callback({ testTransaction: true }); }
        catch (error) { Object.assign(state, backup); throw error; }
        finally { release(); }
    });
    t.mock.method(Contest, 'findById', id => query(() => hydrateContest(id)));
    t.mock.method(Contest, 'find', filter => ({ sort: async () => [...state.contests.values()]
        .filter(c => !c.ratingsCalculated && c.participants.length && new Date(c.endTime) <= new Date(filter.endTime.$lte)
            && (c.status === 'Ended' || new Date(c.endTime) < new Date()))
        .sort((a, b) => new Date(a.endTime) - new Date(b.endTime) || String(a._id).localeCompare(String(b._id)))
        .map(c => Contest.hydrate(c)) }));
    t.mock.method(Contest, 'findOneAndUpdate', async (filter, update, options) => {
        assert.ok(options.session?.testTransaction);
        assert.deepEqual(filter.ratingsCalculated, { $ne: true });
        assert.equal(filter.$or[0].status, 'Ended');
        const stored = state.contests.get(filter._id.toString());
        if (stored.ratingsCalculated || (stored.status !== 'Ended' && new Date(stored.endTime) >= new Date())) return null;
        Object.assign(stored, update.$set);
        return hydrateContest(filter._id);
    });
    t.mock.method(StudentStats, 'find', filter => query(() => filter.userId.$in
        .map(id => state.stats.get(id)).filter(Boolean).map(doc => StudentStats.hydrate(doc))));
    t.mock.method(User, 'find', () => query(() => [...state.users.values()].map(doc => User.hydrate(doc))));
    t.mock.method(Contest.prototype, 'save', async function(options) {
        assert.ok(options.session?.testTransaction);
        state.contests.set(this.id, this.toObject());
        return this;
    });
    t.mock.method(StudentStats.prototype, 'save', async function(options) {
        assert.ok(options.session?.testTransaction);
        if (this.userId === state.failUserId) throw new Error('Simulated write failure');
        state.statsSaves++;
        state.stats.set(this.userId, this.toObject());
        return this;
    });
    t.mock.method(User.prototype, 'save', async function(options) {
        assert.ok(options.session?.testTransaction);
        state.users.set(this.id, this.toObject());
        return this;
    });
    return { state, contest, reload: () => hydrateContest(contest._id) };
}

test('one request calculates once and reloaded repeats preserve ratings and history', async t => {
    const { state, contest, reload } = database(t);
    const request = { params: { id: contest.id } };
    const first = response();
    await calculateContestRatingsForContest(request, first);
    assert.equal(first.statusCode, 200);
    assert.equal(state.statsSaves, 2);
    const saved = reload();
    assert.equal(saved.ratingsCalculated, true);
    assert.ok(saved.ratingsCalculatedAt instanceof Date);
    for (const participant of saved.participants) {
        const stats = StudentStats.hydrate(state.stats.get(participant.userId));
        assert.equal(stats.ratingHistory.length, 1);
        const history = stats.ratingHistory[0];
        assert.equal(history.contestId.toString(), contest.id);
        assert.equal(history.oldRating, 1200);
        assert.equal(history.newRating, participant.newRating);
        assert.equal(history.ratingChange, participant.ratingChange);
        assert.ok(history.rank > 0);
        assert.equal(history.date.getTime(), contest.endTime.getTime());
        assert.ok(stats.maxRating >= Math.max(1200, stats.contestRating));
    }
    const before = JSON.stringify([...state.stats.values()]);
    const second = response();
    await calculateContestRatingsForContest(request, second);
    assert.equal(second.statusCode, 200);
    assert.match(second.body.message, /already calculated/);
    assert.equal(JSON.stringify([...state.stats.values()]), before);
    assert.equal(state.statsSaves, 2);
    assert.deepEqual(second.body.participants.map(p => p.newRating), first.body.participants.map(p => p.newRating));
});

test('simultaneous stale requests apply a contest only once', async t => {
    const { state, reload } = database(t);
    const copies = [reload(), reload()];
    await Promise.all(copies.map(processRatingsForContest));
    assert.equal(state.statsSaves, 2);
    assert.deepEqual(copies[0].participants.map(p => p.newRating), copies[1].participants.map(p => p.newRating));
    for (const stats of state.stats.values()) assert.equal(stats.ratingHistory.length, 1);
});

test('failed participant write rolls back, reports failure, and can be retried', async t => {
    const { state, contest, reload } = database(t);
    const before = JSON.stringify({ stats: [...state.stats.values()], users: [...state.users.values()] });
    state.failUserId = userIds[1];
    t.mock.method(console, 'error', () => {});
    const failed = response();
    await calculateContestRatingsForContest({ params: { id: contest.id } }, failed);
    assert.equal(failed.statusCode, 500);
    assert.equal(reload().ratingsCalculated, false);
    assert.equal(JSON.stringify({ stats: [...state.stats.values()], users: [...state.users.values()] }), before);
    state.failUserId = null;
    await processRatingsForContest(reload());
    assert.equal(reload().ratingsCalculated, true);
    for (const stats of state.stats.values()) assert.equal(stats.ratingHistory.length, 1);
});

test('different contests with the same name retain distinct history entries', async t => {
    const { state, reload } = database(t);
    await processRatingsForContest(reload());
    const next = new Contest({
        ...reload().toObject(), _id: undefined, ratingsCalculated: false, ratingsCalculatedAt: undefined
    });
    state.contests.set(next.id, next.toObject());
    await processRatingsForContest(next);
    for (const stats of state.stats.values()) {
        assert.equal(stats.ratingHistory.length, 2);
        assert.notEqual(stats.ratingHistory[0].contestId.toString(), stats.ratingHistory[1].contestId.toString());
    }
});

test('legacy history is recovered without reapplying it or resetting later ratings', async t => {
    const { state, contest, reload } = database(t);
    const stats = state.stats.get(userIds[0]);
    stats.contestRating = 1800;
    stats.ratingHistory = [{ contestName: contest.name, newRating: 1300, ratingChange: '+100' }];
    state.users.get(userIds[0]).rating = 1800;
    await processRatingsForContest(reload());
    const savedStats = state.stats.get(userIds[0]);
    assert.equal(savedStats.contestRating, 1800);
    assert.equal(state.users.get(userIds[0]).rating, 1800);
    assert.equal(savedStats.ratingHistory.length, 1);
    assert.equal(savedStats.ratingHistory[0].contestId.toString(), contest.id);
    assert.equal(savedStats.ratingHistory[0].oldRating, 1200);
    assert.equal(reload().participants[0].newRating, 1300);
    assert.equal(reload().participants[0].ratingChange, '+100');
});

test('a new contestant starts at 1000 whether or not practice stats exist', async t => {
    const { state, contest, reload } = database(t);
    state.stats.delete(userIds[0]);
    state.users.get(userIds[0]).rating = 0;
    state.stats.get(userIds[1]).contestRating = 1000;
    await processRatingsForContest(contest);
    assert.deepEqual(reload().participants.map(p => p.oldRating), [1000, 1000]);
});

test('auth ID participant updates legacy stats instead of creating a second rating', async t => {
    const { state, contest, reload } = database(t);
    const authId = 'string-auth-identity';
    state.users.get(userIds[0]).id = authId;
    state.contests.get(contest.id).participants[0].userId = authId;
    await processRatingsForContest(reload());
    assert.equal(state.stats.has(authId), false);
    assert.equal(state.stats.get(userIds[0]).ratingHistory.length, 1);
    assert.equal(reload().participants[0].oldRating, 1200);
    assert.equal(reload().participants[0].newRating, state.stats.get(userIds[0]).contestRating);
});

test('rating a later contest first finalizes the earlier elapsed round first', async t => {
    const { state, contest, reload } = database(t);
    const earlier = new Contest({
        name: 'Earlier round', status: 'Ongoing',
        startTime: new Date(contest.startTime.getTime() - 120_000),
        endTime: new Date(contest.endTime.getTime() - 120_000),
        participants: userIds.map((userId, i) => ({ userId, score: i + 1 }))
    });
    state.contests.set(earlier.id, earlier.toObject());
    await processRatingsForContest(reload());
    for (const stats of state.stats.values()) {
        assert.deepEqual(stats.ratingHistory.map(h => String(h.contestId)), [earlier.id, contest.id]);
        assert.equal(stats.ratingHistory[1].oldRating, stats.ratingHistory[0].newRating);
        assert.equal(stats.contestRating, stats.ratingHistory[1].newRating);
    }
    assert.equal(state.contests.get(earlier.id).status, 'Ended');
});

test('leaderboard refresh finalizes elapsed ratings without visiting the contest page', async t => {
    const { state, reload } = database(t);
    t.mock.method(Contest, 'findOne', filter => {
        assert.deepEqual(filter.ratingsCalculated, { $ne: true });
        return { sort: async () => reload() };
    });
    await refreshPendingContestRatings();
    assert.equal(reload().ratingsCalculated, true);
    for (const stats of state.stats.values()) assert.equal(stats.ratingHistory.length, 1);
});

test('simultaneous requests for different rounds preserve chronological rating history', async t => {
    const { state, contest, reload } = database(t);
    const later = new Contest({ ...contest.toObject(), _id: undefined,
        endTime: new Date(contest.endTime.getTime() + 1000) });
    state.contests.set(later.id, later.toObject());
    await Promise.all([processRatingsForContest(later), processRatingsForContest(reload())]);
    for (const stats of state.stats.values()) {
        assert.deepEqual(stats.ratingHistory.map(h => String(h.contestId)), [contest.id, later.id]);
        assert.equal(stats.ratingHistory[1].oldRating, stats.ratingHistory[0].newRating);
    }
});
