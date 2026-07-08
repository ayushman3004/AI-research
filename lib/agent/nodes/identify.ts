import { ChatGroq } from '@langchain/groq';
import { z } from 'zod';
import { AgentState } from '../state';
import { IDENTIFY_SYSTEM_PROMPT, IDENTIFY_USER_TEMPLATE } from '../prompts';

const IdentifySchema = z.object({
  resolved: z.boolean().describe('Whether the input corresponds to a real, identifiable company'),
  name: z.string().nullable().optional().describe('The canonical or official name of the company'),
  ticker: z.string().nullable().optional().describe('The stock ticker if the company is publicly traded. Null otherwise.'),
  domain: z.string().nullable().optional().describe('The main official website domain of the company (e.g. apple.com).'),
});

export async function identifyNode(state: AgentState) {
  let { companyName } = state;
  if (!companyName) {
    return { error: 'No company name provided to identify' };
  }

  // Preprocess input: title-case if it is completely lowercase to assist resolution (e.g. "tata" -> "Tata")
  companyName = companyName.trim();
  if (companyName && companyName === companyName.toLowerCase()) {
    companyName = companyName
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY environment variable. Please configure it to enable the agent.');
  }

  try {
    const model = new ChatGroq({
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
      apiKey: apiKey,
      maxRetries: 0,
    });

    const structuredModel = model.withStructuredOutput(IdentifySchema);
    const prompt = IDENTIFY_USER_TEMPLATE(companyName);

    const runCall = async () => {
      return await structuredModel.invoke([
        { role: 'system', content: IDENTIFY_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ]);
    };

    let result;
    try {
      result = await runCall();
    } catch (invokeErr: any) {
      const errMsg = (invokeErr?.message || String(invokeErr)).toLowerCase();
      const causeMsg = (invokeErr?.cause?.message || String(invokeErr?.cause || '')).toLowerCase();
      const combined = `${errMsg} ${causeMsg}`;
      const isRateLimit = invokeErr?.status === 429 ||
        invokeErr?.cause?.status === 429 ||
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
        console.warn(`Identify node hit rate limit. Sleeping ${finalSleepMs / 1000}s before retrying...`);
        await new Promise((res) => setTimeout(res, finalSleepMs));
        result = await runCall();
      } else {
        throw invokeErr;
      }
    }

    if (!result.resolved || !result.name) {
      return {
        error: `Could not resolve "${companyName}" to a valid business entity.`,
      };
    }

    return {
      canonicalEntity: {
        name: result.name,
        ticker: result.ticker || undefined,
        domain: result.domain || undefined,
      },
    };
  } catch (err: any) {
    console.error('Identify node failed:', err);
    return {
      error: `Failed to identify company entity: ${err?.message || err}`,
      canonicalEntity: { name: companyName }, // fallback
    };
  }
}
