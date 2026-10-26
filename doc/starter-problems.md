# Source-based starter problems

Four new entries use original descriptions, examples, and hidden tests based on these established tasks:

| CodingLab title | Original source | Adaptation |
| --- | --- | --- |
| Odd Even Multiplier (Product) | [AtCoder ABC086 A](https://atcoder.jp/contests/abc086/tasks/abc086_a) | Standard input/output; same parity task |
| Two Sum (Unique Pair) | [LeetCode 1](https://leetcode.com/problems/two-sum/) | Complete program, not a Solution class; zero-based indices printed in increasing order |
| Missing Number (1 to N) | [CSES Missing Number](https://cses.fi/problemset/task/1083) | Standard input/output; use 64-bit arithmetic for a sum-based solution |
| Longest Repetition (DNA) | [CSES Repetitions](https://cses.fi/problemset/task/1069) | Maximum length reduced to 100000 |

Source references are kept in this document rather than the displayed problem statements. All entries have explicit constraints, sample explanations, 2000 ms time limit, and 256 MB memory limit. Write a program for a single input instance; there is no leading test-case count. The judge supplies separate hidden instances through its existing batch wrapper.

Two Sum guarantees exactly one pair and specifies ascending index order because the current judge compares output text rather than accepting arbitrary valid pairs. Hidden tests include duplicate values, negatives, zero, large values, and a 10000-element array. Other tests cover parity combinations, missing endpoints, integer-overflow-sized sums, and long repeated strings. Tests and examples are authored for CodingLab, not downloaded private tests from the source sites.

From the repository root:

```sh
node src/backend/scripts/importStarterProblems.js
node src/backend/scripts/importStarterProblems.js --apply
```

The first command validates definitions without database access. The second uses `src/backend/.env`, inserts approved entries under an existing active administrator, and skips matching titles on reruns. Run one importer at a time. It does not replace old Odd Even Multiplier/Two Sum records, change contests, delete users, or reset ratings. Do not use the old destructive `seed.js` for this import.

Definitions: `src/backend/data/starterProblems.js`. Regression checks: `src/backend/tests/starterProblems.test.js` (requires Python to exercise the actual judging wrapper). This verifies local execution, not live JDoodle service behavior.
