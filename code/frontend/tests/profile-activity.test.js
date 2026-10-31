import test from 'node:test';
import assert from 'node:assert/strict';
import { buildYearActivity, getActivityYears } from '../src/lib/profile-activity.js';

test('activity years start at signup and include inactive years', () => {
    assert.deepEqual(getActivityYears('2026-05-10T00:00:00Z', 2026), [2026]);
    assert.deepEqual(getActivityYears('2023-05-10T00:00:00Z', 2026), [2026, 2025, 2024, 2023]);
    assert.deepEqual(getActivityYears(null, 2026), [2026]);
    assert.deepEqual(getActivityYears('invalid', 2026), [2026]);
});

test('calendar preserves alignment but excludes dates before signup', () => {
    const result = buildYearActivity([
        { date: '2024-02-28', count: 5 },
        { date: '2024-02-29', count: 2 },
    ], 2024, '2024-02-29T18:00:00Z');
    assert.equal(result.data.length, 366);
    assert.equal(result.data[58], null);
    assert.deepEqual(result.data[59], { date: '2024-02-29', count: 2, level: 2 });
    assert.equal(result.total, 2);
});
