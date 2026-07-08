import { ChatGroq } from '@langchain/groq';
import { AgentState, VerdictSchema, IVerdict } from '../state';
import { DECIDE_SYSTEM_PROMPT, DECIDE_USER_TEMPLATE } from '../prompts';

export async function decideNode(state: AgentState): Promise<Partial<AgentState>> {
  if (state.error) {
    return {};
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY environment variable. Please configure it to enable the agent.');
  }

  const model = new ChatGroq({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    apiKey: apiKey,
    maxRetries: 0,
  });

  const company = state.canonicalEntity?.name || state.companyName || '';
  const findings = state.findings;

  if (!findings) {
    return { error: 'No findings available to make a decision' };
  }

  const findingsText = `=== GROWTH SIGNALS ===
${findings.growth_signals.map((s) => `- ${s}`).join('\n')}

=== RISK SIGNALS ===
${findings.risk_signals.map((s) => `- ${s}`).join('\n')}

=== COMPETITIVE POSITION ===
${findings.competitive_position}

=== FINANCIAL HEALTH ===
${findings.financial_health}`;

  const userPrompt = DECIDE_USER_TEMPLATE(findingsText);

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
    const errMsg = (err?.message || String(err)).toLowerCase();
    const causeMsg = (err?.cause?.message || String(err?.cause || '')).toLowerCase();
    const combined = `${errMsg} ${causeMsg}`;
    const isRateLimit = err?.status === 429 || 
                        err?.cause?.status === 429 ||
                        errMsg.includes('429') || 
                        errMsg.includes('rate limit') || 
                        errMsg.includes('rate_limit_exceeded') ||
                        causeMsg.includes('429') ||
                        causeMsg.includes('rate limit') ||
                        causeMsg.includes('rate_limit_exceeded');
    
    if (isRateLimit) {
      // Parse retry-after/try-again delay from error message
      const delayMatch = combined.match(/try again in ([\d\.]+)(s|ms|m)/);
      let sleepMs = 3000; // default 3 seconds fallback
      if (delayMatch) {
        const value = parseFloat(delayMatch[1]);
        const unit = delayMatch[2];
        if (unit === 'ms') {
          sleepMs = value;
        } else if (unit === 'm') {
          sleepMs = value * 60 * 1000;
        } else {
          sleepMs = value * 1000;
        }
      }
      // Add a 1-second buffer to guarantee safety
      const finalSleepMs = sleepMs + 1000;
      console.warn(`Decide node hit rate limit for ${company}. Sleeping ${finalSleepMs / 1000}s before retrying...`);
      await new Promise((res) => setTimeout(res, finalSleepMs));
      try {
        const verdict = await runWithPrompt();
        return { verdict };
      } catch (retryErr: any) {
        console.error(`Decide node retry after rate limit failed:`, retryErr);
        return {
          error: `Decision structured output failed (Rate Limit): ${retryErr?.message || retryErr}`,
        };
      }
    }

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
