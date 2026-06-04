/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Heart, Play, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { Channel } from '../data/channels';

interface ChannelCardProps {
  key?: React.Key | string;
  channel: Channel;
  isPlaying: boolean;
  isFavorite: boolean;
  onSelect: (channel: Channel) => void;
  onToggleFavorite: (channel: Channel, e?: any) => void;
}

export default function ChannelCard({
  channel,
  isPlaying,
  isFavorite,
  onSelect,
  onToggleFavorite
}: ChannelCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={() => onSelect(channel)}
      className={`relative group flex flex-col justify-between bg-white/5 hover:bg-white/10 border rounded-2xl p-4 cursor-pointer transition-all duration-300 backdrop-blur-md overflow-hidden ${
        isPlaying 
          ? 'border-blue-500/85 shadow-[0_0_20px_rgba(59,130,246,0.25)] bg-blue-550/15' 
          : 'border-white/5 hover:border-white/25 hover:shadow-2xl hover:shadow-black/50'
      }`}
    >
      {/* Active Glowing Border light */}
      {isPlaying && (
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-600 to-indigo-500" />
      )}

      {/* Decorative Radial Backdrop Flare on Hover */}
      <div className="absolute -inset-px bg-radial-gradient from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-500" />

      {/* Card Header: Channel Logo + Favorite Action */}
      <div className="flex justify-between items-start gap-2 relative z-10 w-full mb-4">
        {/* Live Pulse Dot */}
        <span className="flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full border border-red-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </span>

        {/* Favorite Icon */}
        <button
          onClick={(e) => onToggleFavorite(channel, e)}
          className={`p-1.5 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 transition-all ${
            isFavorite ? 'text-amber-400 scale-105' : 'text-white/40 hover:text-white'
          }`}
          title={isFavorite ? "Remove from Favorites" : "Save to Favorites"}
        >
          <Heart className={`w-4.5 h-4.5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Card Center: Large High-Resolution Channel Logo */}
      <div className="h-20 sm:h-24 w-full flex items-center justify-center relative z-10 p-2 overflow-hidden mb-3 bg-white/5 rounded-xl border border-white/5">
        <img
          src={channel.logo || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100"}
          onError={(e) => {
            // High efficiency semantic avatar initials on load error
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=1e293b&color=3b82f6&bold=true&font-size=0.33`;
          }}
          alt={channel.name}
          loading="lazy"
          className="max-h-full max-w-full object-contain filter group-hover:scale-105 transition-transform duration-500"
        />

        {/* Elegant Play Button Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 rounded-xl backdrop-blur-[2px]">
          <div className="p-3 bg-blue-600 text-white rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Card Footer: Metadata and details */}
      <div className="relative z-10 w-full">
        <h3 className="text-white text-sm font-bold tracking-tight font-display truncate group-hover:text-blue-400 transition-colors">
          {channel.name}
        </h3>
        
        <div className="flex items-center justify-between mt-1 w-full gap-1">
          <span className="text-[10px] text-white/55 font-sans truncate">
            {channel.group || 'General'}
          </span>
          
          {isPlaying && (
            <span className="text-[10px] text-blue-400 flex items-center gap-1 font-mono font-bold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              PLAYING
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
