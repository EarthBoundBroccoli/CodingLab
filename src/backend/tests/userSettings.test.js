import assert from 'node:assert/strict';
import test from 'node:test';
import { getUserSettings } from '../controllers/userController.js';
import { User } from '../models/User.js';
import { StudentStats } from '../models/StudentStats.js';
import { University } from '../models/University.js';
import { Contest } from '../models/Contest.js';
import { userIdentityFilter } from '../utils/userIdentity.js';

test('settings load for string auth IDs with rating and peak values', async t => {
    const id = 'auth-user-not-an-object-id';
    const user = { id, _id: '507f1f77bcf86cd799439011', name: 'Student', email: 'student@example.com' };
    t.mock.method(User, 'findOne', filter => {
        assert.deepEqual(filter, { $or: [{ id }] });
        return { populate() { return this; }, lean: async () => user };
    });
    t.mock.method(StudentStats, 'findOne', () => ({ lean: async () => ({ contestRating: 1250, maxRating: 1400 }) }));
    t.mock.method(Contest, 'exists', async () => null);
    t.mock.method(University, 'find', () => ({ sort() { return this; }, lean: async () => [] }));
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await getUserSettings({ user: { id } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.stats.contestRating, 1250);
    assert.equal(res.body.stats.maxRating, 1400);
});

test('ObjectId auth identities support both legacy and explicit ID fields', () => {
    const id = '507f1f77bcf86cd799439011';
    assert.deepEqual(userIdentityFilter(id), { $or: [{ id }, { _id: id }] });
});
