import { AgentState } from '../state';
import { searchWeb } from '../tools';

/**
 * Gets the company identifier to use in search queries
 */
function getSearchCompany(state: AgentState): string {
  return state.canonicalEntity?.name || state.companyName || '';
}

/**
 * research_news node: Searches recent news
 */
export async function researchNewsNode(state: AgentState) {
  if (state.error) {
    return {};
  }
  const company = getSearchCompany(state);
  const query = `"${company}" recent news developments`;
  console.log(`Running research_news for: ${company}`);

  try {
    const searchResults = await searchWeb(query);
    const textResults = searchResults.map(
      (r) => `[Source: ${r.title}](${r.url})\nContent: ${r.content.slice(0, 1000)}${r.content.length > 1000 ? '...' : ''}`
    );
    const urls = searchResults.map((r) => r.url).filter(Boolean);

    return {
      newsResults: textResults,
      sources: urls,
    };
  } catch (err: any) {
    console.error(`research_news failed for ${company}:`, err);
    return {
      newsResults: [],
      errors: [`News research failed: ${err?.message || err}`],
    };
  }
}

/**
 * research_financials node: Searches financials, revenue, funding
 */
export async function researchFinancialsNode(state: AgentState) {
  if (state.error) {
    return {};
  }
  const company = getSearchCompany(state);
  const query = `"${company}" funding valuation OR revenue OR financial performance`;
  console.log(`Running research_financials for: ${company}`);

  try {
    const searchResults = await searchWeb(query);
    const textResults = searchResults.map(
      (r) => `[Source: ${r.title}](${r.url})\nContent: ${r.content.slice(0, 1000)}${r.content.length > 1000 ? '...' : ''}`
    );
    const urls = searchResults.map((r) => r.url).filter(Boolean);

    return {
      financialResults: textResults,
      sources: urls,
    };
  } catch (err: any) {
    console.error(`research_financials failed for ${company}:`, err);
    return {
      financialResults: [],
      errors: [`Financials research failed: ${err?.message || err}`],
    };
  }
}

/**
 * research_competitors node: Searches competitors and market share
 */
export async function researchCompetitorsNode(state: AgentState) {
  if (state.error) {
    return {};
  }
  const company = getSearchCompany(state);
  const query = `"${company}" main competitors market share OR industry moat`;
  console.log(`Running research_competitors for: ${company}`);

  try {
    const searchResults = await searchWeb(query);
    const textResults = searchResults.map(
      (r) => `[Source: ${r.title}](${r.url})\nContent: ${r.content.slice(0, 1000)}${r.content.length > 1000 ? '...' : ''}`
    );
    const urls = searchResults.map((r) => r.url).filter(Boolean);

    return {
      competitorResults: textResults,
      sources: urls,
    };
  } catch (err: any) {
    console.error(`research_competitors failed for ${company}:`, err);
    return {
      competitorResults: [],
      errors: [`Competitors research failed: ${err?.message || err}`],
    };
  }
}

/**
 * research_risks node: Searches risks, controversies, lawsuits
 */
export async function researchRisksNode(state: AgentState) {
  if (state.error) {
    return {};
  }
  const company = getSearchCompany(state);
  const query = `"${company}" controversy OR lawsuit OR risk factors regulatory issues`;
  console.log(`Running research_risks for: ${company}`);

  try {
    const searchResults = await searchWeb(query);
    const textResults = searchResults.map(
      (r) => `[Source: ${r.title}](${r.url})\nContent: ${r.content.slice(0, 1000)}${r.content.length > 1000 ? '...' : ''}`
    );
    const urls = searchResults.map((r) => r.url).filter(Boolean);

    return {
      riskResults: textResults,
      sources: urls,
    };
  } catch (err: any) {
    console.error(`research_risks failed for ${company}:`, err);
    return {
      riskResults: [],
      errors: [`Risks research failed: ${err?.message || err}`],
    };
  }
}

/**
 * research_leadership node: Searches leadership, management, CEO
 */
export async function researchLeadershipNode(state: AgentState) {
  if (state.error) {
    return {};
  }
  const company = getSearchCompany(state);
  const query = `"${company}" CEO leadership team management board of directors`;
  console.log(`Running research_leadership for: ${company}`);

  try {
    const searchResults = await searchWeb(query);
    const textResults = searchResults.map(
      (r) => `[Source: ${r.title}](${r.url})\nContent: ${r.content.slice(0, 1000)}${r.content.length > 1000 ? '...' : ''}`
    );
    const urls = searchResults.map((r) => r.url).filter(Boolean);

    return {
      leadershipResults: textResults,
      sources: urls,
    };
  } catch (err: any) {
    console.error(`research_leadership failed for ${company}:`, err);
    return {
      leadershipResults: [],
      errors: [`Leadership research failed: ${err?.message || err}`],
    };
  }
}
