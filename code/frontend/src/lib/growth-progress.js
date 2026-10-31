const DAY_MS = 86400000;

export function buildPracticeSeries(stats, days, now = new Date()) {
  const today = Date.parse(now.toISOString().slice(0, 10));
  const start = today - (days - 1) * DAY_MS;
  const firstDates = new Map();
  for (const solve of stats.firstSolveHistory || []) {
    const timestamp = Date.parse(solve.date);
    if (!solve.problemId || !Number.isFinite(timestamp) || timestamp > today) continue;
    const id = String(solve.problemId);
    if (!firstDates.has(id) || timestamp < firstDates.get(id)) firstDates.set(id, timestamp);
  }
  const counts = new Map();
  for (const timestamp of firstDates.values()) {
    if (timestamp >= start) counts.set(timestamp, (counts.get(timestamp) || 0) + 1);
  }
  return Array.from({ length: days }, (_, index) => {
    const timestamp = start + index * DAY_MS;
    return { date: new Date(timestamp).toISOString().slice(0, 10), solved: counts.get(timestamp) || 0 };
  });
}

export function buildPracticeProgress(stats, days, now = new Date()) {
  const today = Date.parse(now.toISOString().slice(0, 10));
  const start = today - (days - 1) * DAY_MS;
  const inWindow = date => {
    const timestamp = Date.parse(date);
    return timestamp >= start && timestamp <= today;
  };
  const activity = (stats.activityHistory || []).filter(day => day.count > 0 && inWindow(day.date));
  const firstSolves = (stats.firstSolveHistory || []).filter(solve => inWindow(solve.date));
  return {
    newlySolved: new Set(firstSolves.map(solve => solve.problemId)).size,
    activeDays: new Set(activity.map(day => day.date)).size,
    acceptedSubmissions: activity.reduce((total, day) => total + day.count, 0),
  };
}

export function findRetrySubmission(submissions, firstSolveHistory) {
  const solved = new Set(firstSolveHistory.map(solve => String(solve.problemId)));
  return submissions.find(sub => sub.problemId?.status === "approved"
    && sub.verdict !== "Accepted" && !solved.has(String(sub.problemId._id))) || null;
}

export const formatSubmissionDate = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
};

export const formatLanguage = language => ({ cpp: "C++", python: "Python", java: "Java" })[language] || language || "Unknown";
