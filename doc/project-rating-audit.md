# Project and rating audit — 2026-10-17

This review found and fixed bugs. Passing these checks does not establish that the entire application is bug-free.

## Fixed

- **Settings request failed:** `getUserSettings` returned undefined `rating` and `maxRating` variables. It now uses the same rating lookup as profiles and leaderboards.
- **Inconsistent starting rating:** the calculator, first-contest path, and student-stats schema used different defaults. The shared default is now 1000; existing ratings are preserved.
- **Incorrect rating delta at the floor:** the displayed/history delta could exceed the actual loss after the rating was clamped. The stored delta now equals `newRating - oldRating`.
- **Out-of-order contest processing:** a later contest could consume ratings before an earlier round had been processed. Pending elapsed rounds are processed by end time and ID before the requested round, retaining transactional, idempotent writes.
- **Stale leaderboards:** leaderboard reads now finalize pending elapsed contests before computing ranks. Ending a round manually also processes its ratings.
- **Inconsistent tied ranks:** contest tables used row indexes while ratings used shared ranks. Both now use competition ranks such as 1, 1, 3, ordered by score and then penalty.
- **Auth ID mismatches:** string auth IDs could cause ObjectId cast failures, missing participant names, duplicate stats, or unrecognized registration. Lookups now handle both identity formats and reuse the selected existing stats record. The rating path also accounts for Mongoose's `id` virtual masking a stored auth ID.
- **Finalized-result integrity:** editing/reopening or deleting a rated contest could invalidate ratings and leaderboard eligibility. These operations are now rejected. Repeated end requests preserve the original finish time; admin controls show that finalized contests are unavailable for edit/delete.
- **Test entry points:** both packages now expose `npm test`.

## Verified

- Backend: **239 tests passed**, zero failures or skips, including Python, C++, and Java wrapper checks.
- Frontend: **28 tests passed**, zero failures or skips.
- Production frontend build passed. Vite still reports a large JavaScript bundle (approximately 1.03 MB before gzip); this is a performance warning.
- Static scan across 94 application source files found no undefined variables, unreachable statements, duplicate object keys, or invalid `typeof` comparisons after the fixes.
- Regression coverage includes baseline ratings, the minimum rating, score/penalty ties, string auth IDs, Settings loading, sequential and concurrent rating requests, transaction rollback, earlier-round processing, and finalized-contest protection.
- Existing leaderboard tests cover tied ranks across pagination, top-ten university totals, exclusion of unrated/inactive accounts, and profile/campus rank consistency.

## Limits and existing policy

- No live database records were read, recalculated, or migrated during this review. Previously finalized incorrect ratings are not automatically rewritten by these code changes.
- Persistence tests use real Mongoose documents with a simulated transactional database. A live MongoDB transaction/aggregation integration test remains unverified; the transaction-based application requires a suitable MongoDB deployment.
- External OAuth providers and live judging-service requests were not exercised.
- The rating formula is a custom expected-rank/Elo-style formula with a deflation adjustment, not a complete implementation of Elo-MMR or the official Codeforces algorithm.
- Existing policy rates every registered participant, including zero-score registrations; a one-person contest leaves the rating unchanged. This review did not redefine who qualifies to participate in a rated contest.
- Legacy rating-history entries without contest IDs are still matched by contest name for recovery. Repeated historical names can be ambiguous and need a data-specific migration if present.
