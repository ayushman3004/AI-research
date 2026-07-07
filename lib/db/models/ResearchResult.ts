import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFindings {
  growth_signals: string[];
  risk_signals: string[];
  competitive_position: string;
  financial_health: string;
  sources: string[];
}

export interface IVerdict {
  verdict: 'INVEST' | 'PASS';
  confidence: number;
  reasoning: string[];
  key_risks: string[];
  key_opportunities: string[];
}

export interface IResearchResult extends Document {
  companyName: string;
  canonicalEntity: {
    name: string;
    ticker?: string;
    domain?: string;
  };
  findings: IFindings;
  verdict: IVerdict;
  requestedBy: string;
  createdAt: Date;
}

const ResearchResultSchema = new Schema<IResearchResult>({
  companyName: { type: String, required: true, lowercase: true, index: true },
  canonicalEntity: {
    name: { type: String, required: true },
    ticker: { type: String },
    domain: { type: String },
  },
  findings: {
    growth_signals: [{ type: String }],
    risk_signals: [{ type: String }],
    competitive_position: { type: String, required: true },
    financial_health: { type: String, required: true },
    sources: [{ type: String }],
  },
  verdict: {
    verdict: { type: String, enum: ['INVEST', 'PASS'], required: true },
    confidence: { type: Number, required: true },
    reasoning: [{ type: String }],
    key_risks: [{ type: String }],
    key_opportunities: [{ type: String }],
  },
  requestedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

const ResearchResult: Model<IResearchResult> =
  mongoose.models.ResearchResult || mongoose.model<IResearchResult>('ResearchResult', ResearchResultSchema);

export default ResearchResult;
