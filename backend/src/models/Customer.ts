import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
    name: string;
    mobile: string;
    createdAt: Date;
    updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>({
    name: { type: String, required: true },
    mobile: { type: String, required: true, match: /^\d{10}$/ },
}, { timestamps: true });

// Ensure a person isn't added multiple times with the exact same name and mobile
CustomerSchema.index({ mobile: 1, name: 1 }, { unique: true });
// Fast lookup indexes
CustomerSchema.index({ name: 1 });
CustomerSchema.index({ mobile: 1 });

// Prevent Mongoose OverwriteModelError in HMR environment
if (mongoose.models.Customer) {
    delete mongoose.models.Customer;
}
export default mongoose.model<ICustomer>('Customer', CustomerSchema);
