import mongoose from 'mongoose';
import { Contest } from '../models/Contest.js';
import { StudentStats } from '../models/StudentStats.js';
import { User } from '../models/User.js';
import { calculateContestRatings, INITIAL_RATING } from './eloCalculator.js';
import { rankContestParticipants } from './contestStandings.js';
import { getUserAuthId } from './userIdentity.js';

// Old history entries lack contest IDs because the previous schema discarded them.
const historyIndexForContest = (stats, contest) => (stats?.ratingHistory || []).findIndex(
    entry => entry.contestId
        ? entry.contestId.toString() === contest._id.toString()
        : entry.contestName === contest.name
);

export const refreshPendingContestRatings = async () => {
    const latest = await Contest.findOne({
        ratingsCalculated: { $ne: true }, 'participants.0': { $exists: true },
        $or: [{ status: 'Ended' }, { endTime: { $lt: new Date() } }],
    }).sort({ endTime: -1, _id: -1 });
    if (latest) await processRatingsForContest(latest);
};

export const processRatingsForContest = async contest => {
    if (!contest || contest.ratingsCalculated || !contest.participants?.length) return contest;

    // A later contest must never consume a rating from before an earlier round.
    // Every caller follows the same order; each atomic claim remains idempotent.
    const pending = await Contest.find({
        ratingsCalculated: { $ne: true },
        endTime: { $lte: contest.endTime },
        'participants.0': { $exists: true },
        $or: [{ status: 'Ended' }, { endTime: { $lt: new Date() } }],
    }).sort({ endTime: 1, _id: 1 });
    for (const earlier of pending) {
        await processContestRatingsAtomic(String(earlier._id) === String(contest._id) ? contest : earlier);
    }
    // Another request may have committed the target before the pending query.
    if (!pending.some(item => String(item._id) === String(contest._id))) await processContestRatingsAtomic(contest);
    return contest;
};

const processContestRatingsAtomic = async contest => {

    const completed = await Contest.db.transaction(async session => {
        // Claim and update the contest in the same transaction as its ratings.
        // Competing requests retry and then read the result already committed.
        const current = await Contest.findOneAndUpdate(
            { _id: contest._id, ratingsCalculated: { $ne: true },
                $or: [{ status: 'Ended' }, { endTime: { $lt: new Date() } }] },
            { $set: { ratingsCalculated: true, status: 'Ended' } },
            { new: true, session }
        );
        if (!current) return Contest.findById(contest._id).session(session);

        const sorted = rankContestParticipants(current.participants);
        const userIds = sorted.map(p => p.userId.toString());
        const users = await User.find({ $or: [
            { _id: { $in: userIds.filter(id => mongoose.isObjectIdOrHexString(id)) } },
            { id: { $in: userIds } }
        ] }).session(session);
        const userMap = new Map();
        for (const user of users) {
            userMap.set(user._id.toString(), user);
            userMap.set(getUserAuthId(user), user);
        }

        const identities = [...new Set([...userIds, ...userMap.keys()])];
        const statsList = await StudentStats.find({ userId: { $in: identities } }).session(session);
        const statsByIdentity = new Map(statsList.map(s => [s.userId.toString(), s]));
        const statsMap = new Map(userIds.map(userId => {
            const user = userMap.get(userId);
            return [userId, statsByIdentity.get(user ? getUserAuthId(user) : userId) ||
                statsByIdentity.get(String(user?._id || userId)) || statsByIdentity.get(userId)];
        }));

        const input = sorted.map(p => {
            const userId = p.userId.toString();
            const stats = statsMap.get(userId);
            const user = userMap.get(userId);
            const history = stats?.ratingHistory?.[historyIndexForContest(stats, current)];
            const oldRating = history
                ? history.oldRating ?? history.newRating - Number(history.ratingChange)
                : stats?.contestRating ?? (user?.rating > 0 ? user.rating : INITIAL_RATING);
            if (!Number.isFinite(oldRating)) throw new Error('Invalid existing contest rating history.');
            return { userId, rank: p.rank, oldRating, score: p.score, penalty: p.penalty };
        });

        for (const result of calculateContestRatings(input)) {
            const { userId, oldRating, newRating, ratingChange, ratingTier } = result;
            const user = userMap.get(userId);
            const stats = statsMap.get(userId) || new StudentStats({ userId: user ? getUserAuthId(user) : userId });
            const existingIndex = historyIndexForContest(stats, current);
            const participant = current.participants.find(p => p.userId.toString() === userId);

            if (existingIndex >= 0) {
                // Recover previously applied results without changing the user's current rating.
                const history = stats.ratingHistory[existingIndex];
                history.contestId = current._id;
                history.oldRating = oldRating;
                history.rank ??= result.rank;
                history.date ??= current.endTime;
                participant.oldRating = oldRating;
                participant.newRating = history.newRating;
                participant.ratingChange = history.ratingChange;
            } else {
                stats.contestRating = newRating;
                stats.ratingTier = ratingTier;
                stats.ratingHistory.push({
                    contestId: current._id, contestName: current.name,
                    oldRating, newRating, ratingChange, rank: result.rank, date: current.endTime
                });
                if (user) {
                    user.rating = newRating;
                    await user.save({ session });
                }
                participant.oldRating = oldRating;
                participant.newRating = newRating;
                participant.ratingChange = ratingChange;
            }

            stats.maxRating = Math.max(
                stats.maxRating ?? INITIAL_RATING, stats.contestRating, oldRating,
                ...stats.ratingHistory.map(entry => entry.newRating).filter(Number.isFinite)
            );
            await stats.save({ session });
        }

        current.ratingsCalculatedAt = new Date();
        await current.save({ session });
        return current;
    });

    if (!completed) throw new Error('Contest not found during rating calculation.');
    // Copy only rating fields so populated problem and user details remain intact.
    contest.ratingsCalculated = completed.ratingsCalculated;
    contest.status = completed.status;
    contest.ratingsCalculatedAt = completed.ratingsCalculatedAt;
    for (const participant of contest.participants) {
        const saved = completed.participants.find(p => p.userId.toString() === participant.userId.toString());
        if (saved) {
            participant.oldRating = saved.oldRating;
            participant.newRating = saved.newRating;
            participant.ratingChange = saved.ratingChange;
        }
    }
    return contest;
};
