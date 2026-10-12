import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { APIError } from 'better-auth/api';

export const userIdentityFilter = id => ({ $or: [
    { id }, ...(mongoose.isObjectIdOrHexString(id) ? [{ _id: id }] : [])
] });

export const accountBlocked = user => !!(user?.banned || user?.disabledAt);

export async function checkSessionAccount(session) {
    const id = session?.user?.id;
    if (!id) return null;
    const user = await User.findOne(userIdentityFilter(id));
    return user && !accountBlocked(user) ? user : null;
}

export async function beforeSessionCreate(session) {
    const user = await User.findOne(userIdentityFilter(session.userId));
    if (!user || accountBlocked(user)) {
        throw new APIError('FORBIDDEN', { message: 'This account is unavailable. Please contact support.' });
    }
    return { data: session };
}
