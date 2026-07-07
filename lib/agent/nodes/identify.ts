import { ChatAnthropic } from '@langchain/anthropic';
import { z } from 'zod';
import { AgentState } from '../state';
import { IDENTIFY_SYSTEM_PROMPT, IDENTIFY_USER_TEMPLATE } from '../prompts';

const IdentifySchema = z.object({
  name: z.string().describe('The canonical or official name of the company'),
  ticker: z.string().nullable().optional().describe('The stock ticker if the company is publicly traded. Null otherwise.'),
  domain: z.string().describe('The main official website domain of the company (e.g. apple.com).'),
});

export async function identifyNode(state: AgentState) {
  const { companyName } = state;
  if (!companyName) {
    return { error: 'No company name provided to identify' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable. Please configure it to enable the agent.');
  }

  try {
    const model = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20240620',
      temperature: 0.2,
      anthropicApiKey: apiKey,
    });

    const structuredModel = model.withStructuredOutput(IdentifySchema);
    const prompt = IDENTIFY_USER_TEMPLATE(companyName);

    const result = await structuredModel.invoke([
      { role: 'system', content: IDENTIFY_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    return {
      canonicalEntity: {
        name: result.name,
        ticker: result.ticker || undefined,
        domain: result.domain,
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
