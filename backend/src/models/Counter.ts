import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter extends Document {
    branchId: mongoose.Types.ObjectId;
    entity: string; // e.g., 'Booking'
    field: string; // e.g., 'lrNumber'
    count: number;
}

const CounterSchema = new Schema<ICounter>({
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    entity: { type: String, required: true },
    field: { type: String, required: true },
    count: { type: Number, default: 0 }
});

// Compound index to ensure uniqueness per branch/entity/field
CounterSchema.index({ branchId: 1, entity: 1, field: 1 }, { unique: true });

export default mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);
