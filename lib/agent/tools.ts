import { TavilySearchAPIRetriever } from '@langchain/community/retrievers/tavily_search_api';
import { ChatGroq } from '@langchain/groq';
import { z } from 'zod';

export interface ISearchResult {
  title: string;
  url: string;
  content: string;
}

/**
 * Perform a web search using Tavily, or fallback to an LLM-simulated search if Tavily is unavailable.
 * @param query The search query string
 * @returns Array of title, url, content objects
 */
export async function searchWeb(query: string): Promise<ISearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  const hasRealTavilyKey = apiKey && apiKey !== 'your_tavily_api_key_here';

  if (hasRealTavilyKey) {
    try {
      console.log(`Running live Tavily search for query: "${query}"`);
      const retriever = new TavilySearchAPIRetriever({
        k: 2,
        apiKey,
      });

      const docs = await retriever.invoke(query);
      
      if (docs && docs.length > 0) {
        return docs.map((doc) => ({
          title: doc.metadata?.title || 'No Title',
          url: doc.metadata?.source || doc.metadata?.url || '',
          content: doc.pageContent || '',
        }));
      }
      console.warn(`Tavily search returned 0 results for: "${query}". Falling back to LLM simulation.`);
    } catch (error: any) {
      console.error(`Tavily search failed for query: "${query}". Falling back to LLM simulation.`, error);
    }
  } else {
    console.log(`Tavily API key is missing or placeholder. Running LLM search simulation for: "${query}"`);
  }

  // Fallback: LLM search simulation using Groq Llama 3.3 70B
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error('Missing GROQ_API_KEY environment variable. Cannot run search simulation.');
    }

    const model = new ChatGroq({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7, // slightly higher temperature to get varied search contents
      apiKey: groqApiKey,
      maxRetries: 0,
    });

    const SearchResultsSchema = z.object({
      results: z.array(
        z.object({
          title: z.string().describe('Title of the search result page/article'),
          url: z.string().describe('URL of the search result'),
          content: z.string().describe('Detailed content snippet containing specific data, metrics, dates, and facts'),
        })
      ).describe('List of search results'),
    });

    const structuredModel = model.withStructuredOutput(SearchResultsSchema);

    const systemPrompt = `You are an expert equity research database and search engine simulator.
Your job is to generate realistic, highly detailed search results that would be returned for the given query.
Each search result content MUST contain specific details, numbers, dates, metrics, competitor names, or financial stats. Avoid generic or vague summaries.`;

    const userPrompt = `Generate 2 highly detailed search results for the query: "${query}"`;

    const response = await structuredModel.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    return response.results || [];
  } catch (fallbackError: any) {
    console.error(`LLM search simulation failed for query: "${query}"`, fallbackError);
    return [];
  }
}
