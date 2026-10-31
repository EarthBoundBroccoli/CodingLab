import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateContestRatings, getWinProbability, getExpectedRank, INITIAL_RATING } from '../utils/eloCalculator.js';
import { rankContestParticipants } from '../utils/contestStandings.js';

test('missing ratings use the same 1000 baseline as student stats', () => {
    assert.equal(INITIAL_RATING, 1000);
    assert.equal(calculateContestRatings([{ rank: 1 }])[0].oldRating, 1000);
    assert.deepEqual(calculateContestRatings([{ rank: 1 }, { rank: 2 }]).map(p => p.oldRating), [1000, 1000]);
});

test('zero is an existing rating, not a missing rating', () => {
    assert.equal(calculateContestRatings([{ rank: 1, oldRating: 0 }])[0].oldRating, 0);
    assert.equal(calculateContestRatings([{ rank: 1, oldRating: 0 }, { rank: 2, oldRating: 1000 }])[0].oldRating, 0);
});

test('recorded rating change equals the applied change at the rating floor', () => {
    const results = calculateContestRatings(Array.from({ length: 10 }, (_, index) => ({ rank: index + 1, oldRating: 1 })));
    assert.ok(results.some(p => p.newRating === 1));
    for (const result of results) {
        assert.equal(Number(result.ratingChange), result.newRating - result.oldRating);
        assert.ok(result.newRating >= 1);
    }
});

test('equal-rated winner gains and loser loses; probabilities are symmetric', () => {
    const [winner, loser] = calculateContestRatings([{ rank: 1, oldRating: 1000 }, { rank: 2, oldRating: 1000 }]);
    assert.ok(winner.newRating > 1000);
    assert.ok(loser.newRating < 1000);
    assert.equal(getWinProbability(1000, 1000), 0.5);
    assert.ok(Math.abs(getWinProbability(1400, 1000) + getWinProbability(1000, 1400) - 1) < 1e-12);
    assert.equal(getExpectedRank(1000, [1000, 1000, 1000], 0), 2);
});

test('standings rank score first, penalty second, and share ranks for ties', () => {
    const source = [{ userId: 'd', score: 0, penalty: 0 }, { userId: 'b', score: 100, penalty: 20 },
        { userId: 'c', score: 100, penalty: 30 }, { userId: 'a', score: 100, penalty: 20 }];
    const result = rankContestParticipants(source);
    assert.deepEqual(result.map(p => [p.userId, p.rank]), [['a', 1], ['b', 1], ['c', 3], ['d', 4]]);
    assert.equal(source[0].userId, 'd');
    const rated = calculateContestRatings(result.map(p => ({ ...p, oldRating: 1000 })));
    assert.equal(rated[0].newRating, rated[1].newRating);
});
