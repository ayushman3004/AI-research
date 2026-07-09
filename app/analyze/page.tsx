'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import Header from '@/components/Header';
import { 
  Search, BookOpen, AlertCircle, TrendingUp, CheckCircle, 
  RotateCw, ArrowRight, History, Calendar, ExternalLink, 
  Cpu, Users, DollarSign, BarChart2, ShieldAlert, Trash2
} from 'lucide-react';

interface IFindings {
  growth_signals: string[];
  risk_signals: string[];
  competitive_position: string;
  financial_health: string;
  sources: string[];
}

interface IVerdict {
  verdict: 'INVEST' | 'PASS';
  confidence: number;
  reasoning: string[];
  key_risks: string[];
  key_opportunities: string[];
}

interface IResult {
  cached: boolean;
  createdAt: string;
  canonicalEntity: {
    name: string;
    ticker?: string;
    domain?: string;
  };
  findings: IFindings;
  verdict: IVerdict;
}

interface IHistoryItem {
  id: string;
  resultId: string;
  companyName: string;
  ticker?: string | null;
  verdict: 'INVEST' | 'PASS';
  confidence: number;
  viewedAt: string;
}

type TraceStatus = 'idle' | 'identifying' | 'researching' | 'analyzing' | 'deciding' | 'completed' | 'error';

const getCurrencySymbol = (code: string) => {
  switch (code) {
    case 'USD': return '$';
    case 'INR': return '₹';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    default: return `${code} `;
  }
};

const formatLargeNumber = (num: number, currency: string = 'USD'): string => {
  if (!num) return 'N/A';
  const prefix = getCurrencySymbol(currency);
  
  if (num >= 1e12) {
    return `${prefix}${(num / 1e12).toFixed(2)}T`;
  }
  if (num >= 1e9) {
    return `${prefix}${(num / 1e9).toFixed(2)}B`;
  }
  if (num >= 1e6) {
    return `${prefix}${(num / 1e6).toFixed(2)}M`;
  }
  return `${prefix}${num.toLocaleString()}`;
};

export default function AnalyzePage() {
  const router = useRouter();
  const { user, token, loading } = useAuth();

  // Search and result states
  const [companyInput, setCompanyInput] = useState('');
  const [researchResult, setResearchResult] = useState<IResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Agent execution trace states
  const [traceStatus, setTraceStatus] = useState<TraceStatus>('idle');
  const [parallelActive, setParallelActive] = useState({
    news: 'idle',
    financials: 'idle',
    competitors: 'idle',
    risks: 'idle',
    leadership: 'idle'
  });

  // User history states
  const [historyList, setHistoryList] = useState<IHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Market data states
  const [marketData, setMarketData] = useState<any>(null);
  const [marketDataLoading, setMarketDataLoading] = useState(false);
  const [marketDataError, setMarketDataError] = useState('');

  // Fetch market data from API
  const fetchMarketData = useCallback(async (ticker: string) => {
    setMarketDataLoading(true);
    setMarketDataError('');
    setMarketData(null);
    try {
      const res = await fetch(`/api/market-data?ticker=${encodeURIComponent(ticker)}`);
      if (!res.ok) {
        throw new Error('Failed to fetch market data');
      }
      const data = await res.json();
      setMarketData(data);
    } catch (err: any) {
      console.error('Error fetching market data:', err);
      setMarketDataError(err.message || 'Failed to load stock data.');
    } finally {
      setMarketDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (researchResult?.canonicalEntity?.ticker) {
      fetchMarketData(researchResult.canonicalEntity.ticker);
    } else {
      setMarketData(null);
      setMarketDataError('');
    }
  }, [researchResult, fetchMarketData]);

  // 1. Client Redirect Guard
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // 2. Fetch User History
  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const response = await fetch('/api/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHistoryList(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load search history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user && token) {
      fetchHistory();
    }
  }, [user, token, fetchHistory]);

  // 3. Load historic search directly
  const loadHistoricResult = async (resultId: string) => {
    setErrorMessage('');
    setTraceStatus('idle');
    setResearchResult(null);
    
    // Simulate nice quick fade-in of steps for cached loading
    setTraceStatus('identifying');
    setParallelActive({
      news: 'running',
      financials: 'running',
      competitors: 'running',
      risks: 'running',
      leadership: 'running'
    });

    const timer1 = setTimeout(() => {
      setTraceStatus('researching');
      setParallelActive({
        news: 'completed',
        financials: 'completed',
        competitors: 'completed',
        risks: 'completed',
        leadership: 'completed'
      });
    }, 400);

    const timer2 = setTimeout(() => {
      setTraceStatus('analyzing');
    }, 800);

    const timer3 = setTimeout(() => {
      setTraceStatus('deciding');
    }, 1200);
    
    try {
      const historyItem = historyList.find(h => h.resultId === resultId);
      if (historyItem) {
        setCompanyInput(historyItem.companyName);

        const response = await fetch(`/api/history?resultId=${encodeURIComponent(resultId)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);

        if (response.ok) {
          const data = await response.json();
          setResearchResult(data);
          setTraceStatus('completed');
        } else {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to reload report');
        }
      }
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setErrorMessage(err.message || 'Failed to retrieve cached report.');
      setTraceStatus('error');
    }
  };

  // Delete a specific history entry
  const deleteHistoryItem = async (id: string) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/history?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        // Remove from list
        setHistoryList(prev => prev.filter(item => item.id !== id));
      } else {
        const errData = await response.json();
        console.error('Failed to delete history item:', errData.error);
      }
    } catch (err) {
      console.error('Error deleting history item:', err);
    }
  };

  // Clear all history entries
  const clearAllHistory = async () => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to clear your entire research archive?')) return;
    try {
      const response = await fetch('/api/history', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setHistoryList([]);
      } else {
        const errData = await response.json();
        console.error('Failed to clear history:', errData.error);
      }
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  };

  // 4. Trigger Research Execution
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyInput.trim()) return;

    setErrorMessage('');
    setResearchResult(null);
    setTraceStatus('identifying');
    setParallelActive({
      news: 'idle',
      financials: 'idle',
      competitors: 'idle',
      risks: 'idle',
      leadership: 'idle'
    });

    // Simulate Agent Step Timings to make parallel nodes visual
    const timer1 = setTimeout(() => {
      setTraceStatus('researching');
      setParallelActive({
        news: 'running',
        financials: 'running',
        competitors: 'running',
        risks: 'running',
        leadership: 'running'
      });
    }, 1200);

    const timer2 = setTimeout(() => {
      setParallelActive({
        news: 'completed',
        financials: 'completed',
        competitors: 'completed',
        risks: 'completed',
        leadership: 'completed'
      });
    }, 3800);

    const timer3 = setTimeout(() => {
      setTraceStatus('analyzing');
    }, 4000);

    const timer4 = setTimeout(() => {
      setTraceStatus('deciding');
    }, 5500);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ companyName: companyInput.trim() })
      });

      // Clear layout timers so we don't interfere with real data completion
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);

      if (!response.ok) {
        let errorMessage = `Server error (${response.status}): The research agent encountered a processing exception.`;
        try {
          const errData = await response.json();
          errorMessage = errData.error || errorMessage;
        } catch {
          // Response was not JSON — likely an HTML page from a proxy/firewall or a crashed server.
          const text = await response.text().catch(() => '');
          if (text.includes('DOCTYPE') || text.includes('<html')) {
            errorMessage = `A network proxy or firewall (status ${response.status}) intercepted the request. Try switching networks or using a hotspot.`;
          }
        }
        throw new Error(errorMessage);
      }

      const data: IResult = await response.json();
      
      // If it came from cache, skip trace animations instantly
      if (data.cached) {
        setTraceStatus('completed');
      } else {
        // Complete animations nicely
        setParallelActive({
          news: 'completed',
          financials: 'completed',
          competitors: 'completed',
          risks: 'completed',
          leadership: 'completed'
        });
        setTraceStatus('completed');
      }

      setResearchResult(data);
      fetchHistory(); // Refresh sidebar history
    } catch (err: any) {
      console.error('Research pipeline failed:', err);
      setErrorMessage(err.message || 'Agent error occurred during evaluation.');
      setTraceStatus('error');
    }
  };

  // Helper to format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#faf9f6] dark:bg-[#0f1115]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-800 dark:border-zinc-700 dark:border-t-zinc-300 rounded-full animate-spin"></div>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500 dark:text-zinc-400">Securing environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#faf9f6] dark:bg-[#0f1115] text-[#1c1d1f] dark:text-[#eef1f5] transition-colors duration-300 min-h-screen">
      
      {/* Header */}
      <Header />

      {/* Workspace Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 border-l border-r border-slate-200/80 dark:border-zinc-800/80 bg-white/20 dark:bg-zinc-900/5">
        
        {/* Sidebar History Panel */}
        <aside className="border-r border-slate-200/80 dark:border-zinc-800/80 p-6 flex flex-col lg:col-span-1 min-h-[400px] lg:min-h-[calc(100vh-73px)]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              <h2 className="font-mono text-2xs uppercase tracking-widest text-slate-500 dark:text-zinc-400 font-semibold">
                Research Archives
              </h2>
            </div>
            {historyList.length > 0 && (
              <button 
                onClick={clearAllHistory}
                className="text-[10px] font-mono uppercase text-rose-600 hover:text-rose-500 cursor-pointer bg-transparent border-0 p-0"
              >
                Clear All
              </button>
            )}
          </div>

          {historyLoading && historyList.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-xs font-mono text-slate-400">
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>Accessing vaults...</span>
            </div>
          ) : historyList.length === 0 ? (
            <div className="text-xs font-mono text-slate-450 dark:text-zinc-550 border border-dashed border-slate-200 dark:border-zinc-850 p-4 text-center rounded bg-slate-50/50 dark:bg-zinc-950/20">
              No previous research sessions stored.
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[300px] lg:max-h-[500px] pr-1">
              {historyList.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  onClick={() => loadHistoricResult(item.resultId)}
                  className="group relative w-full text-left p-3.5 border border-slate-200 dark:border-zinc-800 hover:border-slate-800 dark:hover:border-zinc-400 bg-white dark:bg-zinc-900 transition-all flex flex-col gap-1.5 cursor-pointer shadow-2xs hover:shadow-sm"
                >
                  <div className="flex justify-between items-start gap-1 pr-6">
                    <span className="font-serif font-bold text-xs truncate max-w-[85%]">
                      {item.companyName}
                    </span>
                    {item.ticker && (
                      <span className="font-mono text-[9px] bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 text-slate-500 dark:text-zinc-450 shrink-0 font-semibold">
                        {item.ticker}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className={`font-bold ${item.verdict === 'INVEST' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      {item.verdict}
                    </span>
                    <span className="text-slate-400 dark:text-zinc-500 text-3xs">
                      {formatDate(item.viewedAt)}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistoryItem(item.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity duration-250 cursor-pointer bg-transparent border-0"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Main Analyst Area */}
        <main className="lg:col-span-3 p-6 sm:p-8 flex flex-col gap-8">
          
          {/* Research Request Bar */}
          <section className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-6 shadow-2xs">
            <h1 className="font-serif text-xl font-normal mb-1">Analyst Terminal</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mb-4 uppercase tracking-wider">
              Enter target enterprise name to begin deep evaluation
            </p>

            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Stripe, Apple, Snowflake, Anthropic"
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  disabled={traceStatus !== 'idle' && traceStatus !== 'completed' && traceStatus !== 'error'}
                  className="w-full pl-10 pr-4 py-3 bg-[#faf9f6] dark:bg-[#0f1115] border border-slate-300 dark:border-zinc-700 text-xs focus:ring-1 focus:ring-slate-800 dark:focus:ring-zinc-300 focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                disabled={traceStatus !== 'idle' && traceStatus !== 'completed' && traceStatus !== 'error'}
                className="px-6 py-3.5 bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-950 text-xs font-mono tracking-widest uppercase hover:bg-slate-800 dark:hover:bg-zinc-200 transition-colors shadow-2xs shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-400 dark:disabled:bg-zinc-700"
              >
                {traceStatus !== 'idle' && traceStatus !== 'completed' && traceStatus !== 'error' ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Researching</span>
                  </>
                ) : (
                  <>
                    <span>Execute Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </section>

          {/* User Facing Error Alerts */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded text-xs text-rose-600 dark:text-rose-400 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold font-mono uppercase tracking-wider mb-1">Execution Failure</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* LIVE AGENT TRACE VISUALIZATION */}
          {traceStatus !== 'idle' && traceStatus !== 'completed' && (
            <section className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-6 flex flex-col gap-6 shadow-2xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <Cpu className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
                <h3 className="font-mono text-2xs uppercase tracking-widest font-semibold">
                  LangGraph Agent Orchestration Stream
                </h3>
              </div>

              {/* Steps Layout */}
              <div className="flex flex-col gap-6 font-mono text-2xs">
                
                {/* Node 1: Identify */}
                <div className="flex items-center gap-4">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border font-semibold ${
                    traceStatus === 'identifying'
                      ? 'border-slate-800 text-slate-800 dark:border-zinc-300 dark:text-zinc-300 animate-pulse'
                      : 'border-emerald-600 bg-emerald-50 text-emerald-600 dark:border-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-400'
                  }`}>
                    {traceStatus !== 'identifying' ? '✓' : '1'}
                  </div>
                  <div>
                    <span className="font-bold uppercase tracking-wider">Node: Identify</span>
                    <span className="text-slate-400 dark:text-zinc-500 ml-2">| Disambiguating company entity & resolving ticker</span>
                  </div>
                </div>

                {/* Node 2: Parallel research */}
                <div className="flex flex-col gap-3 pl-9 border-l border-slate-200 dark:border-zinc-800 ml-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                      Parallel Research Phase (5 Fan-Out Channels)
                    </span>
                    {traceStatus === 'researching' && <RotateCw className="w-3 h-3 text-slate-500 animate-spin" />}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {/* news */}
                    <div className={`p-2.5 border text-center ${
                      parallelActive.news === 'running' ? 'border-slate-800 text-slate-800 bg-slate-50/50 dark:border-zinc-400 dark:text-zinc-300 dark:bg-zinc-800/30 animate-pulse' :
                      parallelActive.news === 'completed' ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/10' :
                      'border-slate-200 text-slate-400 dark:border-zinc-850 dark:text-zinc-650'
                    }`}>
                      <BookOpen className="w-3.5 h-3.5 mx-auto mb-1.5" />
                      <div>News Research</div>
                    </div>
                    {/* financials */}
                    <div className={`p-2.5 border text-center ${
                      parallelActive.financials === 'running' ? 'border-slate-800 text-slate-800 bg-slate-50/50 dark:border-zinc-400 dark:text-zinc-300 dark:bg-zinc-800/30 animate-pulse' :
                      parallelActive.financials === 'completed' ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/10' :
                      'border-slate-200 text-slate-400 dark:border-zinc-850 dark:text-zinc-650'
                    }`}>
                      <DollarSign className="w-3.5 h-3.5 mx-auto mb-1.5" />
                      <div>Financials</div>
                    </div>
                    {/* competitors */}
                    <div className={`p-2.5 border text-center ${
                      parallelActive.competitors === 'running' ? 'border-slate-800 text-slate-800 bg-slate-50/50 dark:border-zinc-400 dark:text-zinc-300 dark:bg-zinc-800/30 animate-pulse' :
                      parallelActive.competitors === 'completed' ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/10' :
                      'border-slate-200 text-slate-400 dark:border-zinc-850 dark:text-zinc-650'
                    }`}>
                      <BarChart2 className="w-3.5 h-3.5 mx-auto mb-1.5" />
                      <div>Competitors</div>
                    </div>
                    {/* risks */}
                    <div className={`p-2.5 border text-center ${
                      parallelActive.risks === 'running' ? 'border-slate-800 text-slate-800 bg-slate-50/50 dark:border-zinc-400 dark:text-zinc-300 dark:bg-zinc-800/30 animate-pulse' :
                      parallelActive.risks === 'completed' ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/10' :
                      'border-slate-200 text-slate-400 dark:border-zinc-850 dark:text-zinc-650'
                    }`}>
                      <ShieldAlert className="w-3.5 h-3.5 mx-auto mb-1.5" />
                      <div>Risks & Lawsuits</div>
                    </div>
                    {/* leadership */}
                    <div className={`p-2.5 border text-center ${
                      parallelActive.leadership === 'running' ? 'border-slate-800 text-slate-800 bg-slate-50/50 dark:border-zinc-400 dark:text-zinc-300 dark:bg-zinc-800/30 animate-pulse' :
                      parallelActive.leadership === 'completed' ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/10' :
                      'border-slate-200 text-slate-400 dark:border-zinc-850 dark:text-zinc-650'
                    }`}>
                      <Users className="w-3.5 h-3.5 mx-auto mb-1.5" />
                      <div>Leadership</div>
                    </div>
                  </div>
                </div>

                {/* Node 3: Analyze */}
                <div className="flex items-center gap-4">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border font-semibold ${
                    traceStatus === 'analyzing' ? 'border-slate-800 text-slate-800 dark:border-zinc-300 dark:text-zinc-300 animate-pulse' :
                    traceStatus === 'deciding' ? 'border-emerald-600 bg-emerald-50 text-emerald-600 dark:border-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-400' :
                    'border-slate-200 text-slate-400 dark:border-zinc-850 dark:text-zinc-650'
                  }`}>
                    {traceStatus === 'deciding' ? '✓' : '2'}
                  </div>
                  <div>
                    <span className="font-bold uppercase tracking-wider">Node: Analyze</span>
                    <span className="text-slate-400 dark:text-zinc-500 ml-2">| Groq Llama 3.3 70B consolidates text inputs into typed Findings schema</span>
                  </div>
                </div>

                {/* Node 4: Decide */}
                <div className="flex items-center gap-4">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border font-semibold ${
                    traceStatus === 'deciding' ? 'border-slate-800 text-slate-800 dark:border-zinc-300 dark:text-zinc-300 animate-pulse' :
                    'border-slate-200 text-slate-400 dark:border-zinc-850 dark:text-zinc-650'
                  }`}>
                    3
                  </div>
                  <div>
                    <span className="font-bold uppercase tracking-wider">Node: Decide</span>
                    <span className="text-slate-400 dark:text-zinc-500 ml-2">| Weighing signals and stamping final Invest/Pass Verdict</span>
                  </div>
                </div>

              </div>
            </section>
          )}

          {/* FINAL REPORT VERDICT STAMP & MEMO */}
          {researchResult && (
            <article className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs relative transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* Report Header Metadata */}
              <div className="border-b border-slate-200 dark:border-zinc-800 p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-zinc-950/10">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h2 className="font-serif text-2xl font-bold tracking-tight">
                      {researchResult.canonicalEntity.name}
                    </h2>
                    {researchResult.canonicalEntity.ticker && (
                      <span className="font-mono text-xs bg-slate-200 dark:bg-zinc-800 px-2 py-0.5 text-slate-700 dark:text-zinc-300 font-bold uppercase">
                        {researchResult.canonicalEntity.ticker}
                      </span>
                    )}
                  </div>
                  {researchResult.canonicalEntity.domain && (
                    <a
                      href={`https://${researchResult.canonicalEntity.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300 flex items-center gap-1 hover:underline"
                    >
                      <span>{researchResult.canonicalEntity.domain}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Meta details & Cache label */}
                <div className="text-right font-mono text-3xs text-slate-400 dark:text-zinc-500 flex flex-col items-start sm:items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>ISSUED: {formatDate(researchResult.createdAt)}</span>
                  </div>
                  {researchResult.cached ? (
                    <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-250 dark:border-amber-900/50 px-1.5 py-0.5 rounded-xs font-semibold animate-pulse">
                      CACHED MEMO
                    </span>
                  ) : (
                    <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/50 px-1.5 py-0.5 rounded-xs font-semibold">
                      FRESH INVOCATION
                    </span>
                  )}
                </div>
              </div>

              {/* Main Report Body */}
              <div className="p-6 sm:p-8 space-y-8">
                
                {/* Decision Stamp Hero Block */}
                <div className="relative border border-slate-200 dark:border-zinc-800 p-6 flex flex-col sm:flex-row justify-between items-center gap-6 overflow-hidden">
                  
                  {/* Background grid */}
                  <div className="absolute inset-0 bg-linear-to-tr from-slate-500/5 to-transparent pointer-events-none"></div>

                  <div className="z-10 text-center sm:text-left">
                    <p className="font-mono text-3xs uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2">
                      Investment Committee Stamp
                    </p>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-3xl font-mono font-bold tracking-tight">
                        {researchResult.verdict.confidence}%
                      </span>
                      <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono">
                        Certainty Index
                      </span>
                    </div>
                    <div className="w-48 bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className={`h-full ${researchResult.verdict.verdict === 'INVEST' ? 'bg-emerald-600' : 'bg-rose-600'}`}
                        style={{ width: `${researchResult.verdict.confidence}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stamp Design Element */}
                  <div className="z-10 shrink-0">
                    <div className={`stamp border-4 px-6 py-2.5 text-2xl font-bold rounded flex items-center justify-center rotate-[-4deg] shadow-xs select-none ${
                      researchResult.verdict.verdict === 'INVEST' 
                        ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400' 
                        : 'border-rose-600 text-rose-600 dark:border-rose-500 dark:text-rose-400'
                    }`}>
                      {researchResult.verdict.verdict}
                    </div>
                  </div>
                </div>

                {/* Section A: Core Reasoning Bullet points */}
                <section>
                  <h3 className="font-mono text-2xs uppercase tracking-widest text-slate-500 dark:text-zinc-400 font-bold mb-3 border-b border-slate-100 dark:border-zinc-800 pb-1.5">
                    Investment Rationale (Verifiable Claims)
                  </h3>
                  <ul className="space-y-2.5">
                    {researchResult.verdict.reasoning.map((item, idx) => (
                      <li key={`reason-${idx}`} className="text-xs leading-relaxed flex items-start gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${researchResult.verdict.verdict === 'INVEST' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Real Market Data Section */}
                {researchResult.canonicalEntity?.ticker && (
                  <section className="border border-slate-100 dark:border-zinc-850 p-6 bg-slate-50/20 dark:bg-zinc-950/5">
                    <h3 className="font-mono text-2xs uppercase tracking-widest text-slate-500 dark:text-zinc-400 font-bold mb-4 border-b border-slate-100 dark:border-zinc-800 pb-1.5 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                      <span>Real-Time Market Data (Yahoo Finance)</span>
                    </h3>

                    {marketDataLoading ? (
                      <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-slate-200 dark:bg-zinc-800 w-1/3 rounded-xs"></div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-12 bg-slate-200 dark:bg-zinc-850 rounded-xs"></div>
                          ))}
                        </div>
                      </div>
                    ) : marketDataError ? (
                      <div className="text-2xs text-rose-600 dark:text-rose-400 font-mono bg-rose-50/50 dark:bg-rose-950/10 p-3 border border-rose-100 dark:border-rose-900/30">
                        Error loading market statistics: {marketDataError}
                      </div>
                    ) : marketData ? (
                      <div className="space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                              {marketData.displayName}
                            </h4>
                            <p className="text-3xs text-slate-400 dark:text-zinc-500 font-mono mt-0.5">
                              Ticker: {researchResult.canonicalEntity.ticker} • Currency: {marketData.currency}
                            </p>
                          </div>
                          
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-mono font-bold tracking-tight">
                              {getCurrencySymbol(marketData.currency)}{marketData.price?.toFixed(2)}
                            </span>
                            <span className={`text-2xs font-mono font-semibold ${marketData.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {marketData.change >= 0 ? '+' : ''}{marketData.change?.toFixed(2)} ({marketData.changePercent >= 0 ? '+' : ''}{marketData.changePercent?.toFixed(2)}%)
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
                          <div>
                            <p className="text-3xs font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">Exchange</p>
                            <p className="text-xs font-semibold mt-1">
                              {marketData.exchange}
                            </p>
                          </div>
                          <div>
                            <p className="text-3xs font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">Daily Volume</p>
                            <p className="text-xs font-semibold mt-1">
                              {marketData.volume ? marketData.volume.toLocaleString() : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-3xs font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">52-Week Range</p>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="text-4xs font-mono text-slate-400 dark:text-zinc-500">
                                {getCurrencySymbol(marketData.currency)}{marketData.low52?.toFixed(1)}
                              </span>
                              <div className="grow bg-slate-200 dark:bg-zinc-800 h-1 rounded-full relative overflow-hidden">
                                <div 
                                  className="absolute bg-slate-500 dark:bg-zinc-400 h-full rounded-full"
                                  style={{
                                    left: `${Math.max(0, Math.min(100, ((marketData.price - marketData.low52) / (marketData.high52 - marketData.low52)) * 100))}%`,
                                    width: '4px',
                                    transform: 'translateX(-2px)'
                                  }}
                                />
                              </div>
                              <span className="text-4xs font-mono text-slate-400 dark:text-zinc-500">
                                {getCurrencySymbol(marketData.currency)}{marketData.high52?.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-2xs text-slate-400 dark:text-zinc-500 font-mono">
                        No stock data found for ticker: {researchResult.canonicalEntity.ticker}
                      </div>
                    )}
                  </section>
                )}

                {/* Section B: Grid for growth and risk signals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Growth signals card */}
                  <div className="border border-slate-100 dark:border-zinc-850 p-5 bg-slate-50/30 dark:bg-zinc-950/5">
                    <h4 className="font-mono text-3xs uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-bold mb-3 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Growth Signals</span>
                    </h4>
                    <ul className="space-y-2.5">
                      {researchResult.findings.growth_signals.map((sig, idx) => (
                        <li key={`growth-${idx}`} className="text-2xs leading-relaxed flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 mt-0.5 text-emerald-600 dark:text-emerald-500 shrink-0" />
                          <span>{sig}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Risk signals card */}
                  <div className="border border-slate-100 dark:border-zinc-850 p-5 bg-slate-50/30 dark:bg-zinc-950/5">
                    <h4 className="font-mono text-3xs uppercase tracking-widest text-rose-700 dark:text-rose-400 font-bold mb-3 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Risk Signals & Controversy</span>
                    </h4>
                    <ul className="space-y-2.5">
                      {researchResult.findings.risk_signals.map((sig, idx) => (
                        <li key={`risk-${idx}`} className="text-2xs leading-relaxed flex items-start gap-2">
                          <AlertCircle className="w-3 h-3 mt-0.5 text-rose-600 dark:text-rose-500 shrink-0" />
                          <span>{sig}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* Section C: Competitive Position summary */}
                <section className="bg-slate-50/20 dark:bg-zinc-950/5 border border-slate-100 dark:border-zinc-850 p-5">
                  <h3 className="font-mono text-2xs uppercase tracking-widest text-slate-500 dark:text-zinc-400 font-bold mb-2">
                    Competitive Position & Moat Strength
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
                    {researchResult.findings.competitive_position}
                  </p>
                </section>

                {/* Section D: Financial Health summary */}
                <section className="bg-slate-50/20 dark:bg-zinc-950/5 border border-slate-100 dark:border-zinc-850 p-5">
                  <h3 className="font-mono text-2xs uppercase tracking-widest text-slate-500 dark:text-zinc-400 font-bold mb-2">
                    Financial Performance & Revenue Profiles
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
                    {researchResult.findings.financial_health}
                  </p>
                </section>

                {/* Section E: Opps and Risks details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Opportunities list */}
                  <div>
                    <h4 className="font-mono text-3xs uppercase tracking-widest text-slate-500 dark:text-zinc-400 font-bold mb-2.5">
                      Strategic Catalysts
                    </h4>
                    <ul className="space-y-2">
                      {researchResult.verdict.key_opportunities.map((opp, idx) => (
                        <li key={`opp-${idx}`} className="text-2xs leading-relaxed flex items-start gap-2 text-slate-600 dark:text-zinc-400">
                          <span className="font-mono font-bold text-slate-400 shrink-0">+{idx+1}</span>
                          <span>{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Key Risks list */}
                  <div>
                    <h4 className="font-mono text-3xs uppercase tracking-widest text-slate-500 dark:text-zinc-400 font-bold mb-2.5">
                      Derailing Headwinds
                    </h4>
                    <ul className="space-y-2">
                      {researchResult.verdict.key_risks.map((risk, idx) => (
                        <li key={`vrisk-${idx}`} className="text-2xs leading-relaxed flex items-start gap-2 text-slate-600 dark:text-zinc-400">
                          <span className="font-mono font-bold text-slate-400 shrink-0">-{idx+1}</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* Citations / Links */}
                {researchResult.findings.sources && researchResult.findings.sources.length > 0 && (
                  <section className="pt-6 border-t border-slate-100 dark:border-zinc-800">
                    <h3 className="font-mono text-3xs uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-bold mb-3">
                      Retrieved References ({researchResult.findings.sources.length} sources)
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {researchResult.findings.sources.map((url, idx) => {
                        let domain = 'Source';
                        try {
                          domain = new URL(url).hostname.replace('www.', '');
                        } catch (e) {}

                        return (
                          <a
                            key={`source-${idx}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-750 text-3xs font-mono text-slate-600 dark:text-zinc-400 border border-slate-200/50 dark:border-zinc-700/50 rounded-sm hover:underline cursor-pointer"
                          >
                            <span>{domain}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  </section>
                )}

              </div>
            </article>
          )}

        </main>
      </div>

    </div>
  );
}
