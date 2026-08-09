import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
    key: string;
    value: any;
    description?: string;
    updatedBy: mongoose.Types.ObjectId;
}

const SystemSettingsSchema: Schema = new Schema({
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
