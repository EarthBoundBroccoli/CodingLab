# CodingLab: contest scoring, Elo-style ratings, and leaderboards

Implementation guide and interview preparation. Checked against the current source on 2026-10-26.

## 1. Start with the distinction between score, points, rating, and rank

| Value | Meaning | How it changes | Used to order |
| --- | --- | --- | --- |
| Contest score | Performance within one contest | +100 for each distinct problem first accepted in that contest | That contest's standings |
| Contest penalty | Time-based tie-breaker | Elapsed minutes for each first accepted solve, plus 20 per non-accepted attempt on an unsolved contest problem | Equal-score contestants |
| Practice points | Accumulated problem-solving rewards | First global solve: Easy +10, Medium +30, Hard +50 | Not the rating leaderboards described here |
| Contest rating | Competitive performance across contests | Expected-rank calculation after a contest ends | Campus student leaderboard |
| Rank | Position within a particular ordered list | Derived from the scores or ratings in that list | Displayed as 1, 2, 3, etc. |

**A 100-point contest solve does not mean +100 Elo.** It improves contest standings; the final standing then influences rating. Practice points do not enter the rating formula either.

The rating starts at **1000**. A new user's default rating alone does not qualify them for the rated leaderboard.

## 2. End-to-end contest workflow

1. An administrator creates a contest with a start time, end time, and approved problems. Invalid schedules and invalid/duplicate problem selections are rejected.
2. Students register while the contest is upcoming or ongoing. Registration initializes score and penalty to zero and the solved list to empty. The update guards against duplicate and late registration.
3. The server checks the schedule when contest endpoints are accessed. Problems are hidden in the upcoming contest response. During the contest, registered students can submit solutions for its approved problems.
4. The backend sends code for execution through JDoodle and evaluates its response, including output and resource limits. The browser does not supply an authoritative score or verdict.
5. The backend saves submission history, student statistics, and contest scoring inside a database transaction.
6. Contest standings are derived from score and penalty. The contest detail frontend polls details and standings every 10 seconds while upcoming/ongoing; this is polling, not a WebSocket feed.
7. Once the contest has ended, finalization calculates ratings and records the results. Later campus/university leaderboard reads use the updated ratings.

Finalization is **request-triggered**, not an independent timer job: contest status reads, explicit ending/rating actions, and leaderboard refresh logic can initiate it. If nobody makes a relevant request, a finished contest may remain unprocessed until one arrives.

## 3. Exact contest scoring rules

For a problem not yet solved by the participant in this contest:

```text
Accepted:
    score += 100
    penalty += round((time_of_save - contest_start_time) / 60,000)
    add problem to contest solved list

Non-accepted judged result:
    penalty += 20
```

The solve time is elapsed time since contest start, not code CPU time. It is rounded to the nearest minute and calculated when saving the accepted result, so judging delay can contribute.

Resubmitting an already-solved contest problem does not award more contest score or penalty. Submission history is still recorded. A problem solved previously in practice can still earn contest score when solved in a new contest, but it does not earn first-solve practice points again.

The +20 rule applies to results reaching the non-accepted scoring branch; validation failures or execution-service failures that exit before persistence do not automatically receive a penalty.

**Important distinction from classic ICPC scoring:** CodingLab applies failed-attempt penalties immediately, even if that problem is never solved. It does not wait for an eventual accepted submission.

### Example standings

| Student | Accepted problems | Accepted elapsed times | Failed attempts before solving | Score | Penalty | Rank |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| A | 2 | 10 and 25 minutes | 0 | 200 | 35 | 1 |
| B | 2 | 15 and 30 minutes | 1 | 200 | 65 | 2 |
| C | 1 | 12 minutes | 0 | 100 | 12 | 3 |
| D | 0 | None | 0 | 0 | 0 | 4 |

A beats B on penalty. C still beats D because score is compared first.

Sorting uses score descending, then penalty ascending. Identical scores and penalties share a **competition rank**, such as `1, 1, 3`. User IDs provide stable row ordering within a tie, without breaking the shared rank.

## 4. The actual rating algorithm

Call this an **Elo-style multiplayer expected-rank algorithm** in an interview. It uses Elo's logistic probability formula, but it is not the conventional two-player `K × (actual - expected)` update and should not be described as an exact copy of another platform's rating system.

Let `R_i` be participant i's old rating and `r_i` their actual contest rank.

### Step A: Calculate pairwise win probabilities

```text
P(i beats j) = 1 / (1 + 10^((R_j - R_i) / 400))
```

Equal ratings imply 50% probability. A player 400 rating points stronger has about a 90.9% probability under this model. This is a mathematical expectation, not a promise about results.

### Step B: Calculate expected rank

```text
expectedRank_i = 1 + sum(P(j beats i)) for every opponent j
```

The participant is excluded from their own opponent list. For four equally rated competitors, expected rank is `1 + 3 × 0.5 = 2.5` for everyone.

### Step C: Blend actual and expected rank

```text
targetRank_i = sqrt(actualRank_i × expectedRank_i)
```

This geometric mean produces a target between expected and actual performance. A smaller rank number is a better position.

### Step D: Find a performance rating

The calculator binary-searches a hypothetical rating between **1 and 4000**, for **40 iterations**, whose expected rank against the same opponents matches the target rank. It rounds the resulting rating to an integer.

This performance rating is an intermediate calculation, not the final rating displayed on the profile.

### Step E: Move halfway toward performance

```text
rawDelta_i = Math.round((performanceRating_i - oldRating_i) / 2)
```

The division by two dampens the update. Opponent strength and final position matter; there is no fixed Elo reward per solved problem.

### Step F: Apply the contest-wide adjustment

```text
adjustment = Math.round(-sum(rawDeltas) / participantCount) - 1
finalDelta_i = rawDelta_i + adjustment
newRating_i = max(1, oldRating_i + finalDelta_i)
recordedChange_i = newRating_i - oldRating_i
```

Every participant receives the same adjustment. This approximately offsets aggregate raw gains and adds a small downward bias. It is **not exactly zero-sum**, because of that bias, rounding, and the rating floor.

The saved change uses the actual applied difference after the floor. This prevents a displayed decrease larger than the rating actually lost. The 4000 search bound is not an explicit 4000 cap on final ratings.

### Verified numerical example

Using A/B/C/D's ranks above, all starting at 1000:

| Student | Rank | Expected rank | Target rank (approx.) | Performance rating | Raw delta | Adjustment | Saved change | New rating |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A | 1 | 2.5 | 1.5811 | 1248 | +124 | -12 | +112 | 1112 |
| B | 2 | 2.5 | 2.2361 | 1062 | +31 | -12 | +19 | 1019 |
| C | 3 | 2.5 | 2.7386 | 944 | -28 | -12 | -40 | 960 |
| D | 4 | 2.5 | 3.1623 | 835 | -82 | -12 | -94 | 906 |

Raw deltas sum to 45. `Math.round(-45 / 4) - 1 = -12`. JavaScript rounds `-82.5` to `-82`, which matters when reproducing D's result.

These numbers were generated using the current `calculateContestRatings` implementation, rather than estimated manually.

### Special cases and tiers

- No participants: calculator returns an empty list; the manual rating endpoint rejects an empty contest.
- One participant: rating stays unchanged (`+0`).
- Missing rating: calculator uses 1000. An explicit zero is treated as an existing rating rather than a missing value.
- Same rating and same rank: same rating change.
- All four equal-rated players tied first: the current formula gives each **-1**, because of the contest-wide adjustment.
- All registered participants enter rating calculation, including users who never submitted.

| Rating | Tier |
| --- | --- |
| Below 1200 | NOVICE |
| 1200–1399 | APPRENTICE |
| 1400–1599 | SPECIALIST |
| 1600–1899 | EXPERT |
| 1900–2099 | CANDIDATE MASTER |
| 2100–2399 | MASTER |
| 2400+ | GRANDMASTER |

Tier is derived from rating; it is not a leaderboard position.

## 5. How finalization stores ratings safely

`processRatingsForContest` processes pending ended contests in ascending end-time order, using ID as a deterministic secondary order. This is intended to make later rounds consume ratings updated by earlier rounds.

For each contest, a MongoDB transaction:

1. Claims the ended contest using a conditional update requiring `ratingsCalculated != true`.
2. Ranks participants and reads their user/stat records inside the session.
3. Resolves both Better Auth string IDs and legacy MongoDB IDs.
4. Calculates rating changes from the saved previous ratings.
5. Updates `StudentStats.contestRating`, tier, peak rating, and rating history; updates `User.rating` when the user exists.
6. Copies old/new ratings and change into the contest participant results.
7. Saves `ratingsCalculatedAt` and commits the transaction.

If a write fails, the transaction rolls back the claim and related changes. Another request cannot legitimately finalize the same contest twice: it either competes with the transaction and retries, or reads the already-finalized result.

Existing history is checked to recover previously applied results without applying another rating change. New history identifies the contest by ID; legacy entries without an ID fall back to the contest name. That fallback is a compatibility measure and is ambiguous if old contests share names.

Finalized rated contests cannot be edited or deleted through the normal admin paths. The manual calculate-ratings endpoint returns saved results if already calculated; it is not a destructive recalculation feature.

Submission writes also use transactions. They reread contest state before saving, check the end time and registration again, and prevent concurrent submissions from overwriting scores. JDoodle execution happens outside the transaction callback, so transaction retries do not execute the code again. A submission whose execution finishes after the contest deadline may be rejected when saving.

These guarantees require a MongoDB deployment supporting transactions, such as a replica set or suitable Atlas deployment. Mocked tests do not prove production transaction configuration.

## 6. How the leaderboards connect to contests

### Contest leaderboard

One contest's registered participants, ordered by score and penalty. This answers: **Who performed best in this round?**

### Campus leaderboard

Eligible users at one university, ordered by `StudentStats.contestRating` descending. Eligibility requires:

- Role `student` or `problem_setter`.
- Not banned and not disabled.
- An ended, finalized contest containing a numeric `newRating` for that user.
- A numeric stored contest rating.

The default 1000 rating or a standalone history entry is insufficient. A user with one finalized solo contest can qualify even though their rating did not change. Since no-shows are currently rated, registration without submission can also eventually qualify.

Equal ratings share rank: `1500, 1500, 1400` gives `1, 1, 3`. ID ordering only stabilizes tied rows. Personal campus rank is `1 + count(eligible campus users with a strictly higher rating)`.

### Global university leaderboard

This is a ranking of **universities**, not a global list of individual students.

```text
universityTotalRating = sum(current ratings of its top 10 eligible users)
```

If a university has fewer than ten eligible users, all of them count. Users below its top ten do not increase this total. Universities with no qualifying users do not enter this aggregation.

Example: a university with three eligible ratings of 1500, 1400, and 1200 has total rating **4100**. A university with 11 eligible users sums only its highest ten. Equal totals share rank.

The top-ten rule bounds the benefit of a very large campus, but a campus with ten rated users still has an advantage over one with only a few; this is a design tradeoff, not complete population normalization.

### Pagination and refresh

The code ranks the complete eligible result set before slicing pages, so ranks do not restart on page two. Limits are validated (1–100), and pages beyond the end clamp to the last available page. Defaults are 10 universities and 20 campus users per page.

Leaderboard requests first refresh pending contest ratings. This improves freshness, but can make a read request expensive when finalization is pending.

## 7. Source and API map

Paths below are relative to this document.

| Responsibility | Source |
| --- | --- |
| Contest lifecycle, judging, scoring, registration | [contestController.js](../src/backend/controllers/contestController.js) |
| Score/penalty ranking | [contestStandings.js](../src/backend/utils/contestStandings.js) |
| Rating mathematics and tier thresholds | [eloCalculator.js](../src/backend/utils/eloCalculator.js) |
| Rating finalization and persistence | [contestRatings.js](../src/backend/utils/contestRatings.js) |
| Submission transaction wrapper | [submissionPersistence.js](../src/backend/utils/submissionPersistence.js) |
| Eligibility, aggregation, ties, pagination | [leaderboard.js](../src/backend/utils/leaderboard.js) |
| Leaderboard response handlers | [leaderboardController.js](../src/backend/controllers/leaderboardController.js) |
| Contest result storage | [Contest.js](../src/backend/models/Contest.js) |
| Rating, history, and practice-point storage | [StudentStats.js](../src/backend/models/StudentStats.js) |

| Endpoint | Purpose |
| --- | --- |
| `POST /api/contests/:id/register` | Register a student |
| `POST /api/contests/:id/submit` | Judge and persist a contest submission |
| `GET /api/contests/:id/leaderboard` | Fetch contest standings |
| `POST /api/contests/:id/calculate-ratings` | Admin/setter request to finalize ended-contest ratings |
| `GET /api/leaderboard/university/:universityId` | Fetch campus rating leaderboard |
| `GET /api/leaderboard/universities` | Fetch global university leaderboard |
| `GET /api/leaderboard/me` | Fetch personal rating, peak, rated status, and relevant ranks |

## 8. Interview explanation and discussion plan

### A 60–90 second explanation

> I separated contest score, practice points, and competitive rating. During a contest, each distinct accepted problem gives 100 points. Standings sort by score first and penalty second, with shared ranks for ties. After the contest ends, I use an Elo-style multiplayer algorithm: existing ratings predict an expected rank, which I combine with the actual rank. A binary search finds the corresponding performance rating, and I apply a damped change plus a contest-wide adjustment. I save those changes and their history in a MongoDB transaction, with a conditional finalization flag to prevent double updates. Campus leaderboards then sort eligible rated users by their current ratings, while the university leaderboard sums each university's top ten. Practice points remain separate from competitive rankings.

### Explain it in this order on a whiteboard

1. Draw `submission → verdict → score/penalty → contest rank`.
2. Draw `old ratings + contest ranks → expected-rank calculator → new ratings`.
3. Draw `new ratings → campus ranking → top-ten university total`.
4. Show the four-player numerical example.
5. Explain transaction rollback, duplicate-finalization prevention, and shared-rank handling.
6. Finish with tested behavior and the limitations below.

### Likely interviewer questions

**Why not add a fixed rating reward per problem?**
That would mostly reward volume. This model evaluates performance relative to opponent strength and expectations. Practice points already provide a separate fixed reward for solving problems.

**Does winning always increase rating?**
Do not promise that universally. The update depends on expectations, bounds, rounding, and the contest-wide adjustment. A solo contest produces no change; an all-equal tie produces -1 each in the verified example.

**How do you prevent a refresh from giving Elo twice?**
A conditional claim and all rating writes share a transaction. The finalized flag and saved history make subsequent requests return the existing result.

**Why transactions rather than several ordinary saves?**
Without them, a failed write could leave a contest finalized while some users never received their ratings, or save a submission without its score/stat updates.

**What is the computational cost?**
For n participants, expected-rank evaluation scans opponents. Each participant performs 40 such evaluations during binary search, plus its initial expected-rank calculation. Rating calculation is therefore O(n²) with a fixed iteration factor; contest sorting is O(n log n). The implementation also materializes leaderboard results before pagination, so large-scale optimization remains future work.

**What would you improve next?**
Move finalization into an observable background job; define an explicit no-show policy; benchmark and optimize large-contest calculations; add real MongoDB integration/concurrency tests; and decide whether all-tied rounds should remain neutral instead of receiving the current deflation adjustment.

## 9. Verification and honest boundaries

On 2026-10-26, the backend suite passed **239 tests, zero failures, zero skips**. Coverage includes rating defaults, applied deltas at the rating floor, equal-rating outcomes, shared ranks, leaderboard eligibility, registration, finalization persistence, authorization, and submission rollback/concurrency scenarios. The numerical example in this guide was separately executed against the calculator.

This supports correctness for the tested scenarios, not a proof of every live workflow. Live JDoodle calls and production MongoDB transactions were not exercised by this documentation task.

Current design choices to acknowledge:

- Registered users with no submissions are rated.
- Non-accepted attempts add penalty even if the problem is never solved.
- Equal-score/penalty ties use competition ranks, not averaged ranks.
- Finalization is request-triggered; there is no guaranteed immediate timer-based update.
- The shared adjustment is intentionally not zero-sum and can reduce everyone in an equal tie.
- Practice-point logic explicitly handles Easy, Medium, and Hard. A legacy `Normal` label may display like Medium in the UI but does not receive Medium's practice-point reward in the contest handler.
- Production scalability and live database concurrency need further integration testing and measurement.

No application behavior was changed while preparing this document.
