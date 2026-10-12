export function buildContestArchive(contests) {
  return contests.filter(contest => contest.status === "Ended" && contest._id).map(contest => ({
    id: contest._id,
    title: contest.name || "Untitled contest",
    host: contest.createdBy?.name || "Host unavailable",
    participants: Array.isArray(contest.participants) ? contest.participants.length : 0,
    startTime: contest.startTime,
  }));
}

export function filterContestArchive(contests, { searchTerm = "", popularitySort, alphaSort, dateSort }) {
  const search = searchTerm.trim().toLowerCase();
  const result = contests.filter(contest => contest.title.toLowerCase().includes(search) || contest.host.toLowerCase().includes(search));
  return result.sort((a, b) => {
    let comparison = 0;
    if (popularitySort) comparison = popularitySort === 'most' ? b.participants - a.participants : a.participants - b.participants;
    else if (alphaSort) comparison = alphaSort === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
    else if (dateSort) {
      const aTime = Date.parse(a.startTime) || 0;
      const bTime = Date.parse(b.startTime) || 0;
      comparison = dateSort === 'oldest' ? aTime - bTime : bTime - aTime;
    }
    return comparison || String(a.id).localeCompare(String(b.id));
  });
}

export function formatArchiveDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString([], {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
