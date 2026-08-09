import mongoose, { Schema, Document } from 'mongoose';
import mongooseFieldEncryption from 'mongoose-field-encryption';
import crypto from 'crypto';
const fieldEncryption = mongooseFieldEncryption.fieldEncryption;

export interface IBooking extends Document {
    lrNumber: string;
    fromBranch: mongoose.Types.ObjectId;
    toBranch: mongoose.Types.ObjectId;
    senderBranchId: mongoose.Types.ObjectId; // Strict isolation
    receiverBranchId: mongoose.Types.ObjectId;
    sender: {
        name: string;
        mobile: string;
        email?: string;
    };
    receiver: {
        name: string;
        mobile: string;
        email?: string;
    };
    parcels: Array<{
        quantity: number;
        itemType: string;
        rate: number;
        remarks?: string;
    }>;
    costs: {
        freight: number;
        handling: number;
        hamali: number;
        total: number;
    };
    paymentType: 'Paid' | 'To Pay';
    remarks?: string;
    deliveredRemark?: string;
    cancellationRemark?: string;
    collectedBy?: string;
    collectedByMobile?: string;
    deliveredAt?: Date;
    deliveredBy?: mongoose.Types.ObjectId;
    status: 'BOOKED' | 'PENDING' | 'DELIVERED' | 'CANCELLED';
    editHistory: Array<{
        oldRemark?: string;
        newRemark: string;
        editedBy: mongoose.Types.ObjectId;
        editedAt: Date;
    }>;
    trackingLedger: Array<{
        status: string;
        timestamp: Date;
        hash: string;
        previousHash: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
    // Sort Helpers
    lrIndex: number;
    lrPrefix: string;
}

const BookingSchema = new Schema<IBooking>({
    lrNumber: { type: String, required: true, unique: true },
    fromBranch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    toBranch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    senderBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    receiverBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    sender: {
        name: { type: String, required: true },
        mobile: { type: String, required: true, match: /^\d{10}$/ },
        email: { type: String }
    },
    receiver: {
        name: { type: String, required: true },
        mobile: { type: String, required: true, match: /^\d{10}$/ },
        email: { type: String }
    },
    parcels: [{
        quantity: { type: Number, required: true },
        itemType: { type: String, required: true },
        rate: { type: Number, required: true },
        remarks: { type: String, required: false }
    }],
    lrIndex: { type: Number, index: true }, // For ultra-fast numerical sorting
    lrPrefix: { type: String, index: true },
    costs: {
        freight: { type: Number, required: true },
        handling: { type: Number, required: true },
        hamali: { type: Number, required: true },
        total: { type: Number, required: true }
    },
    paymentType: { type: String, enum: ['Paid', 'To Pay'], required: true },
    remarks: { type: String, required: false },
    deliveredRemark: { type: String, required: false },
    cancellationRemark: { type: String, required: false },
    collectedBy: { type: String, required: false },
    collectedByMobile: { type: String, required: false, match: /^\d{10}$/ },
    deliveredAt: { type: Date },
    deliveredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
        type: String,
        enum: ['BOOKED', 'PENDING', 'DELIVERED', 'CANCELLED'],
        default: 'PENDING'
    },
    editHistory: [{
        oldRemark: String,
        newRemark: { type: String, required: true },
        editedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        editedAt: { type: Date, default: Date.now }
    }],
    trackingLedger: [{
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        hash: { type: String, required: true },
        previousHash: { type: String, required: true }
    }]
}, { timestamps: true });

// Indexes to drastically speed up typical dashboard API queries
// Indexes to drastically speed up typical dashboard API queries
BookingSchema.index({ createdAt: -1 });
BookingSchema.index({ deliveredAt: -1 });
BookingSchema.index({ fromBranch: 1, createdAt: -1 });
BookingSchema.index({ fromBranch: 1, deliveredAt: -1 });
BookingSchema.index({ toBranch: 1, createdAt: -1 });
BookingSchema.index({ toBranch: 1, deliveredAt: -1 });
BookingSchema.index({ toBranch: 1, status: 1, createdAt: -1 });
BookingSchema.index({ toBranch: 1, status: 1, deliveredAt: -1 });
BookingSchema.index({ fromBranch: 1, status: 1, createdAt: -1 });
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ status: 1, deliveredAt: -1 });
BookingSchema.index({ senderBranchId: 1, createdAt: -1 });
BookingSchema.index({ receiverBranchId: 1, createdAt: -1 });
BookingSchema.index({ lrNumber: 1 });
BookingSchema.index({ fromBranch: 1, toBranch: 1, createdAt: -1 });
BookingSchema.index({ lrPrefix: 1, lrIndex: 1 }); // ASCENDING SORT Index for manifest reports
BookingSchema.index({ lrPrefix: 1, lrIndex: -1 }); // DESCENDING SORT Index
BookingSchema.index({ "sender.mobile": 1 });
BookingSchema.index({ "receiver.mobile": 1 });
BookingSchema.index({ "sender.name": 1 }); // Index for name searching
BookingSchema.index({ "receiver.name": 1 });

// Integrate Field Level Encryption for PII
BookingSchema.plugin(fieldEncryption, {
    fields: ["sender.name", "sender.mobile", "sender.email", "receiver.name", "receiver.mobile", "receiver.email"],
    secret: process.env.ENCRYPTION_KEY || 'default_insecure_development_key_32_bytes!',
    saltGenerator: function (secret: string) { return "1234567890123456"; } // Standardize salt for simple setup
});

// Cryptographic Status Ledger (Tamper-Proof Audit Trail)
BookingSchema.pre('save', function (next) {
    if (this.isModified('status') || this.isNew) {
        const lastIndex = this.trackingLedger.length - 1;
        const previousHash = lastIndex >= 0 ? this.trackingLedger[lastIndex].hash : 'genesis_block';
        
        const timestamp = new Date();
        const dataToHash = `${this.lrNumber}-${this.status}-${timestamp.toISOString()}-${previousHash}`;
        const hash = crypto.createHmac('sha256', process.env.ENCRYPTION_KEY || 'default_key')
            .update(dataToHash)
            .digest('hex');

        this.trackingLedger.push({
            status: this.status,
            timestamp,
            hash,
            previousHash
        });
    }
    next();
});

// Prevent Mongoose OverwriteModelError in HMR environment, but force schema update
if (mongoose.models.Booking) {
    delete mongoose.models.Booking;
}
export default mongoose.model<IBooking>('Booking', BookingSchema);
