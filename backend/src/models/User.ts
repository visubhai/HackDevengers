import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
    },
    username: {
        type: String,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        select: false, // Don't return by default
    },
    role: {
        type: String,
        enum: ['SUPER_ADMIN', 'BRANCH'],
        default: 'BRANCH',
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: function (this: any) { return this.role === 'BRANCH'; }
    },
    branch: { // Keep for backward compatibility/populated data if needed
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    allowedBranches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
    }],
    allowedReports: [{
        type: String,
        enum: ["DAILY_REPORT", "DELIVERY_REPORT", "LEDGER_REPORT", "SUMMARY_REPORT", "BOOKING_REPORT"]
    }],
    passwordChangedAt: {
        type: Date
    },
    isTwoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        select: false
    },
    refreshTokens: [{
        type: String,
        select: false // Keep hidden from general queries
    }]
}, { timestamps: true });

UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ role: 1, branchId: 1 });
UserSchema.index({ branchId: 1 });

// Prevent recompilation of model in development
export default mongoose.models.User || mongoose.model('User', UserSchema);
