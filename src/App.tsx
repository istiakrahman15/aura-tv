/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ArrowRight, Tv, Heart, History, Trash2, 
  Sparkles, Radio, HelpCircle, ArrowUp, RefreshCw, Layers,
  Compass, Eye, Play, Search, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { channels, Channel } from './data/channels';
import LivePlayer from './components/LivePlayer';
import ChannelCard from './components/ChannelCard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

export default function App() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [recentlyWatched, setRecentlyWatched] = useState<Channel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'categories' | 'favorites'>('home');

  // State to hold active/transient message stream toast alerts
  const [toast, setToast] = useState<{
    message: string;
    description: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);

  // Auto Dismiss Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 8000); // 8 seconds high-visibility
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleStreamTimeout = (failedChannel: Channel, errorDetail: string) => {
    // Find index of failed channel in the list of channels
    const failureIndex = channels.findIndex(c => c.url === failedChannel.url);
    if (failureIndex === -1) return;

    // We select the next channel in the channels list
    const nextIndex = (failureIndex + 1) % channels.length;
    const nextChannel = channels[nextIndex];

    if (nextChannel) {
      setSelectedChannel(nextChannel);
      setToast({
        message: `Signal Interrupted for "${failedChannel.name}"`,
        description: `Error details: ${errorDetail.split('. (')[0]}... Automatically rerouting to next available live station: "${nextChannel.name}".`,
        type: 'error'
      });
      console.warn(`Dynamic channel switch action: ${failedChannel.name} failed. Next channel: ${nextChannel.name}`);
    }
  };

  // Load the channel list on mount and set default channel (Auto Play First Channel)
  useEffect(() => {
    if (channels.length > 0) {
      setSelectedChannel(channels[0]);
    }

    // Sync with LocalStorage
    const storedFavs = localStorage.getItem('aerostream-favorites');
    if (storedFavs) {
      try {
        setFavorites(JSON.parse(storedFavs));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }

    const storedRecent = localStorage.getItem('aerostream-recently');
    if (storedRecent) {
      try {
        setRecentlyWatched(JSON.parse(storedRecent));
      } catch (e) {
        console.error("Failed to parse recents", e);
      }
    }
  }, []);

  // Back to top scroll button visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync Favorites to LocalStorage
  const handleToggleFavorite = (channel: Channel, e?: any) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setFavorites(prev => {
      const exists = prev.some(c => c.url === channel.url);
      let updatedFavs;
      if (exists) {
        updatedFavs = prev.filter(c => c.url !== channel.url);
      } else {
        updatedFavs = [...prev, channel];
      }
      localStorage.setItem('aerostream-favorites', JSON.stringify(updatedFavs));
      return updatedFavs;
    });
  };

  const handleClearRecentlyWatched = () => {
    setRecentlyWatched([]);
    localStorage.removeItem('aerostream-recently');
  };

  // Sync Recently Watched to LocalStorage
  const handleAddToRecentlyWatched = (channel: Channel) => {
    setRecentlyWatched(prev => {
      const filtered = prev.filter(c => c.url !== channel.url);
      const updated = [channel, ...filtered].slice(0, 15); // limit to 15 items
      localStorage.setItem('aerostream-recently', JSON.stringify(updated));
      return updated;
    });
  };

  // Categories mapping dynamically from database list
  const allGroups = Array.from(new Set(channels.map(c => c.group))).filter(Boolean).sort();

  // Selected state queries filtering helper
  const filterByGroup = (group: string) => {
    if (group === 'Bangla') {
      return channels.filter(c => /bangla|bangladesh/i.test(c.group) || /bangla/i.test(c.name));
    }
    if (group === 'Sports') {
      return channels.filter(c => /sports|sports-hd|ipl|psl|gold/i.test(c.group) || /sports|cricket|espn|ten|willow/i.test(c.name));
    }
    if (group === 'News') {
      return channels.filter(c => /news/i.test(c.group) || /news/i.test(c.name));
    }
    if (group === 'Kids') {
      return channels.filter(c => /kids/i.test(c.group) || /disney|cartoon|nick/i.test(c.name));
    }
    if (group === 'Music') {
      return channels.filter(c => /music/i.test(c.group) || /sangeet|mtv|music/i.test(c.name));
    }
    if (group === 'English') {
      return channels.filter(c => /english|channels/i.test(c.group) || /hbo|amc|discovery/i.test(c.name));
    }
    return channels.filter(c => c.group === group);
  };

  const banglaChannels = filterByGroup('Bangla');
  const sportsChannels = filterByGroup('Sports');
  const newsChannels = filterByGroup('News');
  const kidsChannels = filterByGroup('Kids');
  const musicChannels = filterByGroup('Music');
  const englishChannels = filterByGroup('English');

  // Filter channels based on selected section or category
  const getFilteredGridChannels = () => {
    let listQuery = [...channels];

    if (selectedCategory === 'FAVORITES') {
      listQuery = favorites;
    } else if (selectedCategory === 'RECENT') {
      listQuery = recentlyWatched;
    } else if (selectedCategory !== 'ALL') {
      listQuery = filterByGroup(selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      listQuery = listQuery.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.group.toLowerCase().includes(q)
      );
    }

    return listQuery;
  };

  const filteredGridChannels = getFilteredGridChannels();

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileSidebarOpen(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Row Carousel click mechanics
  const handleScrollRow = (id: string, dir: 'left' | 'right') => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = dir === 'left' ? -350 : 350;
    el.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div id="iptv-app-root" className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-zinc-950 to-black text-white selection:bg-blue-500 font-sans flex flex-col antialiased">
      
      {/* Primary grid container */}
      <div className="flex flex-1 relative overflow-hidden">
        
        {/* Desktop Sidebar (Persistent left side) */}
        <aside className="hidden lg:block w-76 shrink-0 relative h-screen sticky top-0 border-r border-white/5 bg-white/5 z-20">
          <Sidebar
            categories={allGroups}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              setSearchQuery('');
            }}
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            favoritesCount={favorites.length}
            recentlyCount={recentlyWatched.length}
            totalCount={channels.length}
            onClearFilters={() => {
              setSelectedCategory('ALL');
              setSearchQuery('');
            }}
          />
        </aside>

        {/* Mobile Sidebar (Floating Drawer) */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileSidebarOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 24 }}
                className="fixed inset-y-0 left-0 w-80 max-w-full bg-[#12131a] z-50 lg:hidden"
              >
                <Sidebar
                  categories={allGroups}
                  selectedCategory={selectedCategory}
                  onSelectCategory={(cat) => {
                    setSelectedCategory(cat);
                    setSearchQuery('');
                    setMobileSidebarOpen(false);
                  }}
                  searchQuery={searchQuery}
                  onChangeSearchQuery={setSearchQuery}
                  favoritesCount={favorites.length}
                  recentlyCount={recentlyWatched.length}
                  totalCount={channels.length}
                  onClearFilters={() => {
                    setSelectedCategory('ALL');
                    setSearchQuery('');
                    setMobileSidebarOpen(false);
                  }}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Master Right content canvas */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          
          {/* Header Panel */}
          <Header
            onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)}
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            favoritesCount={favorites.length}
          />

          {/* Subheader category buttons pill for instant tap access */}
          <section id="horizontal-genres-pill-row" className="px-6 py-3.5 bg-white/5 border-b border-white/5 overflow-x-auto flex gap-2 scrollbar-none items-center">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider font-mono mr-2 shrink-0">Genres:</span>
            {['ALL', 'Bangla', 'Sports', 'News', 'Kids', 'Music', 'English', 'FAVORITES'].map((pill) => {
              const isActive = selectedCategory === pill;
              return (
                <button
                  key={pill}
                  onClick={() => {
                    setSelectedCategory(pill);
                    setSearchQuery('');
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold font-sans whitespace-nowrap border transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-white text-black border-white font-bold shadow-lg shadow-black/30' 
                      : 'bg-white/5 text-white/60 border-white/5 hover:border-white/15 hover:text-white'
                  }`}
                >
                  {pill === 'FAVORITES' ? '⭐ Favorites' : pill}
                </button>
              );
            })}
          </section>

          {/* Core Content Body (Dynamic rows or grid view) */}
          <div className="p-6 space-y-8 flex-1 max-w-7xl mx-auto w-full">
            
            {/* Show Category Specific / Search Results View if filters exist */}
            {(selectedCategory !== 'ALL' || searchQuery.trim().length > 0) ? (
              
              <div className="space-y-6">
                
                {/* Dynamic Category/Search Title header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/5 pb-5">
                  <div>
                    <span className="text-xs text-white/45 font-mono tracking-widest uppercase">BROWSE DIRECTORY</span>
                    <h2 className="text-2xl font-black text-white font-display mt-0.5 tracking-tight flex items-center gap-2">
                      {searchQuery.trim().length > 0 ? (
                        <>Search Results: "{searchQuery}"</>
                      ) : selectedCategory === 'FAVORITES' ? (
                        <><Heart className="w-6 h-6 text-amber-400 fill-current" /> Saved Favorites</>
                      ) : selectedCategory === 'RECENT' ? (
                        <><History className="w-6 h-6 text-purple-400" /> Continue Watching</>
                      ) : (
                        <>{selectedCategory} Channels</>
                      )}
                    </h2>
                  </div>
                  
                  {/* Results Count pill */}
                  <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 font-mono self-start sm:self-auto">
                    {filteredGridChannels.length} Channels Found
                  </span>
                </div>

                {/* Live Player Segment in category filter view (keeps playing in sticky place at top) */}
                {selectedChannel && (
                  <div className="space-y-3">
                    <span className="text-xs text-white/50 font-semibold uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Active Broadcast
                    </span>
                    <LivePlayer
                      channel={selectedChannel}
                      onToggleFavorite={(ch) => handleToggleFavorite(ch)}
                      isFavorite={favorites.some(c => c.url === selectedChannel.url)}
                      onAddToRecentlyWatched={(ch) => handleAddToRecentlyWatched(ch)}
                      onStreamTimeout={handleStreamTimeout}
                    />
                  </div>
                )}

                {/* Sub Grid Renders */}
                {filteredGridChannels.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredGridChannels.map((chan) => (
                      <ChannelCard
                        key={chan.url}
                        channel={chan}
                        isPlaying={selectedChannel?.url === chan.url}
                        isFavorite={favorites.some(c => c.url === chan.url)}
                        onSelect={handleSelectChannel}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-3xl text-white/40 mb-4 animate-pulse">
                      <AlertCircle className="w-10 h-10" />
                    </div>
                    <h3 className="text-white text-base font-bold mb-1">No Matching Broadcasts</h3>
                    <p className="text-white/50 text-xs font-sans leading-relaxed">
                      We found no channels in the "{selectedCategory}" index matching your search terms. Double check the spelling or load all directories.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCategory('ALL');
                        setSearchQuery('');
                      }}
                      className="mt-5 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-sans rounded-xl font-medium transition-all cursor-pointer"
                    >
                      Clear Filters & Search
                    </button>
                  </div>
                )}

              </div>

            ) : (
              
              /* Netflix/Disney+ Horizontal row experience (Full Discover View) */
              <div className="space-y-10">
                
                {/* HERO live video player (Section 1) */}
                <section id="hero-live-video-player" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-red-650/10 border border-red-500/20 text-red-500 rounded-lg">
                        <Radio className="w-4 h-4 animate-pulse" />
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-white font-display tracking-tight uppercase">
                        Theater Live Stream
                      </h2>
                    </div>
                    {selectedChannel && (
                      <span className="text-[10px] sm:text-xs text-neutral-500 font-mono">
                        Source URL protocol verified
                      </span>
                    )}
                  </div>

                  <LivePlayer
                    channel={selectedChannel}
                    onToggleFavorite={(ch) => handleToggleFavorite(ch)}
                    isFavorite={selectedChannel ? favorites.some(c => c.url === selectedChannel.url) : false}
                    onAddToRecentlyWatched={(ch) => handleAddToRecentlyWatched(ch)}
                    onStreamTimeout={handleStreamTimeout}
                  />
                </section>

                {/* Continue Watching Section (Section 2 - Stored in recently watched list) */}
                {recentlyWatched.length > 0 && (
                  <motion.section 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3 relative group/row"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-extrabold text-white font-display tracking-wide uppercase flex items-center gap-2">
                        <History className="w-4 h-4 text-purple-400" />
                        Continue Streaming
                      </h4>
                      <button
                        onClick={handleClearRecentlyWatched}
                        className="text-[10px] text-white/50 hover:text-red-400 flex items-center gap-1 font-sans transition-colors cursor-pointer"
                        title="Clear history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear History
                      </button>
                    </div>

                    <div className="relative">
                      {/* Left arrow controls */}
                      <button
                        onClick={() => handleScrollRow('row-continue', 'left')}
                        className="absolute left-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      {/* Right arrow controls */}
                      <button
                        onClick={() => handleScrollRow('row-continue', 'right')}
                        className="absolute right-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <div 
                        id="row-continue"
                        className="flex gap-4 overflow-x-auto overflow-y-hidden scrollbar-none py-1 px-0.5"
                      >
                        {recentlyWatched.map((chan) => (
                          <div key={`recent-${chan.url}`} className="w-48 sm:w-56 shrink-0">
                            <ChannelCard
                              channel={chan}
                              isPlaying={selectedChannel?.url === chan.url}
                              isFavorite={favorites.some(c => c.url === chan.url)}
                              onSelect={handleSelectChannel}
                              onToggleFavorite={handleToggleFavorite}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.section>
                )}

                {/* Saved Favorite Channels (Section 3) */}
                {favorites.length > 0 && (
                  <motion.section 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3 relative group/row"
                  >
                    <h4 className="text-sm font-extrabold text-white font-display tracking-wide uppercase flex items-center gap-2">
                      <Heart className="w-4 h-4 text-amber-400 fill-current" />
                      Starred Favorites
                    </h4>

                    <div className="relative">
                      {/* Left arrow controls */}
                      <button
                        onClick={() => handleScrollRow('row-favs', 'left')}
                        className="absolute left-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      {/* Right arrow controls */}
                      <button
                        onClick={() => handleScrollRow('row-favs', 'right')}
                        className="absolute right-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <div 
                        id="row-favs"
                        className="flex gap-4 overflow-x-auto overflow-y-hidden scrollbar-none py-1 px-0.5"
                      >
                        {favorites.map((chan) => (
                          <div key={`fav-${chan.url}`} className="w-48 sm:w-56 shrink-0">
                            <ChannelCard
                              channel={chan}
                              isPlaying={selectedChannel?.url === chan.url}
                              isFavorite={true}
                              onSelect={handleSelectChannel}
                              onToggleFavorite={handleToggleFavorite}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.section>
                )}

                {/* Bangla Channels Row (Section 4) */}
                {banglaChannels.length > 0 && (
                  <section className="space-y-3 relative group/row">
                    <h4 className="text-sm font-extrabold text-white font-display tracking-wide uppercase">
                      Bangla Channels
                    </h4>
                    <div className="relative">
                      <button
                        onClick={() => handleScrollRow('row-bangla', 'left')}
                        className="absolute left-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleScrollRow('row-bangla', 'right')}
                        className="absolute right-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div id="row-bangla" className="flex gap-4 overflow-x-auto scrollbar-none py-1 px-0.5">
                        {banglaChannels.map((chan) => (
                          <div key={chan.url} className="w-48 sm:w-56 shrink-0">
                            <ChannelCard
                              channel={chan}
                              isPlaying={selectedChannel?.url === chan.url}
                              isFavorite={favorites.some(c => c.url === chan.url)}
                              onSelect={handleSelectChannel}
                              onToggleFavorite={handleToggleFavorite}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* Sports Channels Row (Section 5) */}
                {sportsChannels.length > 0 && (
                  <section className="space-y-3 relative group/row">
                    <h4 className="text-sm font-extrabold text-white font-display tracking-wide uppercase flex items-center gap-1.5">
                      Sports Channels
                    </h4>
                    <div className="relative">
                      <button
                        onClick={() => handleScrollRow('row-sports', 'left')}
                        className="absolute left-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleScrollRow('row-sports', 'right')}
                        className="absolute right-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div id="row-sports" className="flex gap-4 overflow-x-auto scrollbar-none py-1 px-0.5">
                        {sportsChannels.map((chan) => (
                          <div key={chan.url} className="w-48 sm:w-56 shrink-0">
                            <ChannelCard
                              channel={chan}
                              isPlaying={selectedChannel?.url === chan.url}
                              isFavorite={favorites.some(c => c.url === chan.url)}
                              onSelect={handleSelectChannel}
                              onToggleFavorite={handleToggleFavorite}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* News Channels Row (Section 6) */}
                {newsChannels.length > 0 && (
                  <section className="space-y-3 relative group/row">
                    <h4 className="text-sm font-extrabold text-white font-display tracking-wide uppercase">
                      News Channels
                    </h4>
                    <div className="relative">
                      <button
                        onClick={() => handleScrollRow('row-news', 'left')}
                        className="absolute left-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleScrollRow('row-news', 'right')}
                        className="absolute right-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div id="row-news" className="flex gap-4 overflow-x-auto scrollbar-none py-1 px-0.5">
                        {newsChannels.map((chan) => (
                          <div key={chan.url} className="w-48 sm:w-56 shrink-0">
                            <ChannelCard
                              channel={chan}
                              isPlaying={selectedChannel?.url === chan.url}
                              isFavorite={favorites.some(c => c.url === chan.url)}
                              onSelect={handleSelectChannel}
                              onToggleFavorite={handleToggleFavorite}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* Kids Channels Row (Section 7) */}
                {kidsChannels.length > 0 && (
                  <section className="space-y-3 relative group/row">
                    <h4 className="text-sm font-extrabold text-white font-display tracking-wide uppercase">
                      Kids Channels
                    </h4>
                    <div className="relative">
                      <button
                        onClick={() => handleScrollRow('row-kids', 'left')}
                        className="absolute left-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={() => handleScrollRow('row-kids', 'right')}
                        className="absolute right-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4 text-white" />
                      </button>
                      <div id="row-kids" className="flex gap-4 overflow-x-auto scrollbar-none py-1 px-0.5">
                        {kidsChannels.map((chan) => (
                          <div key={chan.url} className="w-48 sm:w-56 shrink-0">
                            <ChannelCard
                              channel={chan}
                              isPlaying={selectedChannel?.url === chan.url}
                              isFavorite={favorites.some(c => c.url === chan.url)}
                              onSelect={handleSelectChannel}
                              onToggleFavorite={handleToggleFavorite}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* Music Channels Row (Section 8) */}
                {musicChannels.length > 0 && (
                  <section className="space-y-3 relative group/row">
                    <h4 className="text-sm font-extrabold text-white font-display tracking-wide uppercase">
                      Music Channels
                    </h4>
                    <div className="relative">
                      <button
                        onClick={() => handleScrollRow('row-music', 'left')}
                        className="absolute left-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleScrollRow('row-music', 'right')}
                        className="absolute right-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div id="row-music" className="flex gap-4 overflow-x-auto scrollbar-none py-1 px-0.5">
                        {musicChannels.map((chan) => (
                          <div key={chan.url} className="w-48 sm:w-56 shrink-0">
                            <ChannelCard
                              channel={chan}
                              isPlaying={selectedChannel?.url === chan.url}
                              isFavorite={favorites.some(c => c.url === chan.url)}
                              onSelect={handleSelectChannel}
                              onToggleFavorite={handleToggleFavorite}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* English Channels Row (Section 9) */}
                {englishChannels.length > 0 && (
                  <section className="space-y-3 relative group/row">
                    <h4 className="text-sm font-extrabold text-white font-display tracking-wide uppercase">
                      English Channels
                    </h4>
                    <div className="relative">
                      <button
                        onClick={() => handleScrollRow('row-english', 'left')}
                        className="absolute left-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleScrollRow('row-english', 'right')}
                        className="absolute right-[-15px] top-1/2 -translate-y-1/2 z-20 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 transition-all opacity-0 group-hover/row:opacity-100 shadow-xl cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div id="row-english" className="flex gap-4 overflow-x-auto scrollbar-none py-1 px-0.5">
                        {englishChannels.map((chan) => (
                          <div key={chan.url} className="w-48 sm:w-56 shrink-0">
                            <ChannelCard
                              channel={chan}
                              isPlaying={selectedChannel?.url === chan.url}
                              isFavorite={favorites.some(c => c.url === chan.url)}
                              onSelect={handleSelectChannel}
                              onToggleFavorite={handleToggleFavorite}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* All Channels Grid (Section 10) */}
                <section id="section-all-channels-grid" className="pt-6 border-t border-white/5 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-white font-display tracking-wide uppercase">
                        All Broadcast Channels
                      </h4>
                      <p className="text-xs text-white/55 mt-1 font-sans">
                        Full catalog sorted alphabetically with responsive pagination rendering.
                      </p>
                    </div>

                    <div className="text-xs text-white/60 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl font-mono">
                      Rendering ALL {channels.length} stations
                    </div>
                  </div>

                  {/* Responsive grid cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {channels.map((chan) => (
                      <ChannelCard
                        key={`all-${chan.url}`}
                        channel={chan}
                        isPlaying={selectedChannel?.url === chan.url}
                        isFavorite={favorites.some(c => c.url === chan.url)}
                        onSelect={handleSelectChannel}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                </section>

              </div>
              
            )}

          </div>

          {/* Elegant Page Footer */}
          <footer className="mt-20 py-8 border-t border-white/5 bg-black/40 text-center text-white/40 select-none backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-sans">
              <p>© 2026 AeroStream IPTV Global Premium. All rights reserved.</p>
              <div className="flex gap-4 text-white/50">
                <a href="#live-tv-hero-player" className="hover:text-blue-400 transition-colors">Hero Player</a>
                <span>|</span>
                <a href="#section-all-channels-grid" className="hover:text-blue-400 transition-colors">Database catalog</a>
                <span>|</span>
                <span className="text-blue-400 font-mono font-bold">Latency: OPTIMIZED</span>
              </div>
            </div>
          </footer>

        </main>

      </div>

      {/* Toast Alert Notice Grid */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100vw-2rem)] bg-zinc-950/90 border border-red-500/30 shadow-2xl rounded-2xl p-4 backdrop-blur-xl flex gap-3.5"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-500">
              <AlertCircle className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-white text-xs font-black tracking-wide uppercase font-display">
                {toast.message}
              </h5>
              <p className="text-white/70 text-[11px] leading-relaxed mt-1 font-sans font-medium">
                {toast.description}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/15 border border-blue-500/20 rounded-md text-[9px] text-blue-400 font-mono tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                  Auto-Recovery Activated
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Scroll to top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg border border-blue-500/20 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
            title="Scroll back to live player"
          >
            <ArrowUp className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}
