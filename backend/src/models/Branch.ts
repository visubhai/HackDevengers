import mongoose, { Document, Schema } from 'mongoose';

export interface IBranch extends Document {
    name: string;
    branchCode: string;
    state: string;
    address?: string;
    phone?: string;
    isActive: boolean;
    whatsappNotificationsEnabled?: boolean;
    isSuperAdmin?: boolean; // Keep this for backend logic even if hidden in UI
    allowedDestinations: mongoose.Types.ObjectId[];
    allowedPaymentTypes: string[];
}

const BranchSchema = new Schema<IBranch>({
    name: {
        type: String,
        required: [true, 'Please provide a branch name'],
        trim: true,
        maxlength: 100
    },
    branchCode: {
        type: String,
        required: [true, 'Please provide a branch code'],
        unique: true,
        trim: true,
        uppercase: true,
        maxlength: 20
    },
    state: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        trim: true,
        maxlength: 500
    },
    phone: {
        type: String,
        trim: true,
        maxlength: 20
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    whatsappNotificationsEnabled: {
        type: Boolean,
        default: true,
    },
    isSuperAdmin: {
        type: Boolean,
        default: false,
    },
    allowedDestinations: [{
        type: Schema.Types.ObjectId,
        ref: 'Branch'
    }],
    allowedPaymentTypes: {
        type: [String],
        enum: ['Paid', 'To Pay'],
        default: ['Paid', 'To Pay'],
    }
}, { timestamps: true });

BranchSchema.index({ isActive: 1, name: 1 });
BranchSchema.index({ branchCode: 1 });

// Safe re-registration for HMR
if (mongoose.models.Branch) {
    delete mongoose.models.Branch;
}

export default mongoose.model<IBranch>('Branch', BranchSchema);
