import { Annotation } from '@langchain/langgraph';
import { z } from 'zod';

export const FindingsSchema = z.object({
  growth_signals: z.array(z.string()).describe('Positive indicators, expansion opportunities, or strong metrics'),
  risk_signals: z.array(z.string()).describe('Threats, red flags, controversies, lawsuits, or declining metrics'),
  competitive_position: z.string().describe('Summary of market share, competitive moat, and competitors'),
  financial_health: z.string().describe('Overview of financials, revenue, or funding state'),
  sources: z.array(z.string()).describe('A list of relevant URL sources gathered during research'),
});

export type IFindings = z.infer<typeof FindingsSchema>;

export const VerdictSchema = z.object({
  verdict: z.enum(['INVEST', 'PASS']).describe('Final investment decision: INVEST or PASS'),
  confidence: z.number().min(0).max(100).describe('Confidence score from 0 to 100'),
  reasoning: z.array(z.string()).min(3).max(6).describe('3 to 6 bullet points of detailed reasoning for the verdict'),
  key_risks: z.array(z.string()).describe('Top risks that could negatively impact this investment'),
  key_opportunities: z.array(z.string()).describe('Top opportunities that could drive positive performance'),
});

export type IVerdict = z.infer<typeof VerdictSchema>;

export interface ICanonicalEntity {
  name: string;
  ticker?: string;
  domain?: string;
}

// Result structure returned by Tavily
export interface ITavilyResult {
  title: string;
  url: string;
  content: string;
}

// Annotation Root defines the State shape for LangGraph.js
export const AgentAnnotation = Annotation.Root({
  companyName: Annotation<string>(),
  canonicalEntity: Annotation<ICanonicalEntity>(),
  
  // Specific results per research node
  newsResults: Annotation<string[]>({
    reducer: (left, right) => (right ? left.concat(right) : left),
    default: () => [],
  }),
  financialResults: Annotation<string[]>({
    reducer: (left, right) => (right ? left.concat(right) : left),
    default: () => [],
  }),
  competitorResults: Annotation<string[]>({
    reducer: (left, right) => (right ? left.concat(right) : left),
    default: () => [],
  }),
  riskResults: Annotation<string[]>({
    reducer: (left, right) => (right ? left.concat(right) : left),
    default: () => [],
  }),
  leadershipResults: Annotation<string[]>({
    reducer: (left, right) => (right ? left.concat(right) : left),
    default: () => [],
  }),
  
  // Combined sources and errors which could be appended to by multiple nodes
  sources: Annotation<string[]>({
    reducer: (left, right) => {
      const merged = left.concat(right || []);
      return Array.from(new Set(merged)); // Deduplicate
    },
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (left, right) => left.concat(right || []),
    default: () => [],
  }),
  
  // Final summaries and output results
  findings: Annotation<IFindings>(),
  verdict: Annotation<IVerdict>(),
  error: Annotation<string>(),
});

export type AgentState = typeof AgentAnnotation.State;
export type AgentStateUpdate = typeof AgentAnnotation.Update;
