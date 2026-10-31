import mongoose from 'mongoose';

// Mongoose's default `id` virtual can mask an auth ID stored on a legacy document.
export const getUserAuthId = user => {
    const data = user.toObject ? user.toObject({ virtuals: false }) : user;
    return String(data.id || data._id);
};

export const userIdentityFilter = id => {
    const identities = [{ id: String(id) }];
    if (mongoose.isObjectIdOrHexString(id)) identities.push({ _id: id });
    return { $or: identities };
};
