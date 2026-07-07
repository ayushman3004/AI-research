import { ChatAnthropic } from '@langchain/anthropic';
import { AgentState, FindingsSchema, IFindings } from '../state';
import { ANALYZE_SYSTEM_PROMPT } from '../prompts';

export async function analyzeNode(state: AgentState): Promise<Partial<AgentState>> {
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
  const news = state.newsResults?.length ? state.newsResults.join('\n\n') : 'No recent news findings.';
  const financials = state.financialResults?.length ? state.financialResults.join('\n\n') : 'No financial findings.';
  const competitors = state.competitorResults?.length ? state.competitorResults.join('\n\n') : 'No competitor findings.';
  const risks = state.riskResults?.length ? state.riskResults.join('\n\n') : 'No risk or controversy findings.';
  const leadership = state.leadershipResults?.length ? state.leadershipResults.join('\n\n') : 'No leadership findings.';
  const errorsText = state.errors?.length 
    ? `\nNote: The following research errors occurred and some data might be missing:\n${state.errors.join('\n')}`
    : '';

  const userPrompt = `Please analyze the retrieved research inputs for the company "${company}" and output a structured Findings report.

=== RECENT NEWS ===
${news}

=== FINANCIALS & REVENUE ===
${financials}

=== COMPETITORS & MARKET SHARE ===
${competitors}

=== RISKS, LAWSUITS & CONTROVERSIES ===
${risks}

=== LEADERSHIP & MANAGEMENT ===
${leadership}
${errorsText}

Output the finalized report in structured format including growth signals, risk signals, competitive position summary, financial health summary, and deduplicated URLs as sources.`;

  const runWithPrompt = async (errorMsg?: string): Promise<IFindings> => {
    const structuredModel = model.withStructuredOutput(FindingsSchema);
    const messages = [
      { role: 'system', content: ANALYZE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    if (errorMsg) {
      messages.push({
        role: 'user',
        content: `WARNING: Your previous response failed zod schema verification with the error: "${errorMsg}". Please correct the format, ensure all fields are populated correctly with appropriate string and string array types, and re-output.`,
      });
    }

    const res = await structuredModel.invoke(messages);
    return res;
  };

  try {
    console.log(`Analyzing research findings for: ${company}`);
    const findings = await runWithPrompt();
    return { findings };
  } catch (err: any) {
    console.warn(`Analyze node structured output failed for ${company}, retrying with corrective prompt...`, err);
    try {
      const findings = await runWithPrompt(err?.message || String(err));
      return { findings };
    } catch (retryErr: any) {
      console.error(`Analyze node corrective retry failed for ${company}:`, retryErr);
      return {
        error: `Analysis structured output failed: ${retryErr?.message || retryErr}`,
      };
    }
  }
}
