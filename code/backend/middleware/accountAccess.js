import { auth } from '../lib/auth.js';
import { checkSessionAccount } from '../utils/accountAccess.js';

// Check the current database state even when the browser already has a session.
export const enforceAccountAccess = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (session && !await checkSessionAccount(session)) {
            return res.status(403).json({ message: 'This account is unavailable. Please contact support.' });
        }
        return next();
    } catch (error) {
        console.error('Account access check failed:', error);
        return res.status(500).json({ message: 'Could not verify account access.' });
    }
};
