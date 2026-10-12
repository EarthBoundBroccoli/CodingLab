import mongoose from 'mongoose';
import { Contest } from '../models/Contest.js';
import { StudentStats } from '../models/StudentStats.js';
import { User } from '../models/User.js';
import { calculateContestRatings } from './eloCalculator.js';

// Old history entries lack contest IDs because the previous schema discarded them.
const historyIndexForContest = (stats, contest) => (stats?.ratingHistory || []).findIndex(
    entry => entry.contestId
        ? entry.contestId.toString() === contest._id.toString()
        : entry.contestName === contest.name
);

export const processRatingsForContest = async contest => {
    if (!contest || contest.ratingsCalculated || !contest.participants?.length) return contest;

    const completed = await Contest.db.transaction(async session => {
        // Claim and update the contest in the same transaction as its ratings.
        // Competing requests retry and then read the result already committed.
        const current = await Contest.findOneAndUpdate(
            { _id: contest._id, status: 'Ended', ratingsCalculated: { $ne: true } },
            { $set: { ratingsCalculated: true } },
            { new: true, session }
        );
        if (!current) return Contest.findById(contest._id).session(session);

        const sorted = [...current.participants].sort((a, b) => b.score - a.score || a.penalty - b.penalty);
        const userIds = sorted.map(p => p.userId.toString());
        const statsList = await StudentStats.find({ userId: { $in: userIds } }).session(session);
        const statsMap = new Map(statsList.map(s => [s.userId.toString(), s]));
        const users = await User.find({ $or: [
            { _id: { $in: userIds.filter(id => mongoose.isObjectIdOrHexString(id)) } },
            { id: { $in: userIds } }
        ] }).session(session);
        const userMap = new Map();
        for (const user of users) {
            userMap.set(user._id.toString(), user);
            if (user.id) userMap.set(user.id.toString(), user);
        }

        let rank = 1;
        const input = sorted.map((p, index) => {
            if (index && (p.score !== sorted[index - 1].score || p.penalty !== sorted[index - 1].penalty)) {
                rank = index + 1;
            }
            const userId = p.userId.toString();
            const stats = statsMap.get(userId);
            const user = userMap.get(userId);
            const history = stats?.ratingHistory?.[historyIndexForContest(stats, current)];
            const oldRating = history
                ? history.oldRating ?? history.newRating - Number(history.ratingChange)
                : stats?.contestRating ?? (user?.rating > 0 ? user.rating : 1200);
            if (!Number.isFinite(oldRating)) throw new Error('Invalid existing contest rating history.');
            return { userId, rank, oldRating, score: p.score, penalty: p.penalty };
        });

        for (const result of calculateContestRatings(input)) {
            const { userId, oldRating, newRating, ratingChange, ratingTier } = result;
            const stats = statsMap.get(userId) || new StudentStats({ userId });
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
                const user = userMap.get(userId);
                if (user) {
                    user.rating = newRating;
                    await user.save({ session });
                }
                participant.oldRating = oldRating;
                participant.newRating = newRating;
                participant.ratingChange = ratingChange;
            }

            stats.maxRating = Math.max(
                stats.maxRating ?? 1000, stats.contestRating, oldRating,
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
