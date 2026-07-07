import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserHistoryEntry extends Document {
  userId: string;
  resultId: mongoose.Types.ObjectId;
  viewedAt: Date;
}

const UserHistoryEntrySchema = new Schema<IUserHistoryEntry>({
  userId: { type: String, required: true, index: true },
  resultId: { type: Schema.Types.ObjectId, ref: 'ResearchResult', required: true },
  viewedAt: { type: Date, default: Date.now, index: true },
});

const UserHistoryEntry: Model<IUserHistoryEntry> =
  mongoose.models.UserHistoryEntry || mongoose.model<IUserHistoryEntry>('UserHistoryEntry', UserHistoryEntrySchema);

export default UserHistoryEntry;
