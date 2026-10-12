export function buildYearActivity(activity, year) {
    const counts = new Map(activity.map(item => [item.date, item.count]));
    const data = [];
    let total = 0;
    const end = Date.UTC(year + 1, 0, 1);
    for (let timestamp = Date.UTC(year, 0, 1); timestamp < end; timestamp += 86400000) {
        const date = new Date(timestamp).toISOString().slice(0, 10);
        const count = counts.get(date) || 0;
        const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;
        total += count;
        data.push({ date, count, level });
    }
    return { data, total };
}
