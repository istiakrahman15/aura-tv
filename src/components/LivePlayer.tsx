/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  RotateCcw, Activity, Info, Sparkles, AlertCircle, RefreshCw,
  Tv, Eye, Heart, List, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Channel } from '../data/channels';

interface LivePlayerProps {
  channel: Channel | null;
  onToggleFavorite: (channel: Channel) => void;
  isFavorite: boolean;
  onAddToRecentlyWatched: (channel: Channel) => void;
  onStreamTimeout?: (failedChannel: Channel, errorDetail: string) => void;
}

export default function LivePlayer({ 
  channel, 
  onToggleFavorite, 
  isFavorite,
  onAddToRecentlyWatched,
  onStreamTimeout
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isPip, setIsPip] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<{ id: number; name: string }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // Auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [latency, setLatency] = useState<number>(0);
  const [bufferedLength, setBufferedLength] = useState<number>(0);

  // Controls Auto-hide timer
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!channel) return;

    onAddToRecentlyWatched(channel);
    initializePlayer();

    return () => {
      destroyPlayer();
    };
  }, [channel]);

  // Handle auto-hide controls mouse actions
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowQualityMenu(false);
      }
    }, 4000);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Monitor buffering and media stats
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateStats = () => {
      if (video.buffered && video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration || 0;
        const current = video.currentTime;
        setBufferedLength(Math.max(0, Number((bufferedEnd - current).toFixed(1))));
      }
      
      // Approximate latency for HLS or standard stream
      if (hlsRef.current) {
        setLatency(Math.max(0, Number(hlsRef.current.latency.toFixed(1))));
      }
    };

    video.addEventListener('progress', updateStats);
    video.addEventListener('timeupdate', updateStats);

    return () => {
      video.removeEventListener('progress', updateStats);
      video.removeEventListener('timeupdate', updateStats);
    };
  }, [isLoading]);

  // Auto retry counter effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (retryCountdown > 0) {
      interval = setInterval(() => {
        setRetryCountdown(prev => {
          if (prev - 1 <= 0) {
            clearInterval(interval);
            initializePlayer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [retryCountdown]);

  // Keyboard Shortcuts Listening
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in any input element (such as search box)
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'p':
          // Picture in picture
          togglePictureInPicture();
          break;
        case 'arrowup':
          e.preventDefault();
          changeVolume(Math.min(1, volume + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          changeVolume(Math.max(0, volume - 0.1));
          break;
        case 'r':
          // Retry
          if (streamError) triggerRetry();
          break;
        case 'i':
          setShowInfoOverlay(prev => !prev);
          break;
        case 'h':
          setShowShortcutsHelp(prev => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [volume, isPlaying, streamError, channel]);

  const destroyPlayer = () => {
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
    setIsPlaying(false);
    setIsLoading(false);
    setQualityLevels([]);
    setStreamError(null);
  };

  const initializePlayer = () => {
    if (!channel) return;
    destroyPlayer();
    setIsLoading(true);
    setStreamError(null);

    const video = videoRef.current;
    if (!video) return;

    const streamUrl = channel.url;

    // Set 10 seconds timeout for stream connection
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
    }
    streamTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      const timeoutErrorMsg = `The live transmission from ${channel.name} did not load within 10 seconds. (URL: ${channel.url})`;
      setStreamError(timeoutErrorMsg);
      console.warn("Stream load timeout:", timeoutErrorMsg);
      destroyPlayer();
      if (onStreamTimeout) {
        onStreamTimeout(channel, timeoutErrorMsg);
      }
    }, 10000);

    // Use HLS.js for .m3u8 URLs unless on Native Safari (iOS/Mac) which plays natively
    if (Hls.isSupported() && !streamUrl.includes('youtube.com/')) {
      const hls = new Hls({
        maxMaxBufferLength: 30, // Optimized live queue buffer
        lowLatencyMode: true,
        backBufferLength: 30,
        enableWorker: true,
        xhrSetup: (xhr) => {
          xhr.timeout = 10000; // 10s segment load timeout
        }
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          if (streamTimeoutRef.current) {
            clearTimeout(streamTimeoutRef.current);
            streamTimeoutRef.current = null;
          }
          setIsLoading(false);
          setErrorCount(0);
          
          // Quality Tracks mapping
          const tracks = hls.levels.map((level, index) => ({
            id: index,
            name: level.height ? `${level.height}p` : `Track ${index + 1}`
          }));
          setQualityLevels(tracks);
          
          video.play()
            .then(() => setIsPlaying(true))
            .catch(() => {
              // Browser auto-play block handling
              setIsPlaying(false);
            });
        });
      });

      // Playback stream error handling
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error event:', data);
        
        if (data.fatal) {
          if (streamTimeoutRef.current) {
            clearTimeout(streamTimeoutRef.current);
            streamTimeoutRef.current = null;
          }
          setIsLoading(false);
          let exactErrorMsg = "";
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              exactErrorMsg = `HLS Network Error: Failed to retrieve segments. Detail: ${data.details}. Status code: ${((data.response as any)?.status || 'N/A')}`;
              setStreamError(exactErrorMsg);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              exactErrorMsg = `HLS Media Error: Failed to parse/decode media frame. Detail: ${data.details}`;
              setStreamError(exactErrorMsg);
              hls.recoverMediaError();
              break;
            default:
              exactErrorMsg = `HLS Fatal Error: type=${data.type}, detail=${data.details}. Support failed.`;
              setStreamError(exactErrorMsg);
              destroyPlayer();
              break;
          }
          autoRetrySchedule();
          if (onStreamTimeout) {
            onStreamTimeout(channel, exactErrorMsg);
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple device support (Safari / iOS)
      video.src = streamUrl;
      const onLoadedMetadata = () => {
        if (streamTimeoutRef.current) {
          clearTimeout(streamTimeoutRef.current);
          streamTimeoutRef.current = null;
        }
        setIsLoading(false);
        setErrorCount(0);
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            setIsPlaying(false);
          });
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
      };
      video.addEventListener('loadedmetadata', onLoadedMetadata);

      const onNativeError = () => {
        if (streamTimeoutRef.current) {
          clearTimeout(streamTimeoutRef.current);
          streamTimeoutRef.current = null;
        }
        setIsLoading(false);
        const detailedError = `Apple native decoder error loading source link: ${channel.url}`;
        setStreamError(detailedError);
        autoRetrySchedule();
        if (onStreamTimeout) {
          onStreamTimeout(channel, detailedError);
        }
        video.removeEventListener('error', onNativeError);
      };
      video.addEventListener('error', onNativeError);
    } else {
      // Non-HLS fallback or custom setup
      video.src = streamUrl;
      const onCanPlay = () => {
        if (streamTimeoutRef.current) {
          clearTimeout(streamTimeoutRef.current);
          streamTimeoutRef.current = null;
        }
        setIsLoading(false);
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
        video.removeEventListener('canplay', onCanPlay);
      };
      video.addEventListener('canplay', onCanPlay);

      const onFallbackError = () => {
        if (streamTimeoutRef.current) {
          clearTimeout(streamTimeoutRef.current);
          streamTimeoutRef.current = null;
        }
        setIsLoading(false);
        const errDetail = `Browser decoding failed for source: ${channel.url}`;
        setStreamError(errDetail);
        autoRetrySchedule();
        if (onStreamTimeout) {
          onStreamTimeout(channel, errDetail);
        }
        video.removeEventListener('error', onFallbackError);
      };
      video.addEventListener('error', onFallbackError);
    }
  };

  const autoRetrySchedule = () => {
    setErrorCount(prev => {
      const nextCount = prev + 1;
      if (nextCount <= 5) {
        setRetryCountdown(5); // Start a 5-second countdown to retry
      } else {
        setStreamError("Maximum livestream recovery attempts reached. Please choose another channel.");
      }
      return nextCount;
    });
  };

  const triggerRetry = () => {
    setRetryCountdown(0);
    initializePlayer();
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const changeVolume = (val: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
      video.muted = false;
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        setIsPip(true);
      }
    } catch {
      setIsPip(false);
    }
  };

  const selectQualityLevel = (id: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = id;
      setCurrentQuality(id);
    }
    setShowQualityMenu(false);
  };

  return (
    <div 
      id="live-tv-hero-player"
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 group/player select-none"
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain pointer-events-auto"
        onClick={togglePlay}
        playsInline
      />

      {/* Screen Backdrop Glow (Cinematic ambiance) */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/40 z-10" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-40 gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin w-16 h-16" />
            <div className="absolute rounded-full border-4 border-blue-800/10 w-16 h-16" />
            <Tv className="w-6 h-6 text-blue-500 animate-pulse" />
          </div>
          <div className="flex flex-col items-center text-center px-4">
            <p className="text-white font-medium text-lg tracking-wider animate-pulse">
              Buffering Live Stream...
            </p>
            {channel && (
              <span className="text-xs text-white/50 mt-1 max-w-sm truncate">
                Connecting securely to {channel.name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error & Reconnect Overlay */}
      {streamError && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-40 p-6 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-red-950/40 border border-red-800/40 rounded-2xl max-w-md shadow-lg"
          >
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg mb-1">Live Transmission Offline</h3>
            <p className="text-white/60 text-sm mb-4 leading-relaxed font-sans">
              {streamError}
            </p>

            <div className="flex flex-col items-center gap-2 justify-center">
              {retryCountdown > 0 ? (
                <div className="text-sm font-sans tracking-wide text-blue-400 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                  Auto reconnecting in {retryCountdown} seconds...
                </div>
              ) : (
                <button
                  onClick={triggerRetry}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium font-sans flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reconnect Immediately
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* No Channel Loaded State */}
      {!channel && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1322] to-[#050506] flex flex-col items-center justify-center z-30 p-8 text-center border border-white/5 rounded-2xl">
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 mb-4 animate-bounce">
              <Tv className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent font-display mb-2">
              Ready for Broadcast
            </h2>
            <p className="text-white/60 text-sm font-sans max-w-sm mb-6">
              Navigate directories or select a channel below to initiate Live streaming instantaneously.
            </p>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white/50 font-mono">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                Live Feed Active
              </span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Top Bar Widget Overlay */}
      {channel && (
        <AnimatePresence>
          {showControls && (
            <motion.div 
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              className="absolute top-0 left-0 right-0 z-30 p-4 sm:p-5 flex items-start justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none"
            >
              <div className="flex gap-3 items-center pointer-events-auto">
                <img 
                  src={channel.logo || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100"} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=1e293b&color=3b82f6&bold=true`;
                  }}
                  alt={channel.name} 
                  className="w-11 h-11 sm:w-12 sm:h-12 object-contain bg-white/5 p-1 border border-white/10 rounded-xl"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-white text-base sm:text-lg font-bold font-display tracking-tight drop-shadow">
                      {channel.name}
                    </h1>
                    <span className="px-2 py-0.5 bg-red-650/90 text-white font-bold tracking-tight rounded-md text-[9px] uppercase flex items-center gap-1 animate-pulse">
                      <span className="w-1 h-1 rounded-full bg-white block animate-ping" />
                      Live
                    </span>
                  </div>
                  <span className="text-xs text-blue-450 font-sans mt-0.5 tracking-wide px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md inline-block">
                    {channel.group || "Other"}
                  </span>
                </div>
              </div>

              {/* Top Quick Actions */}
              <div className="flex gap-2 pointer-events-auto">
                {/* Stats Toggle */}
                <button
                  onClick={() => setShowInfoOverlay(prev => !prev)}
                  className={`p-2 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${showInfoOverlay ? 'bg-blue-600/25 border-blue-500/40 text-blue-400' : 'bg-white/5 text-white/80 border-white/5 hover:border-white/15 hover:bg-white/10'}`}
                  title="Stream Diagnostics (I)"
                >
                  <Activity className="w-4 h-4" />
                </button>

                {/* Star Favorites */}
                <button
                  onClick={() => onToggleFavorite(channel)}
                  className={`p-2 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${isFavorite ? 'bg-amber-500/20 text-amber-400 border-amber-500/45' : 'bg-white/5 text-white/80 border-white/5 hover:border-white/15 hover:bg-white/10'}`}
                  title="Toggle Favorite"
                >
                  <Heart className="w-4 h-4 fill-current opacity-95" />
                </button>

                {/* Keyboard Layout Helper */}
                <button
                  onClick={() => setShowShortcutsHelp(prev => !prev)}
                  className={`p-2 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${showShortcutsHelp ? 'bg-blue-600/25 border-blue-500/30 text-blue-400' : 'bg-white/5 text-white/80 border-white/5 hover:border-white/15 hover:bg-white/10'}`}
                  title="Keyboard Shortcuts Guide (H)"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* diagnostic overlay panel */}
      {showInfoOverlay && channel && (
        <span className="absolute top-16 left-4 z-40 bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] sm:text-xs text-white/80 font-mono backdrop-blur-lg flex flex-col gap-1.5 w-64 shadow-2xl">
          <div className="flex justify-between items-center text-blue-400 font-bold border-b border-white/5 pb-1 mb-1">
            <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> DIAGNOSTICS</span>
            <span className="font-sans px-1 bg-blue-500/10 text-blue-450 border border-blue-500/20 rounded">HLS.JS</span>
          </div>
          <p className="flex justify-between">
            <span>Buffer Length:</span>
            <span className="text-white text-right">{bufferedLength}s</span>
          </p>
          <p className="flex justify-between">
            <span>Stream Health:</span>
            <span className="text-green-400 text-right">Excellent</span>
          </p>
          <p className="flex justify-between">
            <span>Latency estimation:</span>
            <span className="text-white text-right">{latency > 0 ? `${latency}s` : 'Unknown'}</span>
          </p>
          <p className="flex justify-between">
            <span>Stream protocol:</span>
            <span className="text-white text-right max-w-[120px] truncate">{channel.url}</span>
          </p>
        </span>
      )}

      {/* Keyboard Shortcuts overlay panel */}
      {showShortcutsHelp && (
        <div className="absolute inset-0 bg-black/60 z-40 backdrop-blur-md flex items-center justify-center p-6 text-xs text-white/80 selection:bg-blue-505">
          <div className="max-w-md bg-white/5 border border-white/15 p-6 rounded-2xl w-full backdrop-blur-xl shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <h3 className="text-white font-bold text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-400" /> Player Keyboard hotkeys</h3>
              <button 
                onClick={() => setShowShortcutsHelp(false)}
                className="text-white/60 hover:text-white px-2 py-1 bg-white/5 border border-white/10 rounded cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 font-sans">
              <div className="flex justify-between items-center p-2 bg-white/5 border border-white/10 rounded">
                <span className="text-white/60">Play / Pause</span>
                <kbd className="px-2 py-0.5 bg-white/10 border border-white/15 rounded text-[10px] text-white font-mono">SPACE</kbd>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/5 border border-white/10 rounded">
                <span className="text-white/60">Maximize / Full</span>
                <kbd className="px-2 py-0.5 bg-white/10 border border-white/15 rounded text-[10px] text-white font-mono">F</kbd>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/5 border border-white/10 rounded">
                <span className="text-white/60">Mute / Unmute</span>
                <kbd className="px-2 py-0.5 bg-white/10 border border-white/15 rounded text-[10px] text-white font-mono">M</kbd>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/5 border border-white/10 rounded">
                <span className="text-white/60">Mini-Player</span>
                <kbd className="px-2 py-0.5 bg-white/10 border border-white/15 rounded text-[10px] text-white font-mono">P</kbd>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/5 border border-white/10 rounded">
                <span className="text-white/60">Volume Up</span>
                <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/15 rounded text-[10px] text-white font-mono">▲ Up</kbd>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/5 border border-white/10 rounded">
                <span className="text-white/60">Volume Down</span>
                <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/15 rounded text-[10px] text-white font-mono">▼ Down</kbd>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/5 border border-white/10 rounded col-span-2">
                <span className="text-white/60">Manually Reload Live Stream</span>
                <kbd className="px-2 py-0.5 bg-white/10 border border-white/15 rounded text-[10px] text-white font-mono">R</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Control Bar */}
      {channel && (
        <AnimatePresence>
          {showControls && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 z-30 p-4 sm:p-5 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-3 pointer-events-auto border-t border-white/5 backdrop-blur-[2px]"
            >
              {/* Buffer Bar Indicator */}
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 bg-blue-500 rounded-full w-[2px] shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all" />
              </div>

              {/* Main Controls Grid */}
              <div className="flex items-center justify-between">
                
                {/* Left Side: Playback State + Audio Vol slider */}
                <div className="flex items-center gap-3 sm:gap-4 select-none">
                  {/* Play & Pause button */}
                  <button 
                    onClick={togglePlay}
                    className="p-2.5 sm:p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full transform transition-all active:scale-90 hover:scale-105 shadow-lg shadow-blue-500/25 cursor-pointer"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />}
                  </button>

                  {/* Volume System with slider */}
                  <div className="flex items-center gap-1.5 group/volume relative">
                    <button 
                      onClick={toggleMute}
                      className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 animate-pulse" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => changeVolume(parseFloat(e.target.value))}
                      className="w-16 sm:w-20 accent-blue-500 h-1 bg-white/20 rounded-lg cursor-pointer opacity-0 group-hover/volume:opacity-100 transition-opacity duration-300 hidden sm:inline-block"
                      title="Adjust Volume"
                    />
                  </div>

                  {/* Latency and Status Info */}
                  <div className="hidden md:flex items-center gap-2 text-xs text-white/50 font-mono">
                    <span className="flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                      </span>
                      LIVE STREAM
                    </span>
                    <span className="text-white/20">|</span>
                    <span>HD PLAYBACK</span>
                  </div>
                </div>

                {/* Right Side: Quality, PiP, Fullscreen */}
                <div className="flex items-center gap-1 sm:gap-2">
                  
                  {/* Quality button */}
                  {qualityLevels.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowQualityMenu(prev => !prev)}
                        className="px-2.5 py-1.5 bg-white/5 border border-white/10 hover:border-white/20 text-[10px] sm:text-xs text-white rounded-lg flex items-center gap-1 transition-colors font-sans hover:bg-white/10 cursor-pointer"
                        title="Stream Quality"
                      >
                        <RotateCcw className="w-3 h-3 text-blue-450" />
                        {currentQuality === -1 ? 'Auto' : `${qualityLevels[currentQuality]?.name}`}
                      </button>

                      {/* Floating quality popup menu */}
                      {showQualityMenu && (
                        <div className="absolute bottom-10 right-0 z-50 bg-[#12131a]/95 border border-white/10 rounded-xl p-1.5 shadow-2xl w-32 flex flex-col gap-0.5 backdrop-blur-xl">
                          <button
                            onClick={() => selectQualityLevel(-1)}
                            className={`w-full text-left px-2.5 py-1 text-[11px] rounded transition-colors cursor-pointer ${currentQuality === -1 ? 'bg-blue-600/30 text-blue-450 font-bold border border-blue-500/20' : 'text-white/80 hover:bg-white/10'}`}
                          >
                            Auto Quality (Adaptive)
                          </button>
                          {qualityLevels.map((level) => (
                            <button
                              key={level.id}
                              onClick={() => selectQualityLevel(level.id)}
                              className={`w-full text-left px-2.5 py-1 text-[11px] rounded transition-colors cursor-pointer ${currentQuality === level.id ? 'bg-blue-600/30 text-blue-450 font-bold border border-blue-500/20' : 'text-white/80 hover:bg-white/10'}`}
                            >
                              {level.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Picture-in-Picture */}
                  <button 
                    onClick={togglePictureInPicture}
                    className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Floating Mini-Player (PiP)"
                  >
                    <List className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  </button>

                  {/* Fullscreen Button */}
                  <button 
                    onClick={toggleFullscreen}
                    className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? <Minimize2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 hover:scale-105 transition-transform" /> : <Maximize2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 hover:scale-105 transition-transform" />}
                  </button>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
