import mongoose from "mongoose";
import { University } from "../models/University.js";
import { User } from "../models/User.js";
import { refreshPendingContestRatings } from "../utils/contestRatings.js";
import {
    parseLeaderboardPagination, rankLeaderboard, paginateLeaderboard, activeLeaderboardFilter,
    ratingStages, ratedEligibilityStages, universityLeaderboardPipeline, getUserLeaderboardStats, getUserCampusRank
} from "../utils/leaderboard.js";

export const getGlobalUniversities = async (req, res) => {
    try {
        const pagination = parseLeaderboardPagination(req.query, 10);
        if (!pagination) return res.status(400).json({ message: "Page must be a positive integer and limit must be between 1 and 100." });
        await refreshPendingContestRatings();
        const ranked = rankLeaderboard(await User.aggregate(universityLeaderboardPipeline()), 'totalRating');
        const { rows, currentPage, totalPages } = paginateLeaderboard(ranked, pagination);
        return res.json({ universities: rows, currentPage, totalPages, totalUniversities: ranked.length });
    } catch (error) {
        console.error("Error fetching global universities:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getCampusLeaderboard = async (req, res) => {
    try {
        const { universityId } = req.params;
        if (!mongoose.isObjectIdOrHexString(universityId)) return res.status(404).json({ message: "University not found" });
        const pagination = parseLeaderboardPagination(req.query, 20);
        if (!pagination) return res.status(400).json({ message: "Page must be a positive integer and limit must be between 1 and 100." });
        const university = await University.findById(universityId);
        if (!university) return res.status(404).json({ message: "University not found" });
        await refreshPendingContestRatings();
        const students = await User.aggregate([
            { $match: { university: new mongoose.Types.ObjectId(universityId), ...activeLeaderboardFilter() } },
            ...ratingStages(),
            ...ratedEligibilityStages(),
            { $sort: { contestRating: -1, _id: 1 } },
            { $project: { name: 1, id: '$authUserId', contestRating: 1, createdAt: 1 } }
        ]);
        const ranked = rankLeaderboard(students, 'contestRating');
        const { rows, currentPage, totalPages } = paginateLeaderboard(ranked, pagination);
        const totalRating = students.length ? students.slice(0, 10).reduce((sum, student) => sum + student.contestRating, 0) : null;
        return res.json({ university: { ...university.toObject(), totalRating }, students: rows,
            currentPage, totalPages, totalStudents: ranked.length, ratedParticipants: ranked.length });
    } catch (error) {
        console.error("Error fetching campus leaderboard:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getMyLeaderboardStats = async (req, res) => {
    try {
        const id = req.user.id;
        const identities = [{ id }];
        if (mongoose.isObjectIdOrHexString(id)) identities.push({ _id: id });
        const user = await User.findOne({ $or: identities }).populate("university").lean();
        if (!user) return res.status(404).json({ message: "User not found in database" });
        await refreshPendingContestRatings();
        const { rating, maxRating, isRated } = await getUserLeaderboardStats(user);
        const campusRank = await getUserCampusRank(user, rating, isRated);
        let globalUniversityRank = null;
        if (user.university) {
            const ranked = rankLeaderboard(await User.aggregate(universityLeaderboardPipeline()), 'totalRating');
            globalUniversityRank = ranked.find(row => String(row._id) === String(user.university._id))?.rank ?? null;
        }
        return res.json({ rating, maxRating, isRated, campusRank, globalUniversityRank, university: user.university || null });
    } catch (error) {
        console.error("Error fetching personal leaderboard stats:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
