import { ChatGroq } from '@langchain/groq';
import { AgentState, FindingsSchema, IFindings } from '../state';
import { ANALYZE_SYSTEM_PROMPT, ANALYZE_USER_TEMPLATE } from '../prompts';

export async function analyzeNode(state: AgentState): Promise<Partial<AgentState>> {
  if (state.error) {
    return {};
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY environment variable. Please configure it to enable the agent.');
  }

  const model = new ChatGroq({
    model: 'llama-3.1-8b-instant',
    temperature: 0.2,
    apiKey: apiKey,
    maxRetries: 0,
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

  const categorizedResults = `=== RECENT NEWS ===
${news}

=== FINANCIALS & REVENUE ===
${financials}

=== COMPETITORS & MARKET SHARE ===
${competitors}

=== RISKS, LAWSUITS & CONTROVERSIES ===
${risks}

=== LEADERSHIP & MANAGEMENT ===
${leadership}${errorsText}`;

  const userPrompt = ANALYZE_USER_TEMPLATE(categorizedResults);

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
    console.error("FIRST RUN FAILED WITH ERROR:", err);
    console.error("FIRST RUN ERROR KEYS:", Object.keys(err));
    console.error("FIRST RUN ERROR CAUSE:", err.cause);
    const errMsg = (err?.message || String(err)).toLowerCase();
    const causeMsg = (err?.cause?.message || String(err?.cause || '')).toLowerCase();
    const isRateLimit = err?.status === 429 || 
                        err?.cause?.status === 429 ||
                        errMsg.includes('429') || 
                        errMsg.includes('rate limit') || 
                        errMsg.includes('rate_limit_exceeded') ||
                        causeMsg.includes('429') ||
                        causeMsg.includes('rate limit') ||
                        causeMsg.includes('rate_limit_exceeded');
    
    if (isRateLimit) {
      console.warn(`Analyze node hit rate limit for ${company}. Sleeping 30 seconds before retrying...`);
      await new Promise((res) => setTimeout(res, 30000));
      try {
        const findings = await runWithPrompt();
        return { findings };
      } catch (retryErr: any) {
        console.error(`Analyze node retry after rate limit failed:`, retryErr);
        return {
          error: `Analysis structured output failed (Rate Limit): ${retryErr?.message || retryErr}`,
        };
      }
    }

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
