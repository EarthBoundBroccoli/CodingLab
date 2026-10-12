const parseDate = value => {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
    if (typeof value !== 'string') return null;
    const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/);
    if (!parts) return null;
    const [, year, month, day, hour, minute, second = '0'] = parts.map((part, index) => index ? Number(part) : part);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || day < 1 || day > days[month - 1]
        || hour > 23 || minute > 59 || second > 59) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
};

export const validateContestSchedule = (startTime, endTime) => {
    const start = parseDate(startTime);
    const end = parseDate(endTime);
    if (!start || !end) return { error: 'startTime and endTime must be valid date and time values.' };
    if (end <= start) return { error: 'endTime must be after startTime' };
    return { start, end };
};
