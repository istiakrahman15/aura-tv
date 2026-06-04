/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Tv, Heart, History, Search, Radio, Compass, 
  HelpCircle, Monitor, ChevronRight, X, Sparkles
} from 'lucide-react';
import { Channel } from '../data/channels';

interface SidebarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  favoritesCount: number;
  recentlyCount: number;
  totalCount: number;
  onClearFilters: () => void;
}

export default function Sidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onChangeSearchQuery,
  favoritesCount,
  recentlyCount,
  totalCount,
  onClearFilters
}: SidebarProps) {
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [installState, setInstallState] = useState<'prompt' | 'installing' | 'complete'>('prompt');

  const handleMockInstall = () => {
    setInstallState('installing');
    setTimeout(() => {
      setInstallState('complete');
      setTimeout(() => {
        setShowInstallBanner(false);
      }, 1500);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white/5 border-r border-white/5 p-5 gap-6 select-none font-sans overflow-y-auto backdrop-blur-xl">
      {/* Platform Branding */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-5">
        <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/20 text-black flex items-center justify-center">
          <Tv className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg font-display tracking-tight leading-none">
            AeroStream
          </h1>
          <span className="text-[10px] text-blue-400 font-mono tracking-wider uppercase mt-1 inline-block">
            Pro IPTV v4.2
          </span>
        </div>
      </div>

      {/* Global Channel counter widget */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-white/50">Database Stations</span>
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-mono border border-blue-500/20">
            ACTIVE
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold text-white font-display">
            {totalCount}
          </span>
          <span className="text-xs text-white/40">Live Feeds</span>
        </div>
      </div>

      {/* Search Input Widget */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold tracking-wider text-white/40 uppercase font-sans">
          Find broadcast
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 focus:border-blue-500/80 focus:bg-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => onChangeSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 text-white/60 hover:text-white rounded"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Shortcut links */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold tracking-wider text-white/40 uppercase mb-2">
          Dashboard Tabs
        </span>

        {/* Home Overview */}
        <button
          onClick={onClearFilters}
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-sm border ${
            selectedCategory === 'ALL' && !searchQuery
              ? 'bg-blue-500/20 border-blue-500/30 text-blue-400 font-bold shadow-lg shadow-blue-500/5'
              : 'text-white/60 hover:text-white hover:bg-white/5 border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <Compass className="w-4 h-4" />
            <span>Discover Home</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </button>

        {/* Saved Favorites Shortcut */}
        <button
          onClick={() => onSelectCategory('FAVORITES')}
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-sm border ${
            selectedCategory === 'FAVORITES'
              ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 font-bold shadow-lg shadow-amber-500/5'
              : 'text-white/60 hover:text-white hover:bg-white/5 border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <Heart className="w-4 h-4" />
            <span>Starred Favorites</span>
          </div>
          <span className="text-xs px-2 py-0.5 bg-white/5 border border-white/10 text-white/50 rounded-lg">
            {favoritesCount}
          </span>
        </button>

        {/* Recently Watched */}
        <button
          onClick={() => onSelectCategory('RECENT')}
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-sm border ${
            selectedCategory === 'RECENT'
              ? 'bg-purple-500/20 border-purple-500/30 text-purple-400 font-bold shadow-lg shadow-purple-500/5'
              : 'text-white/60 hover:text-white hover:bg-white/5 border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <History className="w-4 h-4" />
            <span>Continue Watching</span>
          </div>
          <span className="text-xs px-2 py-0.5 bg-white/5 border border-white/10 text-white/50 rounded-lg">
            {recentlyCount}
          </span>
        </button>
      </div>

      {/* Categories filter menu */}
      <div className="flex flex-col gap-1 flex-1">
        <span className="text-[11px] font-bold tracking-wider text-white/40 uppercase mb-2">
          HLS Media Categories
        </span>
        <div className="space-y-1 pr-1 max-h-[300px] overflow-y-auto custom-scrollbar">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg border transition-all truncate text-left ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 font-bold font-mono'
                    : 'text-white/60 hover:text-white hover:bg-white/5 hover:border-white/10 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-blue-400 animate-pulse' : 'bg-white/20'}`} />
                  <span className="truncate">{cat}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PWA Mock Install Box */}
      {showInstallBanner && (
        <div className="relative p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3 backdrop-blur-md shadow-xl overflow-hidden mt-auto">
          {/* Subtle decoration */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 blur-xl rounded-full" />
          
          <button 
            onClick={() => setShowInstallBanner(false)}
            className="absolute top-2.5 right-2.5 p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-start gap-2.5">
            <Monitor className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-white text-xs font-bold font-sans">
                Setup AeroStream TV App
              </h4>
              <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed font-sans">
                Install as standalone app with background streaming and optimized picture-in-picture.
              </p>
            </div>
          </div>

          <button
            onClick={handleMockInstall}
            disabled={installState !== 'prompt'}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-medium text-xs font-sans text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:bg-white/5 disabled:border-white/5 disabled:text-white/40 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {installState === 'prompt' && (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Install App (PWA)
              </>
            )}
            {installState === 'installing' && (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                Provisioning PWA...
              </>
            )}
            {installState === 'complete' && "Successfully Installed!"}
          </button>
        </div>
      )}
    </div>
  );
}
