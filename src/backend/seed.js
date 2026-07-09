import "dotenv/config";
import mongoose from "mongoose";
import { auth } from "./lib/auth.js";
import { User } from "./models/User.js";
import { Problem } from "./models/Problem.js";
import { SetterRequest } from "./models/SetterRequest.js";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/codinglab";

async function runSeed() {
    console.log("Connecting to database for seeding...");
    await mongoose.connect(mongoUri);
    console.log("Connected successfully.");

    console.log("Clearing existing data...");
    await User.deleteMany({});
    await Problem.deleteMany({});
    await SetterRequest.deleteMany({});
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

    // 4. 119 generic student profiles
    console.log("Inserting 119 generic students...");
    const genericStudents = [];
    for (let i = 1; i <= 119; i++) {
        genericStudents.push({
            name: `Student ${i}`,
            email: `student${i}@example.com`,
            role: "student",
            institution: "CodingLab Academy",
            createdAt: new Date(Date.now() - i * 6 * 60 * 60 * 1000)
        });
    }
    await User.insertMany(genericStudents);

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

    console.log("Database seeding completed successfully!");
    await mongoose.disconnect();
    process.exit(0);
}




// Seeding no longer runs automatically on server start. To seed the database, uncomment the following line and run `node src/backend/seed.js` manually.

// runSeed().catch(err => {
//     console.error("Seeding error:", err);
//     process.exit(1);
// });
