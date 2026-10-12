import dns from "node:dns/promises";
dns.setServers(["1.1.1.1"]); // Magic DNS fix for Bangladesh ISPs

import "dotenv/config";
import mongoose from "mongoose";
import { auth } from "./lib/auth.js";
import { User } from "./models/User.js";
import { Problem } from "./models/Problem.js";
import { SetterRequest } from "./models/SetterRequest.js";
import { University } from "./models/University.js";
import { Contest } from "./models/Contest.js";
import { StudentStats } from "./models/StudentStats.js";
import { Submission } from "./models/Submission.js";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/codinglab";

async function runSeed() {
    console.log("Connecting to database for seeding...");
    await mongoose.connect(mongoUri);
    console.log("Connected successfully.");

    console.log("Clearing existing data...");
    await User.deleteMany({});
    await Problem.deleteMany({});
    await SetterRequest.deleteMany({});
    await University.deleteMany({});
    await Contest.deleteMany({});
    await StudentStats.deleteMany({});
    await Submission.deleteMany({});
    try {
        await mongoose.connection.db.collection("account").deleteMany({});
        await mongoose.connection.db.collection("session").deleteMany({});
        await mongoose.connection.db.collection("verification").deleteMany({});
    } catch (e) {
        console.log("Failed to clear Better Auth tables, they may not exist yet.");
    }

    console.log("Seeding core accounts via Better Auth API...");
    // 1. Admin
    await auth.api.signUpEmail({
        body: {
            email: "admin@example.com",
            password: "admin123",
            name: "Platform Admin",
        }
    });
    const adminUser = await User.findOne({ email: "admin@example.com" });
    adminUser.role = "admin";
    await adminUser.save();

    // 2. Setters
    await auth.api.signUpEmail({
        body: {
            email: "setter1@example.com",
            password: "setter123",
            name: "Alice Setter",
        }
    });
    const setter1User = await User.findOne({ email: "setter1@example.com" });
    setter1User.role = "problem_setter";
    await setter1User.save();

    await auth.api.signUpEmail({
        body: {
            email: "setter2@example.com",
            password: "setter123",
            name: "Bob Setter",
        }
    });
    const setter2User = await User.findOne({ email: "setter2@example.com" });
    setter2User.role = "problem_setter";
    await setter2User.save();

    // 3. Specific students
    await auth.api.signUpEmail({
        body: {
            email: "emily.chen@example.com",
            password: "student123",
            name: "Emily Chen",
        }
    });
    const emilyUser = await User.findOne({ email: "emily.chen@example.com" });
    emilyUser.institution = "University of Coding";
    await emilyUser.save();

    await auth.api.signUpEmail({
        body: {
            email: "sarah.khan@example.com",
            password: "student123",
            name: "Sarah Khan",
        }
    });
    const sarahUser = await User.findOne({ email: "sarah.khan@example.com" });
    sarahUser.institution = "Vanguard Institute";
    await sarahUser.save();

    await auth.api.signUpEmail({
        body: {
            email: "student1@example.com",
            password: "student123",
            name: "Student 1",
        }
    });
    const student1User = await User.findOne({ email: "student1@example.com" });

    await auth.api.signUpEmail({
        body: {
            email: "student2@example.com",
            password: "student123",
            name: "Student 2",
        }
    });
    const student2User = await User.findOne({ email: "student2@example.com" });

    // Create Universities
    console.log("Creating 15 Bangladeshi Universities...");
    const bdUniversitiesData = [
        { name: "Bangladesh University of Engineering and Technology", shortName: "BUET" },
        { name: "University of Dhaka", shortName: "DU" },
        { name: "BRAC University", shortName: "BRACU" },
        { name: "North South University", shortName: "NSU" },
        { name: "Islamic University of Technology", shortName: "IUT" },
        { name: "Shahjalal University of Science and Technology", shortName: "SUST" },
        { name: "Khulna University of Engineering & Technology", shortName: "KUET" },
        { name: "Rajshahi University of Engineering & Technology", shortName: "RUET" },
        { name: "Chittagong University of Engineering & Technology", shortName: "CUET" },
        { name: "American International University-Bangladesh", shortName: "AIUB" },
        { name: "United International University", shortName: "UIU" },
        { name: "Ahsanullah University of Science and Technology", shortName: "AUST" },
        { name: "East West University", shortName: "EWU" },
        { name: "Independent University, Bangladesh", shortName: "IUB" },
        { name: "Bangladesh University of Professionals", shortName: "BUP" }
    ];
    const insertedUnis = await University.insertMany(bdUniversitiesData);
    
    // Assign Emily and Sarah to real universities so you can log in as them and test it!
    const emilyStudent = await User.findOne({ email: "emily.chen@example.com" });
    const sarahStudent = await User.findOne({ email: "sarah.khan@example.com" });
    
    emilyStudent.university = insertedUnis[0]._id; // BUET
    emilyStudent.rating = 1500;
    insertedUnis[0].totalRating = (insertedUnis[0].totalRating || 0) + 1500;
    await emilyStudent.save();

    sarahStudent.university = insertedUnis[1]._id; // DU
    sarahStudent.rating = 1400;
    insertedUnis[1].totalRating = (insertedUnis[1].totalRating || 0) + 1400;
    await sarahStudent.save();

    // 4. 100 Bangladeshi university students
    console.log("Inserting 100 Bangladeshi university students...");
    const bdStudents = [];
    for (let i = 3; i <= 100; i++) {
        const randomUni = insertedUnis[Math.floor(Math.random() * insertedUnis.length)];
        const randomRating = Math.floor(Math.random() * 2000); // 0 to 1999 points
        randomUni.totalRating = (randomUni.totalRating || 0) + randomRating; // Accumulate the total rating
        
        bdStudents.push({
            name: `Student ${i}`,
            email: `student${i}@example.com`,
            role: "student",
            university: randomUni._id,
            institution: randomUni.name,
            rating: randomRating,
            createdAt: new Date(Date.now() - i * 6 * 60 * 60 * 1000)
        });
    }
    
    // Save updated universities with total ratings
    await Promise.all(insertedUnis.map(uni => uni.save()));

    // Shuffle students
    bdStudents.sort(() => Math.random() - 0.5);
    await User.insertMany(bdStudents);

    console.log("Total users seeded: 124");

    // 5. Approved problems (48) distributed across the setters
    console.log("Generating 48 approved problems...");
    const approvedProblems = [];
    const topics = ["Arrays", "Strings", "Dynamic Programming", "Math", "Graphs", "Trees", "Sorting"];
    const diffs = ["Easy", "Medium", "Hard"];

    for (let i = 1; i <= 48; i++) {
        const difficulty = diffs[i % 3];
        const setter = (i % 2 === 0) ? setter1User : setter2User;
        approvedProblems.push({
            title: `Challenge #${i}: ${difficulty} Task`,
            difficulty: difficulty,
            tags: [topics[i % topics.length], "Algorithm"],
            statement: `This is the problem statement for Challenge #${i}. Find the optimal solution.`,
            inputFormat: "The input contains a single integer N.",
            outputFormat: "Output the required calculated value.",
            timeLimit: 1000,
            memoryLimit: 256,
            samples: [
                { input: "5", output: `${5 * i}`, explanation: "Sample case explanation." }
            ],
            hiddenInput: "https://cloudinary.com/mock-input-url",
            hiddenOutput: "https://cloudinary.com/mock-output-url",
            setterId: setter._id,
            status: "approved",
            createdAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000)
        });
    }
    await Problem.insertMany(approvedProblems);
    console.log("Seeded 48 approved problems.");

    // 6. 5 pending Problems
    console.log("Generating 5 pending problems...");
    const pendingProblemsData = [
        { title: "Two Sum", difficulty: "Easy", setterId: setter1User._id },
        { title: "Valid Parentheses", difficulty: "Easy", setterId: setter2User._id },
        { title: "Merge Intervals", difficulty: "Medium", setterId: setter1User._id },
        { title: "Word Search II", difficulty: "Hard", setterId: setter2User._id },
        { title: "Coin Change", difficulty: "Medium", setterId: setter1User._id }
    ];

    const pendingProblems = pendingProblemsData.map((prob, idx) => ({
        title: prob.title,
        difficulty: prob.difficulty,
        tags: ["Practice", "Interviews"],
        statement: `Draft statement for ${prob.title}. Can you solve it efficiently?`,
        inputFormat: "Standard inputs representing variables.",
        outputFormat: "Standard output format for validation.",
        timeLimit: 1000,
        memoryLimit: 256,
        samples: [
            { input: "1 2 3", output: "6", explanation: "Sample sum is 6." }
        ],
        hiddenInput: `mock_input_data_for_${prob.title.toLowerCase().replace(/ /g, "_")}`,
        hiddenOutput: `mock_output_data_for_${prob.title.toLowerCase().replace(/ /g, "_")}`,
        setterId: prob.setterId,
        status: "pending",
        createdAt: new Date(Date.now() - idx * 24 * 60 * 60 * 1000)
    }));

    await Problem.insertMany(pendingProblems);
    console.log("Seeded 5 pending problems.");

    // 7. 2 pending SetterRequest documents
    console.log("Seeding 2 pending Setter Requests...");
    const requests = [
        {
            userId: emilyUser._id,
            institute: "University of Coding",
            deptProgram: "CSE - B.Sc.",
            currSemester: "3rd Year, 2nd Sem",
            cgpa: "3.92",
            profileLinks: "GitHub: emilyc, Codeforces: emily99",
            motivation: "I have created several problems for our local university contests and would love to contribute high quality DP and Graph tasks to CodingLab.",
            status: "pending"
        },
        {
            userId: sarahUser._id,
            institute: "Vanguard Institute",
            deptProgram: "Software Engineering - B.Sc.",
            currSemester: "4th Year, 1st Sem",
            cgpa: "3.88",
            profileLinks: "GitHub: sarahk, LeetCode: khan_s",
            motivation: "I want to help students practice interview preparation challenges and improve their dynamic programming skills.",
            status: "pending"
        }
    ];

    await SetterRequest.insertMany(requests);
    console.log("Seeded 2 pending setter requests.");

    // 8. Seeding 12 Dynamic Contests (Ongoing, Upcoming, Ended)
    console.log("Seeding 12 Dynamic Contests (Ongoing, Upcoming, Ended)...");
    const allApprovedProbs = await Problem.find({ status: "approved" });
    const probIds = allApprovedProbs.map(p => p._id);
    const sampleStudents = await User.find({ role: "student" }).limit(10);
    const studentIds = sampleStudents.map(s => s._id.toString());

    const now = new Date();
    const contestsData = [
        // ONGOING / ACTIVE CONTESTS (4)
        {
            name: "CodingLab Grand Prix 2026 - Division 1",
            description: "High-stakes competitive programming contest for top-tier algorithms masters.",
            startTime: new Date(now.getTime() - 1 * 60 * 60 * 1000), // Started 1h ago
            endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),   // Ends in 2h
            duration: 180,
            problems: probIds.slice(0, 5),
            status: "Ongoing",
            createdBy: adminUser._id.toString(),
            participants: studentIds.slice(0, 6).map((uid, idx) => ({
                userId: uid,
                score: (idx + 1) * 100,
                penalty: idx * 15,
                solved: probIds.slice(0, Math.min(idx + 1, 5))
            }))
        },
        {
            name: "Dhaka University Intra Speed Run #8",
            description: "Fast-paced 2-hour speed coding round focusing on implementation speed and greedy algorithms.",
            startTime: new Date(now.getTime() - 30 * 60 * 1000), // Started 30m ago
            endTime: new Date(now.getTime() + 90 * 60 * 1000),   // Ends in 1.5h
            duration: 120,
            problems: probIds.slice(5, 9),
            status: "Ongoing",
            createdBy: setter1User._id.toString(),
            participants: studentIds.slice(2, 8).map((uid, idx) => ({
                userId: uid,
                score: (idx + 1) * 100,
                penalty: idx * 10,
                solved: probIds.slice(5, Math.min(5 + idx + 1, 9))
            }))
        },
        {
            name: "BUET IUPC Warmup Sprint 2026",
            description: "Official preliminary warm-up contest for upcoming inter-university programming contests.",
            startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Started 2h ago
            endTime: new Date(now.getTime() + 3 * 60 * 60 * 1000),   // Ends in 3h
            duration: 300,
            problems: probIds.slice(9, 14),
            status: "Ongoing",
            createdBy: adminUser._id.toString(),
            participants: studentIds.slice(1, 7).map((uid, idx) => ({
                userId: uid,
                score: idx * 100,
                penalty: idx * 20,
                solved: probIds.slice(9, Math.min(9 + idx, 14))
            }))
        },
        {
            name: "Dynamic Programming Masterclass Challenge",
            description: "Specialized contest covering grid DP, bitmask DP, and knapsack variations.",
            startTime: new Date(now.getTime() - 45 * 60 * 1000), // Started 45m ago
            endTime: new Date(now.getTime() + 135 * 60 * 1000),  // Ends in 2.25h
            duration: 180,
            problems: probIds.slice(14, 18),
            status: "Ongoing",
            createdBy: setter1User._id.toString(),
            participants: studentIds.slice(0, 5).map((uid, idx) => ({
                userId: uid,
                score: (idx + 1) * 100,
                penalty: idx * 12,
                solved: probIds.slice(14, Math.min(14 + idx + 1, 18))
            }))
        },

        // UPCOMING CONTESTS (4)
        {
            name: "Weekly Algorithm Sprint #45",
            description: "Join the weekly community contest! Standard 4-problem set featuring Easy to Hard challenges.",
            startTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // Starts in 1 day
            endTime: new Date(now.getTime() + (1 * 24 + 2) * 60 * 60 * 1000),
            duration: 120,
            problems: probIds.slice(18, 22),
            status: "Upcoming",
            createdBy: adminUser._id.toString(),
            participants: studentIds.slice(0, 4).map(uid => ({ userId: uid, score: 0, penalty: 0, solved: [] }))
        },
        {
            name: "National Freshman Championship 2026",
            description: "Exclusively for 1st-year undergraduate students across all universities.",
            startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // Starts in 3 days
            endTime: new Date(now.getTime() + (3 * 24 + 4) * 60 * 60 * 1000),
            duration: 240,
            problems: probIds.slice(22, 27),
            status: "Upcoming",
            createdBy: adminUser._id.toString(),
            participants: studentIds.slice(2, 9).map(uid => ({ userId: uid, score: 0, penalty: 0, solved: [] }))
        },
        {
            name: "Graph Theory & Network Flow Cup",
            description: "Test your skills in Dijkstra, Max Flow, Min Cut, and MST algorithms.",
            startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // Starts in 5 days
            endTime: new Date(now.getTime() + (5 * 24 + 3) * 60 * 60 * 1000),
            duration: 180,
            problems: probIds.slice(27, 31),
            status: "Upcoming",
            createdBy: setter1User._id.toString(),
            participants: studentIds.slice(1, 5).map(uid => ({ userId: uid, score: 0, penalty: 0, solved: [] }))
        },
        {
            name: "CodingLab Monthly Long Contest - August Edition",
            description: "7-day long contest designed for deep analytical thinking and optimization.",
            startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Starts in 7 days
            endTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
            duration: 10080,
            problems: probIds.slice(31, 37),
            status: "Upcoming",
            createdBy: adminUser._id.toString(),
            participants: studentIds.slice(0, 8).map(uid => ({ userId: uid, score: 0, penalty: 0, solved: [] }))
        },

        // ENDED / PREVIOUS CONTESTS (4)
        {
            name: "CodingLab Summer Qualifier 2026",
            description: "The qualification round for the 2026 summer finals.",
            startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            endTime: new Date(now.getTime() - (7 * 24 - 3) * 60 * 60 * 1000),
            duration: 180,
            problems: probIds.slice(37, 41),
            status: "Ended",
            createdBy: adminUser._id.toString(),
            participants: studentIds.slice(0, 7).map((uid, idx) => ({
                userId: uid,
                score: (7 - idx) * 100,
                penalty: idx * 25,
                solved: probIds.slice(37, Math.min(37 + 7 - idx, 41))
            }))
        },
        {
            name: "Weekly Algorithm Sprint #44",
            description: "Last week's standard community sprint.",
            startTime: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
            endTime: new Date(now.getTime() - (14 * 24 - 2) * 60 * 60 * 1000),
            duration: 120,
            problems: probIds.slice(41, 45),
            status: "Ended",
            createdBy: setter1User._id.toString(),
            participants: studentIds.slice(1, 6).map((uid, idx) => ({
                userId: uid,
                score: (5 - idx) * 100,
                penalty: idx * 18,
                solved: probIds.slice(41, Math.min(41 + 5 - idx, 45))
            }))
        },
        {
            name: "Brute Force & Backtracking Trial",
            description: "Focused practice contest on recursive searches, N-Queens, and subset generation.",
            startTime: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
            endTime: new Date(now.getTime() - (21 * 24 - 3) * 60 * 60 * 1000),
            duration: 180,
            problems: probIds.slice(0, 4),
            status: "Ended",
            createdBy: adminUser._id.toString(),
            participants: studentIds.slice(3, 9).map((uid, idx) => ({
                userId: uid,
                score: (6 - idx) * 100,
                penalty: idx * 14,
                solved: probIds.slice(0, Math.min(idx + 1, 4))
            }))
        },
        {
            name: "CodingLab Rookie Clash #10",
            description: "Beginner-friendly contest for novice coders.",
            startTime: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            endTime: new Date(now.getTime() - (30 * 24 - 2) * 60 * 60 * 1000),
            duration: 120,
            problems: probIds.slice(4, 8),
            status: "Ended",
            createdBy: setter1User._id.toString(),
            participants: studentIds.slice(0, 10).map((uid, idx) => ({
                userId: uid,
                score: (10 - idx) * 100,
                penalty: idx * 10,
                solved: probIds.slice(4, Math.min(4 + idx + 1, 8))
            }))
        }
    ];

    await Contest.insertMany(contestsData);
    console.log("Seeded 12 Dynamic Contests (4 Ongoing, 4 Upcoming, 4 Ended)!");

    // 9. Seeding Submissions & Competitive StudentStats for Core Accounts
    console.log("Seeding Submissions & Competitive StudentStats for Core Accounts...");
    
    const allUsers = await User.find({});
    
    const sampleCodes = {
        cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int t;\n    if (cin >> t) {\n        while (t--) {\n            long long a, b;\n            cin >> a >> b;\n            cout << (a + b) << "\\n";\n        }\n    }\n    return 0;\n}`,
        python: `import sys\n\ndef solve():\n    lines = sys.stdin.read().split()\n    if not lines: return\n    t = int(lines[0])\n    idx = 1\n    for _ in range(t):\n        a, b = int(lines[idx]), int(lines[idx+1])\n        idx += 2\n        print(a + b)\n\nif __name__ == '__main__':\n    solve()`,
        java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int t = sc.nextInt();\n            while (t-- > 0) {\n                long a = sc.nextLong();\n                long b = sc.nextLong();\n                System.out.println(a + b);\n            }\n        }\n    }\n}`
    };

    const langs = ['cpp', 'python', 'java'];
    const activeSeedUsers = allUsers.slice(0, 15);
    const submissionsToInsert = [];

    for (let uIdx = 0; uIdx < activeSeedUsers.length; uIdx++) {
        const u = activeSeedUsers[uIdx];
        const uId = u._id.toString();
        
        let contestRating = 1640;
        let ratingTier = "SPECIALIST";
        if (u.role === "admin") { contestRating = 2150; ratingTier = "MASTER"; }
        else if (u.role === "problem_setter") { contestRating = 1920; ratingTier = "CANDIDATE MASTER"; }
        else if (uIdx % 3 === 0) { contestRating = 1780; ratingTier = "EXPERT"; }
        else if (uIdx % 2 === 0) { contestRating = 1450; ratingTier = "SPECIALIST"; }
        else { contestRating = 1280; ratingTier = "APPRENTICE"; }

        const userSolvedProbs = [];
        const userAttemptedProbs = [];
        const activityMap = {};

        const numSubmissions = 45 + (uIdx * 4) % 25;
        for (let i = 0; i < numSubmissions; i++) {
            const prob = probIds[i % probIds.length];
            const daysAgo = Math.floor((i * 7) % 320); // spread across past 320 days
            const subDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            const dateStr = subDate.toISOString().split('T')[0];

            const isAc = i % 4 !== 0; // ~75% AC rate
            const verdict = isAc ? "Accepted" : (i % 2 === 0 ? "Wrong Answer" : "Time Limit Exceeded");

            if (!userAttemptedProbs.includes(prob)) userAttemptedProbs.push(prob);
            if (isAc && !userSolvedProbs.includes(prob)) userSolvedProbs.push(prob);

            if (isAc) {
                activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
            }

            submissionsToInsert.push({
                problemId: prob,
                userId: uId,
                code: sampleCodes[langs[i % 3]],
                language: langs[i % 3],
                verdict: verdict,
                timeTaken: 12 + (i % 50),
                memoryUsed: 1024 + (i % 2048),
                createdAt: subDate
            });
        }

        const activityHistory = Object.keys(activityMap).map(d => ({
            date: d,
            count: activityMap[d]
        }));

        const ratingHistory = [
            { contestName: "CodingLab Rookie Clash #10", ratingChange: "+120", newRating: 1120 },
            { contestName: "Weekly Algorithm Sprint #44", ratingChange: "+180", newRating: 1300 },
            { contestName: "CodingLab Summer Qualifier 2026", ratingChange: "+150", newRating: 1450 },
            { contestName: "Dhaka University Intra Speed Run #8", ratingChange: "+190", newRating: contestRating }
        ];

        await StudentStats.findOneAndUpdate(
            { userId: uId },
            {
                userId: uId,
                solvedProblems: userSolvedProbs,
                attemptedProblems: userAttemptedProbs,
                difficultyBreakdown: {
                    easy: Math.floor(userSolvedProbs.length * 0.5),
                    medium: Math.floor(userSolvedProbs.length * 0.35),
                    hard: Math.floor(userSolvedProbs.length * 0.15)
                },
                totalSubmissionsCount: numSubmissions,
                currentStreak: 5,
                longestStreak: 12,
                lastActiveDate: now.toISOString().split('T')[0],
                activityHistory: activityHistory,
                contestRating: contestRating,
                maxRating: contestRating + 80,
                ratingTier: ratingTier,
                points: userSolvedProbs.length * 50,
                ratingHistory: ratingHistory
            },
            { upsert: true, new: true }
        );
    }

    await Submission.insertMany(submissionsToInsert);
    console.log(`Seeded ${submissionsToInsert.length} submissions and competitive stats for core users!`);

    console.log("Database seeding completed successfully!");
    await mongoose.disconnect();
    process.exit(0);
}




// Seeding no longer runs automatically on server start. To seed the database, uncomment the following line and run `node src/backend/seed.js` manually.

runSeed().catch(err => {
    console.error("Seeding error:", err);
    process.exit(1);
});
