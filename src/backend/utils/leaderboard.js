import { User } from '../models/User.js';
import { StudentStats } from '../models/StudentStats.js';

export const LEADERBOARD_ROLES = ['student', 'problem_setter'];
export const INITIAL_RATING = 1000;

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

export const universityLeaderboardPipeline = () => [
    { $match: { role: { $in: LEADERBOARD_ROLES }, university: { $ne: null } } },
    ...ratingStages(),
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
    return { stats, rating, maxRating };
}

export async function getUserCampusRank(user, rating) {
    if (!user.university || !LEADERBOARD_ROLES.includes(user.role)) return null;
    const counts = await User.aggregate([
        { $match: { university: user.university._id || user.university, role: { $in: LEADERBOARD_ROLES } } },
        ...ratingStages(),
        { $match: { contestRating: { $gt: rating } } },
        { $count: 'higherRanked' },
    ]);
    return (counts[0]?.higherRanked ?? 0) + 1;
}
