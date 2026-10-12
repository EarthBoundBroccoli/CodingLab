import { User } from "../models/User.js";
import { StudentStats } from "../models/StudentStats.js";
import { University } from "../models/University.js";

// @desc    Get user settings & profile details
// @route   GET /api/users/settings
// @access  Protected
export const getUserSettings = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id || req.session?.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await User.findOne({ $or: [{ _id: userId }, { id: userId }] })
            .populate("university", "name shortName")
            .lean();

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const stats = await StudentStats.findOne({ userId }).lean();
        const universities = await University.find({}).sort({ name: 1 }).lean();

        return res.status(200).json({
            user: {
                id: user._id || user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                image: user.image || "",
                bio: user.bio || stats?.bio || "",
                institution: user.institution || "",
                university: user.university || null,
                socials: user.socials || {
                    codeforces: "",
                    github: "",
                    linkedin: "",
                    website: ""
                }
            },
            stats: stats || {},
            universities
        });
    } catch (error) {
        console.error("Error in getUserSettings:", error);
        return res.status(500).json({ message: "Internal server error.", error: error.message });
    }
};

// @desc    Update user profile & preferences settings
// @route   PATCH /api/users/settings
// @access  Protected
export const updateUserSettings = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id || req.session?.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { name, image, bio, universityId, socials } = req.body;

        const user = await User.findOne({ $or: [{ _id: userId }, { id: userId }] });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (name !== undefined) user.name = name;
        if (image !== undefined) {
            user.image = image;
            try {
                const db = User.db;
                if (db) {
                    await db.collection("user").updateOne(
                        { email: user.email },
                        { $set: { image: image, name: name || user.name } }
                    );
                }
            } catch (e) {}
        }
        if (bio !== undefined) user.bio = bio;

        if (universityId) {
            const uniDoc = await University.findById(universityId);
            if (uniDoc) {
                user.university = uniDoc._id;
                user.institution = uniDoc.name;
            }
        }

        if (socials && typeof socials === 'object') {
            user.socials = {
                codeforces: socials.codeforces || "",
                github: socials.github || "",
                linkedin: socials.linkedin || "",
                website: socials.website || ""
            };
        }

        await user.save();

        if (bio !== undefined) {
            let stats = await StudentStats.findOne({ userId });
            if (stats) {
                stats.bio = bio;
                await stats.save();
            }
        }

        const updatedUser = await User.findOne({ $or: [{ _id: userId }, { id: userId }] })
            .populate("university", "name shortName")
            .lean();

        return res.status(200).json({
            message: "Settings updated successfully!",
            user: updatedUser
        });
    } catch (error) {
        console.error("Error in updateUserSettings:", error);
        return res.status(500).json({ message: "Failed to update settings.", error: error.message });
    }
};

// @desc    Get all universities
// @route   GET /api/users/universities
// @access  Public
export const getUniversities = async (req, res) => {
    try {
        const list = await University.find({}).sort({ name: 1 }).lean();
        return res.status(200).json(list);
    } catch (error) {
        console.error("Error fetching universities:", error);
        return res.status(500).json({ message: "Failed to load universities." });
    }
};

// @desc    Get public profile details of any target user by ID
// @route   GET /api/users/profile/:userId
// @access  Public
export const getPublicUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const mongoose = (await import("mongoose")).default;

        let user = null;
        if (mongoose.Types.ObjectId.isValid(userId)) {
            user = await User.findById(userId).populate("university", "name shortName").lean();
        }
        if (!user) {
            user = await User.findOne({ id: userId }).populate("university", "name shortName").lean();
        }

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const targetUserIdStr = (user._id || user.id).toString();
        const stats = await StudentStats.findOne({ userId: targetUserIdStr }).lean();

        let campusRank = null;
        if (user.university) {
            const userRating = stats ? stats.contestRating : 1200;
            const higherRanked = await User.aggregate([
                { $match: { university: user.university._id } },
                { $addFields: { userIdStr: { $toString: "$_id" } } },
                { $lookup: {
                    from: "student_stats",
                    localField: "userIdStr",
                    foreignField: "userId",
                    as: "stats"
                }},
                { $unwind: { path: "$stats", preserveNullAndEmptyArrays: true } },
                { $addFields: { contestRating: { $ifNull: ["$stats.contestRating", 1200] } } },
                { $match: { contestRating: { $gt: userRating } } },
                { $count: "count" }
            ]);
            campusRank = (higherRanked.length > 0 ? higherRanked[0].count : 0) + 1;
        }

        return res.status(200).json({
            user: {
                id: user._id || user.id,
                name: user.name,
                email: user.email,
                image: user.image || "",
                role: user.role,
                bio: user.bio || stats?.bio || "",
                institution: user.institution || "",
                university: user.university || null,
                socials: user.socials || {}
            },
            stats: stats || {},
            campusRank
        });
    } catch (error) {
        console.error("Error in getPublicUserProfile:", error);
        return res.status(500).json({ message: "Internal server error.", error: error.message });
    }
};
