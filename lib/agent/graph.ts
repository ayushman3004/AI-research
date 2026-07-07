import { StateGraph, START, END } from '@langchain/langgraph';
import { AgentAnnotation } from './state';
import { identifyNode } from './nodes/identify';
import {
  researchNewsNode,
  researchFinancialsNode,
  researchCompetitorsNode,
  researchRisksNode,
  researchLeadershipNode,
} from './nodes/research';
import { analyzeNode } from './nodes/analyze';
import { decideNode } from './nodes/decide';

// Assemble the State Graph
const workflow = new StateGraph(AgentAnnotation)
  .addNode('identify', identifyNode)
  .addNode('research_news', researchNewsNode)
  .addNode('research_financials', researchFinancialsNode)
  .addNode('research_competitors', researchCompetitorsNode)
  .addNode('research_risks', researchRisksNode)
  .addNode('research_leadership', researchLeadershipNode)
  .addNode('analyze', analyzeNode)
  .addNode('decide', decideNode);

// Start with name identification
workflow.addEdge(START, 'identify');

// Fan-out to five parallel research tasks
workflow.addEdge('identify', 'research_news');
workflow.addEdge('identify', 'research_financials');
workflow.addEdge('identify', 'research_competitors');
workflow.addEdge('identify', 'research_risks');
workflow.addEdge('identify', 'research_leadership');

// Fan-in: Analyze merges and starts only when all five research nodes complete
workflow.addEdge('research_news', 'analyze');
workflow.addEdge('research_financials', 'analyze');
workflow.addEdge('research_competitors', 'analyze');
workflow.addEdge('research_risks', 'analyze');
workflow.addEdge('research_leadership', 'analyze');

// Final decision sequence
workflow.addEdge('analyze', 'decide');
workflow.addEdge('decide', END);

// Compile the executable graph
export const graph = workflow.compile();
