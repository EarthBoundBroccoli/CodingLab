// Competition ranks (1, 1, 3) must agree between the table and rating calculation.
export const rankContestParticipants = participants => {
    const sorted = participants.map(p => p.toObject ? p.toObject() : { ...p })
        .sort((a, b) => b.score - a.score || a.penalty - b.penalty ||
            String(a.userId?._id || a.userId?.id || a.userId).localeCompare(String(b.userId?._id || b.userId?.id || b.userId)));
    let rank = 0;
    return sorted.map((participant, index) => {
        if (!index || participant.score !== sorted[index - 1].score || participant.penalty !== sorted[index - 1].penalty) rank = index + 1;
        return { ...participant, rank };
    });
};
