import { StudentStats } from '../models/StudentStats.js';

export const withSubmissionTransaction = async callback => {
    // MongoDB retries write conflicts. Two first submissions can also race to
    // create the user's unique stats record, which needs a fresh transaction.
    for (let attempt = 0; ; attempt++) {
        try {
            return await StudentStats.db.transaction(callback);
        } catch (error) {
            if (attempt >= 2 || error.code !== 11000 || !error.keyPattern?.userId) throw error;
        }
    }
};
