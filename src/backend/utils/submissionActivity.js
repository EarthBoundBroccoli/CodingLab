const DAY_MS = 24 * 60 * 60 * 1000;

const maxStreak = dates => {
    let longest = 0;
    let streak = 0;
    let previous;
    for (const date of [...dates].sort()) {
        const timestamp = Date.parse(date);
        streak = timestamp - previous === DAY_MS ? streak + 1 : 1;
        longest = Math.max(longest, streak);
        previous = timestamp;
    }
    return longest;
};

export function buildSubmissionActivity(submissions, now = new Date()) {
    const today = Date.parse(now.toISOString().slice(0, 10));
    const yearStart = today - 364 * DAY_MS;
    const monthStart = today - 29 * DAY_MS;
    const firstSolves = new Map();
    const counts = new Map();

    for (const submission of submissions) {
        const timestamp = new Date(submission.createdAt).getTime();
        if (!submission.problemId || !submission.createdAt || !Number.isFinite(timestamp) || timestamp > now.getTime()) continue;
        const problemId = submission.problemId.toString();
        const date = new Date(timestamp).toISOString().slice(0, 10);
        counts.set(date, (counts.get(date) || 0) + 1);
        if (!firstSolves.has(problemId) || timestamp < firstSolves.get(problemId)) {
            firstSolves.set(problemId, timestamp);
        }
    }

    const dates = [...counts.keys()].sort();
    let currentStreak = 0;
    let streakDay = counts.has(new Date(today).toISOString().slice(0, 10)) ? today : today - DAY_MS;
    // Yesterday's streak remains active until today ends. Count each day once.
    while (counts.has(new Date(streakDay).toISOString().slice(0, 10))) {
        currentStreak++;
        streakDay -= DAY_MS;
    }
    const solves = [...firstSolves.values()];
    const codeforcesStats = {
        solvedAllTime: firstSolves.size,
        solvedLastYear: solves.filter(timestamp => timestamp >= yearStart).length,
        solvedLastMonth: solves.filter(timestamp => timestamp >= monthStart).length,
        maxStreakAllTime: maxStreak(dates),
        maxStreakLastYear: maxStreak(dates.filter(date => Date.parse(date) >= yearStart)),
        maxStreakLastMonth: maxStreak(dates.filter(date => Date.parse(date) >= monthStart))
    };

    const heatmap365 = Array.from({ length: 365 }, (_, index) => {
        const date = new Date(yearStart + index * DAY_MS).toISOString().slice(0, 10);
        const count = counts.get(date) || 0;
        const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;
        return { date, count, level };
    });

    return {
        currentStreak,
        codeforcesStats,
        heatmap365,
        firstSolveHistory: [...firstSolves].map(([problemId, timestamp]) => ({
            problemId, date: new Date(timestamp).toISOString().slice(0, 10)
        })),
        activityHistory: dates.map(date => ({ date, count: counts.get(date) }))
    };
}
