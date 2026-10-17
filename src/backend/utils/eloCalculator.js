/**
 * Contest rating calculator using expected ranks and a deflation adjustment.
 * 
 * Computes post-contest rating changes based on expected rank vs actual rank.
 */

export const INITIAL_RATING = 1000;

/**
 * Calculates win probability of player A over player B
 */
export function getWinProbability(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculates expected rank of a player with given rating against all competitors
 */
export function getExpectedRank(targetRating, allRatings, excludeIndex) {
  let expectedRank = 1;
  for (let i = 0; i < allRatings.length; i++) {
    if (i === excludeIndex) continue;
    expectedRank += getWinProbability(allRatings[i], targetRating);
  }
  return expectedRank;
}

/**
 * Binary searches performance rating that corresponds to a target seed rank
 */
export function getPerformanceRating(targetSeedRank, allRatings, excludeIndex) {
  let low = 1;
  let high = 4000;
  let bestRating = 1500;

  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    const expRank = getExpectedRank(mid, allRatings, excludeIndex);

    if (expRank < targetSeedRank) {
      high = mid;
    } else {
      low = mid;
    }
    bestRating = mid;
  }
  return Math.round(bestRating);
}

/**
 * Maps numerical rating to competitive Tier Title
 */
export function getRatingTier(rating) {
  if (rating >= 2400) return "GRANDMASTER";
  if (rating >= 2100) return "MASTER";
  if (rating >= 1900) return "CANDIDATE MASTER";
  if (rating >= 1600) return "EXPERT";
  if (rating >= 1400) return "SPECIALIST";
  if (rating >= 1200) return "APPRENTICE";
  return "NOVICE";
}

/**
 * Main ELO Rating calculation function for a contest
 */
export function calculateContestRatings(participants) {
  if (!Array.isArray(participants) || participants.length === 0) {
    return [];
  }

  if (participants.length === 1) {
    const p = participants[0];
    const oldRating = p.oldRating ?? INITIAL_RATING;
    return [{
      ...p,
      oldRating,
      newRating: oldRating,
      ratingChange: "+0",
      ratingTier: getRatingTier(oldRating)
    }];
  }

  const n = participants.length;
  const allRatings = participants.map(p => p.oldRating ?? INITIAL_RATING);
  const rawDeltas = [];

  for (let i = 0; i < n; i++) {
    const p = participants[i];
    const oldRating = p.oldRating ?? INITIAL_RATING;
    const actualRank = p.rank;

    const expectedRank = getExpectedRank(oldRating, allRatings, i);
    const targetSeedRank = Math.sqrt(actualRank * expectedRank);
    const perfRating = getPerformanceRating(targetSeedRank, allRatings, i);

    const delta = Math.round((perfRating - oldRating) / 2);
    rawDeltas.push(delta);
  }

  const sumDeltas = rawDeltas.reduce((acc, val) => acc + val, 0);
  const adjustment = Math.round(-sumDeltas / n) - 1;

  return participants.map((p, i) => {
    const oldRating = p.oldRating ?? INITIAL_RATING;
    const finalDelta = rawDeltas[i] + adjustment;
    const newRating = Math.max(1, oldRating + finalDelta);
    const appliedDelta = newRating - oldRating;
    const ratingChange = appliedDelta >= 0 ? `+${appliedDelta}` : `${appliedDelta}`;

    return {
      ...p,
      oldRating,
      newRating,
      ratingChange,
      ratingTier: getRatingTier(newRating)
    };
  });
}
