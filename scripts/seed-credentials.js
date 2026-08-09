const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Define User Schema (Simplified for script)
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    username: { type: String, unique: true },
    password: { type: String, select: false },
    role: String,
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    isActive: Boolean
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Define Branch Schema (Updated to match actual model)
const BranchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    branchCode: { type: String, required: true, unique: true },
    state: { type: String, required: true },
    isActive: { type: Boolean, default: true }
});
const Branch = mongoose.models.Branch || mongoose.model('Branch', BranchSchema);

const credentials = [
    { u: 'mumbai-borivali', p: 'savan3456', branch: 'Mumbai Borivali', state: 'Maharashtra' },
    { u: 'amdavad-ctm', p: 'savan6734', branch: 'Amdavad CTM', state: 'Gujarat' },
    { u: 'mumbai-andheri', p: 'savan4598', branch: 'Mumbai Andheri', state: 'Maharashtra' },
    { u: 'setelite', p: '444245', branch: 'Setelite', state: 'Gujarat' },
    { u: 'mumbai-vasai', p: 'savan2356', branch: 'Mumbai Vasai', state: 'Maharashtra' },
    { u: 'udhana', p: '1234', branch: 'Udhana', state: 'Gujarat' },
    { u: 'bapunagar', p: '888942', branch: 'Bapunagar', state: 'Gujarat' },
    { u: 'hirabagh', p: 'savan8980', branch: 'Hirabagh', state: 'Gujarat' },
    { u: 'rajkot-punitnagar', p: '1234', branch: 'Rajkot Punitnagar', state: 'Gujarat' },
    { u: 'sahara', p: '1234', branch: 'Sahara', state: 'Gujarat' },
    { u: 'paldi', p: '994142', branch: 'Paldi', state: 'Gujarat' },
    { u: 'rajkot-limdachok', p: '1234', branch: 'Rajkot Limdachok', state: 'Gujarat' },
    { u: 'katargam', p: 'savan4567', branch: 'Katargam', state: 'Gujarat' },
    { u: 'sachin', p: '1234', branch: 'Sachin', state: 'Gujarat' },
    { u: 'savan', p: '95008', branch: 'Main Branch', role: 'SUPER_ADMIN', state: 'Gujarat' }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const cred of credentials) {
            // 1. Ensure Branch Exists
            let branch = await Branch.findOne({ name: cred.branch });
            if (!branch) {
                const code = cred.u.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000);
                // Ensure code unique
                let existingCode = await Branch.findOne({ branchCode: code });
                let finalCode = existingCode ? code + 'X' : code;

                branch = await Branch.create({
                    name: cred.branch,
                    branchCode: finalCode,
                    state: cred.state || 'Gujarat',
                    isActive: true
                });
                console.log(`Created Branch: ${cred.branch} (${finalCode})`);
            } else {
                console.log(`Branch exists: ${cred.branch}`);
            }

            // 2. Create/Update User
            const hashedPassword = await bcrypt.hash(cred.p, 10);

            const userData = {
                name: cred.branch + ' Admin',
                email: `${cred.u}@abcd.com`, // Fake email
                username: cred.u,
                password: hashedPassword,
                role: cred.role || 'ADMIN',
                branch: branch._id,
                isActive: true
            };

            await User.findOneAndUpdate(
                { username: cred.u },
                userData,
                { upsert: true, new: true }
            );
            console.log(`Seeded User: ${cred.u}`);
        }

        console.log('Seeding Complete!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding Failed:', error);
        process.exit(1);
    }
}

seed();
