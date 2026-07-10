import mongoose from "mongoose";
import { University } from "../models/University.js";
import { User } from "../models/User.js";

// GET /api/leaderboard/universities
export const getGlobalUniversities = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Aggregate to calculate Top 10 students' contestRating sum per university
        const uniStats = await User.aggregate([
            { $match: { university: { $ne: null } } },
            // Convert _id to string so it can match userId in student_stats
            { $addFields: { userIdStr: { $toString: "$_id" } } },
            { $lookup: {
                from: "student_stats",
                localField: "userIdStr",
                foreignField: "userId",
                as: "stats"
            }},
            { $unwind: { path: "$stats", preserveNullAndEmptyArrays: true } },
            { $addFields: { contestRating: { $ifNull: ["$stats.contestRating", 1000] } } },
            { $sort: { contestRating: -1 } },
            { $group: {
                _id: "$university",
                topStudents: { $push: "$contestRating" },
                totalStudents: { $sum: 1 }
            }},
            { $project: {
                top10: { $slice: ["$topStudents", 10] },
                totalStudents: 1
            }},
            { $project: {
                totalRating: { $sum: "$top10" },
                totalStudents: 1
            }},
            { $sort: { totalRating: -1 } }
        ]);

        const totalUniversities = uniStats.length;
        const paginatedStats = uniStats.slice(skip, skip + limit);

        // Populate university details
        const universities = await Promise.all(
            paginatedStats.map(async (stat) => {
                const uni = await University.findById(stat._id).lean();
                if (uni) {
                    return {
                        ...uni,
                        totalRating: stat.totalRating,
                        totalStudents: stat.totalStudents
                    };
                }
                return null;
            })
        );

        res.json({
            universities: universities.filter(u => u !== null),
            currentPage: page,
            totalPages: Math.ceil(totalUniversities / limit) || 1,
            totalUniversities
        });
    } catch (error) {
        console.error("Error fetching global universities:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/leaderboard/university/:universityId
export const getCampusLeaderboard = async (req, res) => {
    try {
        const { universityId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const university = await University.findById(universityId);
        if (!university) {
            return res.status(404).json({ message: "University not found" });
        }

        const totalStudents = await User.countDocuments({ university: universityId });
        
        // Find students and join with student_stats to get their real contestRating
        const students = await User.aggregate([
            { $match: { university: new mongoose.Types.ObjectId(universityId) } },
            { $addFields: { userIdStr: { $toString: "$_id" } } },
            { $lookup: {
                from: "student_stats",
                localField: "userIdStr",
                foreignField: "userId",
                as: "stats"
            }},
            { $unwind: { path: "$stats", preserveNullAndEmptyArrays: true } },
            { $addFields: { 
                contestRating: { $ifNull: ["$stats.contestRating", 1000] },
                maxRating: { $ifNull: ["$stats.maxRating", 1000] }
            }},
            { $sort: { contestRating: -1 } },
            { $project: { name: 1, contestRating: 1, maxRating: 1, createdAt: 1 } }
        ]);

        const paginatedStudents = students.slice(skip, skip + limit);
        
        // Dynamically calculate Top 10 sum for the campus
        const top10Rating = students.slice(0, 10).reduce((sum, student) => sum + student.contestRating, 0);

        res.json({
            university: {
                ...university.toObject(),
                totalRating: top10Rating
            },
            students: paginatedStudents,
            currentPage: page,
            totalPages: Math.ceil(totalStudents / limit),
            totalStudents
        });
    } catch (error) {
        console.error("Error fetching campus leaderboard:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/leaderboard/me
export const getMyLeaderboardStats = async (req, res) => {
    try {
        const userEmail = req.user.email;
        const user = await User.findOne({ email: userEmail }).populate("university");

        if (!user) {
            return res.status(404).json({ message: "User not found in database" });
        }

        if (!user.university) {
            return res.json({
                rating: user.contestRating || 1200,
                campusRank: null,
                globalUniversityRank: null,
                university: null,
                message: "You have not joined a university yet."
            });
        }

        // We need to re-run the aggregation to find global university rank
        const uniStats = await User.aggregate([
            { $match: { university: { $ne: null } } },
            { $addFields: { userIdStr: { $toString: "$_id" } } },
            { $lookup: {
                from: "student_stats",
                localField: "userIdStr",
                foreignField: "userId",
                as: "stats"
            }},
            { $unwind: { path: "$stats", preserveNullAndEmptyArrays: true } },
            { $addFields: { contestRating: { $ifNull: ["$stats.contestRating", 1000] } } },
            { $sort: { contestRating: -1 } },
            { $group: {
                _id: "$university",
                topStudents: { $push: "$contestRating" }
            }},
            { $project: {
                totalRating: { $sum: { $slice: ["$topStudents", 10] } }
            }},
            { $sort: { totalRating: -1 } }
        ]);

        const globalRank = uniStats.findIndex(u => u._id.toString() === user.university._id.toString()) + 1;

        // Fetch user's real stats to find their contestRating
        const mongoose = (await import("mongoose")).default;
        const studentStats = await mongoose.model('StudentStats').findOne({ userId: user._id.toString() });
        const dynamicContestRating = studentStats ? studentStats.contestRating : 1000;
        const maxRating = studentStats ? studentStats.maxRating : 1000;

        // Calculate personal campus rank by aggregating users in the same university
        // and counting how many have a higher contestRating
        const campusRanks = await User.aggregate([
            { $match: { university: user.university._id } },
            { $addFields: { userIdStr: { $toString: "$_id" } } },
            { $lookup: {
                from: "student_stats",
                localField: "userIdStr",
                foreignField: "userId",
                as: "stats"
            }},
            { $unwind: { path: "$stats", preserveNullAndEmptyArrays: true } },
            { $addFields: { contestRating: { $ifNull: ["$stats.contestRating", 1000] } } },
            { $match: { contestRating: { $gt: dynamicContestRating } } },
            { $count: "higherRanked" }
        ]);
        
        const campusRank = (campusRanks.length > 0 ? campusRanks[0].higherRanked : 0) + 1;

        res.json({
            rating: dynamicContestRating,
            maxRating: maxRating,
            campusRank,
            globalUniversityRank: globalRank > 0 ? globalRank : null,
            university: user.university
        });
    } catch (error) {
        console.error("Error fetching personal leaderboard stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
