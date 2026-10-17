import { User } from '../models/User.js';
import { StudentStats } from '../models/StudentStats.js';
import { Contest } from '../models/Contest.js';
import { INITIAL_RATING } from './eloCalculator.js';
export { INITIAL_RATING } from './eloCalculator.js';

export const LEADERBOARD_ROLES = ['student', 'problem_setter'];
export const activeLeaderboardFilter = () => ({ role: { $in: LEADERBOARD_ROLES }, banned: { $ne: true }, disabledAt: null });

export function parseLeaderboardPagination(query, defaultLimit) {
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? defaultLimit : Number(query.limit);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 ||
        !Number.isSafeInteger(limit) || limit < 1 || limit > 100) return null;
    return { page, limit };
}

// Use competition ranks (1, 1, 3). ID sorting keeps tied rows stable across requests.
export function rankLeaderboard(rows, field) {
    let rank = 0;
    return rows.map((row, index) => {
        if (index === 0 || row[field] !== rows[index - 1][field]) rank = index + 1;
        return { ...row, rank };
    });
}

export function paginateLeaderboard(rows, pagination) {
    const totalPages = Math.max(1, Math.ceil(rows.length / pagination.limit));
    const currentPage = Math.min(pagination.page, totalPages);
    return {
        rows: rows.slice((currentPage - 1) * pagination.limit, currentPage * pagination.limit),
        currentPage, totalPages,
    };
}

export const ratingStages = () => [
    { $addFields: { authUserId: { $ifNull: ['$id', { $toString: '$_id' }] } } },
    { $lookup: {
        from: 'student_stats',
        let: { authId: '$authUserId', databaseId: { $toString: '$_id' } },
        pipeline: [
            { $match: { $expr: { $in: ['$userId', ['$$authId', '$$databaseId']] } } },
            { $addFields: { identityPriority: { $cond: [{ $eq: ['$userId', '$$authId'] }, 0, 1] } } },
            { $sort: { identityPriority: 1 } },
            { $limit: 1 },
        ],
        as: 'stats',
    } },
    { $unwind: { path: '$stats', preserveNullAndEmptyArrays: true } },
    { $addFields: { contestRating: { $ifNull: ['$stats.contestRating', INITIAL_RATING] } } },
];

// A default rating or a standalone history entry is not proof of competition.
// Require a finalized contest with a recorded rating for this participant.
export const ratedEligibilityStages = () => [
    { $lookup: {
        from: 'contests',
        let: { authId: '$authUserId', databaseId: { $toString: '$_id' } },
        pipeline: [
            { $match: { status: 'Ended', ratingsCalculated: true, $expr: { $gt: [
                { $size: { $filter: { input: { $ifNull: ['$participants', []] }, as: 'participant', cond: { $and: [
                    { $in: ['$$participant.userId', ['$$authId', '$$databaseId']] },
                    { $isNumber: '$$participant.newRating' },
                ] } } } }, 0,
            ] } } },
            { $limit: 1 }, { $project: { _id: 1 } },
        ], as: 'ratedResults',
    } },
    { $match: { 'ratedResults.0': { $exists: true }, 'stats.contestRating': { $type: 'number' } } },
];

export const universityLeaderboardPipeline = () => [
    { $match: { ...activeLeaderboardFilter(), university: { $ne: null } } },
    ...ratingStages(),
    ...ratedEligibilityStages(),
    { $sort: { contestRating: -1, _id: 1 } },
    { $group: { _id: '$university', ratings: { $push: '$contestRating' }, totalStudents: { $sum: 1 } } },
    { $project: { totalRating: { $sum: { $slice: ['$ratings', 10] } }, totalStudents: 1 } },
    { $lookup: { from: 'universities', localField: '_id', foreignField: '_id', as: 'university' } },
    { $unwind: '$university' },
    { $project: { name: '$university.name', shortName: '$university.shortName', totalRating: 1, totalStudents: 1 } },
    { $sort: { totalRating: -1, _id: 1 } },
];

export async function getUserLeaderboardStats(user) {
    const primaryId = String(user.id || user._id);
    let stats = await StudentStats.findOne({ userId: primaryId }).lean();
    if (!stats && user._id && String(user._id) !== primaryId) {
        stats = await StudentStats.findOne({ userId: String(user._id) }).lean();
    }
    const rating = stats?.contestRating ?? INITIAL_RATING;
    const maxRating = (stats?.ratingHistory || []).reduce((peak, entry) => Math.max(
        peak, entry.oldRating ?? rating, entry.newRating ?? rating
    ), Math.max(rating, stats?.maxRating ?? rating));
    const identities = [...new Set([primaryId, user._id && String(user._id)].filter(Boolean))];
    const isRated = !!(stats && Number.isFinite(stats.contestRating) && await Contest.exists({
        status: 'Ended', ratingsCalculated: true,
        participants: { $elemMatch: { userId: { $in: identities }, newRating: { $type: 'number' } } },
    }));
    return { stats, rating, maxRating, isRated };
}

export async function getUserCampusRank(user, rating, isRated = false) {
    if (!isRated || !user.university || !LEADERBOARD_ROLES.includes(user.role) || user.banned || user.disabledAt) return null;
    const counts = await User.aggregate([
        { $match: { university: user.university._id || user.university, ...activeLeaderboardFilter() } },
        ...ratingStages(),
        ...ratedEligibilityStages(),
        { $match: { contestRating: { $gt: rating } } },
        { $count: 'higherRanked' },
    ]);
    return (counts[0]?.higherRanked ?? 0) + 1;
}
