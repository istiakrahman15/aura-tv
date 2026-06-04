/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Menu, Search, Radio, User, Bell, ChevronDown } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  favoritesCount: number;
}

export default function Header({
  onToggleSidebar,
  searchQuery,
  onChangeSearchQuery,
  favoritesCount
}: HeaderProps) {
  return (
    <header className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between backdrop-blur-md z-30 select-none">
      {/* Left side Menu Toggle for smaller viewports */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 rounded-xl lg:hidden text-white/70 transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Streaming Platform indicator with Live counter */}
        <div className="hidden sm:flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
          </span>
          <span className="text-white text-sm font-bold tracking-tight font-display">
            AEROSTREAM <span className="text-blue-400">DASHBOARD</span>
          </span>
        </div>
      </div>

      {/* Center Search bar for larger viewports */}
      <div className="hidden md:flex items-center gap-2 max-w-sm w-full mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search channels, genres, categories..."
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/10 focus:border-blue-500/80 rounded-full text-xs text-white placeholder-white/40 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Right Side User Profile + Settings widgets */}
      <div className="flex items-center gap-3">
        {/* Live Network Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md text-[10px] font-mono text-blue-400">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 block animate-pulse" />
          CDN CONNECTION ACTIVE
        </div>

        {/* Notifications and bells */}
        <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white rounded-xl transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full" />
        </button>

        {/* User Account badge with avatar initials */}
        <div className="flex items-center gap-2 pl-3 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-500/20">
            IR
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-white text-xs font-semibold leading-none">Istiak Rahman</span>
            <span className="text-[9px] text-white/50 leading-none mt-1">Premium VIP Account</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-white/40 hidden sm:block" />
        </div>
      </div>
    </header>
  );
}
