'use client';

import React from 'react';
import { useAuth } from './AuthContext';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';

export default function Header() {
  const { user, signOutUser } = useAuth();

  if (!user) return null;

  return (
    <header className="border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand/Desk Title */}
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-slate-700 dark:text-zinc-300 stroke-[1.5]" />
          <div>
            <span className="font-serif font-bold text-lg tracking-tight uppercase">AEGIS</span>
            <span className="text-xs uppercase tracking-widest text-slate-500 dark:text-zinc-400 font-mono ml-2">Equity Research</span>
          </div>
        </div>

        {/* User profile & Actions */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Analyst'}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-zinc-700 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
              </div>
            )}
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">
                {user.displayName || user.email || 'Analyst'}
              </p>
              <p className="text-2xs uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-mono">
                Principal Researcher
              </p>
            </div>
          </div>

          <button
            onClick={() => signOutUser()}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/50 rounded-md transition-all text-xs font-medium text-slate-600 dark:text-zinc-400 cursor-pointer"
            title="Sign out of system"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
