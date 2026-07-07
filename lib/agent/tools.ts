import { TavilySearchAPIRetriever } from '@langchain/community/retrievers/tavily_search_api';

export interface ISearchResult {
  title: string;
  url: string;
  content: string;
}

/**
 * Perform a web search using Tavily
 * @param query The search query string
 * @returns Array of title, url, content objects
 */
export async function searchWeb(query: string): Promise<ISearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('Missing TAVILY_API_KEY environment variable. Please configure it to enable web research.');
  }

  try {
    const retriever = new TavilySearchAPIRetriever({
      k: 5,
      apiKey,
    });

    const docs = await retriever.invoke(query);
    
    return docs.map((doc) => ({
      title: doc.metadata?.title || 'No Title',
      url: doc.metadata?.source || doc.metadata?.url || '',
      content: doc.pageContent || '',
    }));
  } catch (error: any) {
    console.error(`Tavily search failed for query: "${query}"`, error);
    throw new Error(`Search failed: ${error?.message || error}`);
  }
}
