import { ChatAnthropic } from '@langchain/anthropic';
import { AgentState, VerdictSchema, IVerdict } from '../state';
import { DECIDE_SYSTEM_PROMPT } from '../prompts';

export async function decideNode(state: AgentState): Promise<Partial<AgentState>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable. Please configure it to enable the agent.');
  }

  const model = new ChatAnthropic({
    modelName: 'claude-3-5-sonnet-20240620',
    temperature: 0.2,
    anthropicApiKey: apiKey,
  });

  const company = state.canonicalEntity?.name || state.companyName || '';
  const findings = state.findings;

  if (!findings) {
    return { error: 'No findings available to make a decision' };
  }

  const userPrompt = `Please evaluate the compiled research findings for "${company}" and make a final Invest/Pass investment decision.

=== GROWTH SIGNALS ===
${findings.growth_signals.map((s) => `- ${s}`).join('\n')}

=== RISK SIGNALS ===
${findings.risk_signals.map((s) => `- ${s}`).join('\n')}

=== COMPETITIVE POSITION ===
${findings.competitive_position}

=== FINANCIAL HEALTH ===
${findings.financial_health}

Output your final investment decision as a structured Verdict object. Make sure the confidence score is a number, and reasoning is between 3 and 6 concise, data-driven bullet points.`;

  const runWithPrompt = async (errorMsg?: string): Promise<IVerdict> => {
    const structuredModel = model.withStructuredOutput(VerdictSchema);
    const messages = [
      { role: 'system', content: DECIDE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    if (errorMsg) {
      messages.push({
        role: 'user',
        content: `WARNING: Your previous response failed validation with the error: "${errorMsg}". Please correct the output, verify the reasoning bullets count (3 to 6), and adhere strictly to the schema.`,
      });
    }

    const res = await structuredModel.invoke(messages);
    return res;
  };

  try {
    console.log(`Making investment decision for: ${company}`);
    const verdict = await runWithPrompt();
    return { verdict };
  } catch (err: any) {
    console.warn(`Decide node structured output failed for ${company}, retrying with corrective prompt...`, err);
    try {
      const verdict = await runWithPrompt(err?.message || String(err));
      return { verdict };
    } catch (retryErr: any) {
      console.error(`Decide node corrective retry failed for ${company}:`, retryErr);
      return {
        error: `Decision structured output failed: ${retryErr?.message || retryErr}`,
      };
    }
  }
}
