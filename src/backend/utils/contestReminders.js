import { Contest } from '../models/Contest.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { getUserAuthId } from './userIdentity.js';

export async function sendContestReminders(now = new Date()) {
    const contests = await Contest.find({
        startTime: { $gt: now, $lte: new Date(now.getTime() + 10 * 60 * 1000) },
        status: { $ne: 'Ended' },
        $expr: { $ne: ['$reminderSentFor', '$startTime'] }
    });
    for (const contest of contests) {
        await Contest.db.transaction(async session => {
            // Claim and delivery commit together; retries and other servers cannot duplicate delivery.
            const claim = await Contest.updateOne({
                _id: contest._id,
                startTime: contest.startTime,
                status: { $ne: 'Ended' },
                reminderSentFor: { $ne: contest.startTime }
            }, { $set: { reminderSentFor: contest.startTime } }, { session });
            if (!claim.modifiedCount) return;
            const users = await User.find({ banned: { $ne: true }, disabledAt: null }).session(session);
            const recipients = [...new Set(users.map(getUserAuthId).filter(Boolean))];
            if (recipients.length) await Notification.insertMany(recipients.map(userId => ({
                userId,
                title: 'Contest starts soon',
                message: `"${contest.name}" starts in ${Math.max(1, Math.ceil((contest.startTime - now) / 60000))} minutes. Get ready!`,
                type: 'contest',
                contestId: contest._id,
                isRead: false
            })), { session });
        });
    }
}

export function startContestReminders() {
    let running = false;
    const tick = async () => {
        if (running) return;
        running = true;
        try { await sendContestReminders(); }
        catch (error) { console.error('Contest reminder delivery failed:', error.message); }
        finally { running = false; }
    };
    void tick();
    const timer = setInterval(tick, 15000);
    timer.unref();
    return () => clearInterval(timer);
}
