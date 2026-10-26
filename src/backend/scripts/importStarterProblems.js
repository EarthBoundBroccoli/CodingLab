import dns from 'node:dns/promises';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { Problem } from '../models/Problem.js';
import { User } from '../models/User.js';
import { starterProblems } from '../data/starterProblems.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
// Match the backend's existing DNS configuration.
dns.setServers(['1.1.1.1']);
const apply = process.argv.includes('--apply');
try {
    for (const problem of starterProblems) {
        await new Problem({ ...problem, setterId: 'validation-only', status: 'approved' }).validate();
    }
    if (!apply) {
        console.log('Validated four problem definitions. Run with --apply to insert missing entries.');
    } else {
        if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured.');
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
        const owner = await User.findOne({ role: 'admin', banned: { $ne: true }, disabledAt: null }).sort({ _id: 1 });
        if (!owner) throw new Error('An active administrator is required to own the library entries.');
        for (const problem of starterProblems) {
            const existing = await Problem.findOne({ title: problem.title });
            if (existing) {
                console.log(`Kept existing problem: ${problem.title}`);
                continue;
            }
            const saved = await Problem.create({ ...problem, setterId: String(owner.id || owner._id), status: 'approved' });
            console.log(`Added ${problem.title}: ${saved._id}`);
        }
    }
} catch (error) {
    // Never log connection strings or credentials on connection failures.
    console.error(`Problem import failed (${error.name}; ${error.code || 'no-code'}). No existing problems were modified.`);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
