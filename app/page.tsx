'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Shield, Sparkles, Database, Search, ArrowRight, X, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, token, loading, signInWithGoogle } = useAuth();
  
  // Auth modal states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Auto-redirect if already signed in
  useEffect(() => {
    if (!loading && user && token) {
      router.push('/analyze');
    }
  }, [user, token, loading, router]);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      await signInWithGoogle();
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setAuthError(err.message || 'Google authentication failed.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) {
      setAuthError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error('Email auth failed:', err);
      let message = 'Authentication failed.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Invalid email address format.';
      }
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#faf9f6] dark:bg-[#0f1115]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-800 dark:border-zinc-700 dark:border-t-zinc-300 rounded-full animate-spin"></div>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500 dark:text-zinc-400">Loading Aegis Systems...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#faf9f6] dark:bg-[#0f1115] text-[#1c1d1f] dark:text-[#eef1f5] transition-colors duration-300 min-h-screen selection:bg-slate-800 selection:text-white dark:selection:bg-zinc-200 dark:selection:text-black">
      
      {/* Editorial Navigation */}
      <nav className="border-b border-slate-200/80 dark:border-zinc-800/80 px-6 py-5 bg-white/35 dark:bg-zinc-900/10 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-slate-700 dark:text-zinc-300 stroke-[1.5]" />
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
              <span className="font-serif font-bold text-lg tracking-tight uppercase">AEGIS</span>
              <span className="text-3xs uppercase tracking-widest text-slate-500 dark:text-zinc-400 font-mono">Equity Research</span>
            </div>
          </div>
          <div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 border border-slate-900 dark:border-zinc-200 text-xs tracking-widest uppercase font-mono hover:bg-slate-900 hover:text-white dark:hover:bg-zinc-200 dark:hover:text-black transition-all duration-300 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 sm:py-24 flex flex-col items-center justify-center">
        
        {/* Title Tagline */}
        <div className="text-center max-w-3xl mb-12">
          <p className="text-2xs uppercase tracking-[0.3em] font-mono text-slate-500 dark:text-zinc-400 mb-4 animate-pulse">
            Autonomous Financial Intelligence
          </p>
          <h1 className="font-serif text-4xl sm:text-6xl font-normal leading-[1.1] tracking-tight mb-8">
            Decisions are hard.<br />
            Our research is conclusive.
          </h1>
          <p className="font-sans text-base sm:text-lg leading-relaxed text-slate-600 dark:text-zinc-400 max-w-xl mx-auto mb-10">
            Submit any company name. Aegis activates a multi-channel web research agent, evaluates industry trends, and returns a verified Invest or Pass verdict.
          </p>

          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="group px-6 py-4.5 bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-950 text-xs tracking-widest uppercase font-mono hover:scale-102 hover:shadow-lg dark:hover:shadow-zinc-950 transition-all duration-300 flex items-center gap-3 mx-auto cursor-pointer"
          >
            <span>Activate Analyst Terminal</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Vintage Divider */}
        <div className="w-full flex items-center justify-center gap-4 my-16">
          <div className="h-px bg-slate-200 dark:bg-zinc-800 flex-1"></div>
          <div className="text-3xs uppercase tracking-widest font-mono text-slate-400 dark:text-zinc-600">
            Research Architecture
          </div>
          <div className="h-px bg-slate-200 dark:bg-zinc-800 flex-1"></div>
        </div>

        {/* How it works cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          
          {/* Step 1 */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-6 flex flex-col">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-mono text-xs font-semibold mb-6">
              01
            </div>
            <h3 className="font-serif font-medium text-base mb-2">Identify Entity</h3>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
              The agent resolves your query into its canonical legal entity, identifies its stock ticker, and locates its main web domain.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-6 flex flex-col">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-mono text-xs font-semibold mb-6">
              02
            </div>
            <h3 className="font-serif font-medium text-base mb-2">Parallel Search</h3>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
              Aegis launches five parallel streams scouring the web for news, revenues, financial performance, competitor share, risks, and leadership credibility.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-6 flex flex-col">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-mono text-xs font-semibold mb-6">
              03
            </div>
            <h3 className="font-serif font-medium text-base mb-2">Synthesize Findings</h3>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
              Claude Sonnet consolidates the unstructured inputs into structured findings outlining positive signals, red flags, moat details, and sources.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-6 flex flex-col">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-950 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-mono text-xs font-semibold mb-6">
              04
            </div>
            <h3 className="font-serif font-medium text-base mb-2">Deliver Verdict</h3>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
              Our investment framework compares risk and upside to stamp an Invest or Pass decision complete with bulleted rationales and confidence ratings.
            </p>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-zinc-800/80 py-10 px-6 bg-white/20 dark:bg-zinc-900/5 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-2xs font-mono text-slate-400 dark:text-zinc-500">
          <div>
            &copy; {new Date().getFullYear()} Aegis Systems Inc. Internal Research Terminal.
          </div>
          <div className="flex gap-6">
            <span>Security Standard 256-Bit</span>
            <span>REST API v1.0</span>
          </div>
        </div>
      </footer>

      {/* AUTHENTICATION MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#faf9f6] dark:bg-[#0f1115] border border-slate-350 dark:border-zinc-800 w-full max-w-md shadow-2xl relative transition-all animate-in fade-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setIsAuthModalOpen(false);
                setAuthError('');
              }}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Content */}
            <div className="p-8">
              <div className="text-center mb-6">
                <Shield className="w-10 h-10 mx-auto text-slate-700 dark:text-zinc-300 stroke-[1.2] mb-3" />
                <h2 className="font-serif text-2xl font-normal tracking-tight">Access Analyst Workspace</h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Sign in with credentials to invoke research agent</p>
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-md text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Primary Google Login Button */}
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-mono tracking-widest uppercase transition-all duration-300 shadow-sm cursor-pointer"
              >
                {/* Google SVG */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="h-px bg-slate-200 dark:bg-zinc-800 flex-1"></div>
                <span className="text-3xs uppercase tracking-widest font-mono text-slate-400 dark:text-zinc-600">or email credential</span>
                <div className="h-px bg-slate-200 dark:bg-zinc-800 flex-1"></div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="block text-3xs uppercase tracking-widest font-mono text-slate-400 dark:text-zinc-500 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                    <input
                      type="email"
                      required
                      placeholder="analyst@aegis.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs focus:ring-1 focus:ring-slate-800 dark:focus:ring-zinc-300 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-3xs uppercase tracking-widest font-mono text-slate-400 dark:text-zinc-500 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs focus:ring-1 focus:ring-slate-800 dark:focus:ring-zinc-300 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-950 text-xs font-mono tracking-widest uppercase hover:bg-slate-800 dark:hover:bg-zinc-200 transition-colors shadow-sm flex items-center justify-center cursor-pointer"
                >
                  {authLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-white dark:border-zinc-700 dark:border-t-zinc-900 rounded-full animate-spin"></div>
                  ) : authMode === 'signin' ? (
                    'Sign In'
                  ) : (
                    'Register Account'
                  )}
                </button>
              </form>

              {/* Mode Toggle */}
              <div className="text-center mt-6">
                <button
                  onClick={() => {
                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                    setAuthError('');
                  }}
                  className="text-2xs font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors underline decoration-dotted"
                >
                  {authMode === 'signin' ? "Create an account instead" : "Use existing account"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
