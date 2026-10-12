export function selectFeaturedContests(contests, now = new Date()) {
  return contests.filter(contest => contest._id
    && ['Upcoming', 'Ongoing'].includes(contest.status)
    && new Date(contest.endTime).getTime() > now.getTime())
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Ongoing' ? -1 : 1;
      const field = a.status === 'Ongoing' ? 'endTime' : 'startTime';
      return (Date.parse(a[field]) || 0) - (Date.parse(b[field]) || 0)
        || String(a._id).localeCompare(String(b._id));
    }).slice(0, 3);
}
