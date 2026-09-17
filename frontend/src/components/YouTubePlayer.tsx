import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { VideoPlayState } from '../types';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Tv,
  Lock,
  Sparkles,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  currentTime: number;
  playState: VideoPlayState;
  lastUpdated?: number;
  canControl: boolean;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
  onChangeVideoClick: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  currentTime,
  playState,
  lastUpdated,
  canControl,
  onPlay,
  onPause,
  onSeek,
  onChangeVideoClick,
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Guard flag to prevent infinite loops when programmatically updating the player
  const isProgrammaticUpdate = useRef<boolean>(false);
  const lastRecordedTime = useRef<number>(currentTime);

  const [duration, setDuration] = useState<number>(0);
  const [localTime, setLocalTime] = useState<number>(currentTime);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(100);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);

  // Helper to safely execute programmatic player updates
  const executeProgrammaticUpdate = useCallback((action: (player: any) => void) => {
    if (!playerRef.current || !isPlayerReady) return;
    try {
      isProgrammaticUpdate.current = true;
      action(playerRef.current);
      setTimeout(() => {
        isProgrammaticUpdate.current = false;
      }, 600);
    } catch (err) {
      console.error('Error executing programmatic update:', err);
      isProgrammaticUpdate.current = false;
    }
  }, [isPlayerReady]);

  // 1. Initialize YouTube Iframe Player via official API
  useEffect(() => {
    let checkInterval: any = null;

    // Ensure YouTube API script exists
    if (!window.YT) {
      const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
    }

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player || !viewportRef.current) return;

      // Clean up previous instance
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore cleanup errors
        }
        playerRef.current = null;
      }

      // Re-create the placeholder container element dynamically
      viewportRef.current.innerHTML = '<div id="yt-player-target" style="width:100%;height:100%;position:absolute;inset:0"></div>';

      playerRef.current = new window.YT.Player('yt-player-target', {
        height: '100%',
        width: '100%',
        videoId: videoId || 'dQw4w9WgXcQ',
        playerVars: {
          autoplay: 0,
          controls: canControl ? 1 : 0, // Native controls only for Host/Mod
          disablekb: canControl ? 0 : 1,
          modestbranding: 1,
          rel: 0,
          fs: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            const dur = event.target.getDuration() || 0;
            setDuration(dur);

            // Sync initial room state
            if (currentTime > 0) {
              event.target.seekTo(currentTime, true);
            }
            if (playState === 'playing') {
              event.target.playVideo();
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: -1 = UNSTARTED, 0 = ENDED, 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING, 5 = CUED
            if (event.data === 3) {
              setIsBuffering(true);
            } else {
              setIsBuffering(false);
            }

            // Ignore state changes triggered programmatically by socket events
            if (isProgrammaticUpdate.current) {
              return;
            }

            // If Participant/Viewer somehow triggered a change, snap them back
            if (!canControl) {
              if (playState === 'paused' && event.data === 1) {
                executeProgrammaticUpdate((p) => p.pauseVideo());
              } else if (playState === 'playing' && event.data === 2) {
                executeProgrammaticUpdate((p) => p.playVideo());
              }
              return;
            }

            // Host / Moderator: Emit event to room
            const cur = event.target.getCurrentTime() || 0;
            lastRecordedTime.current = cur;

            if (event.data === 1) {
              onPlay(cur);
            } else if (event.data === 2) {
              onPause(cur);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 150);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [videoId, canControl, executeProgrammaticUpdate]);

  // 2. Programmatic Sync: Video ID change (change_video event)
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady || !videoId) return;

    try {
      const currentUrl = playerRef.current.getVideoUrl() || '';
      if (!currentUrl.includes(videoId)) {
        console.log(`[YouTube Player API] Loading Video ID: ${videoId}`);
        executeProgrammaticUpdate((p) => {
          p.loadVideoById(videoId, 0);
          if (playState === 'playing') {
            p.playVideo();
          } else {
            p.pauseVideo();
          }
        });
      }
    } catch (e) {
      console.error('Error changing video via API:', e);
    }
  }, [videoId, isPlayerReady, playState, executeProgrammaticUpdate]);

  // 3. Programmatic Sync: Play / Pause / Seek / Sync State from Server
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady) return;

    try {
      const player = playerRef.current;
      const cur = player.getCurrentTime() || 0;
      const pState = player.getPlayerState();

      // Compute estimated target position accounting for network latency
      let targetTime = currentTime;
      if (playState === 'playing' && lastUpdated) {
        const elapsedSinceUpdate = (Date.now() - lastUpdated) / 1000;
        if (elapsedSinceUpdate > 0 && elapsedSinceUpdate < 15) {
          targetTime += elapsedSinceUpdate;
        }
      }

      // Check for timestamp drift (> 1.8s) and seek programmatically
      if (Math.abs(cur - targetTime) > 1.8) {
        executeProgrammaticUpdate((p) => p.seekTo(targetTime, true));
      }

      // Sync playState: 'playing' vs 'paused'
      if (playState === 'playing' && pState !== 1 && pState !== 3) {
        executeProgrammaticUpdate((p) => p.playVideo());
      } else if (playState === 'paused' && pState === 1) {
        executeProgrammaticUpdate((p) => p.pauseVideo());
      }
    } catch (e) {
      console.error('Error during playback synchronization:', e);
    }
  }, [playState, currentTime, lastUpdated, isPlayerReady, executeProgrammaticUpdate]);

  // 4. Scrubber & Time Tracking Timer (Also detects native seeks by Host/Mod)
  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current && isPlayerReady) {
        try {
          const cur = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 0;

          // Detect if Host/Mod manually seeked using native YouTube timeline
          if (
            canControl &&
            !isProgrammaticUpdate.current &&
            Math.abs(cur - lastRecordedTime.current) > 2.5
          ) {
            console.log(`[Host Native Seek Detected] from ${lastRecordedTime.current}s to ${cur}s`);
            onSeek(cur);
          }

          lastRecordedTime.current = cur;
          setLocalTime(cur);
          if (dur > 0 && dur !== duration) setDuration(dur);
        } catch (e) {
          // ignore
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [isPlayerReady, duration, canControl, onSeek]);

  // User Control Actions
  const handleTogglePlay = () => {
    if (!canControl) return;
    if (playState === 'playing') {
      onPause(localTime);
      executeProgrammaticUpdate((p) => p.pauseVideo());
    } else {
      onPlay(localTime);
      executeProgrammaticUpdate((p) => p.playVideo());
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canControl) return;
    const newTime = parseFloat(e.target.value);
    setLocalTime(newTime);
    lastRecordedTime.current = newTime;
    onSeek(newTime);
    executeProgrammaticUpdate((p) => p.seekTo(newTime, true));
  };

  const handleManualResync = () => {
    if (!playerRef.current || !isPlayerReady) return;
    let target = currentTime;
    if (playState === 'playing' && lastUpdated) {
      const elapsed = (Date.now() - lastUpdated) / 1000;
      if (elapsed > 0) target += elapsed;
    }
    executeProgrammaticUpdate((p) => {
      p.seekTo(target, true);
      if (playState === 'playing') p.playVideo();
      else p.pauseVideo();
    });
  };

  const handleToggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playerRef.current) return;
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    playerRef.current.setVolume(val);
    if (val === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec)) return '00:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isPlaying = playState === 'playing';

  return (
    <div
      ref={containerRef}
      className="flex flex-col w-full h-full bg-[#08090e] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group"
    >
      {/* Video Viewport Container */}
      <div className="relative w-full flex-1 min-h-[300px] bg-black flex items-center justify-center overflow-hidden">
        {/* Dynamic target container for YouTube iframe */}
        <div
          ref={viewportRef}
          className={`w-full h-full absolute inset-0 ${!canControl ? 'pointer-events-none' : 'pointer-events-auto'}`}
          style={{ pointerEvents: canControl ? 'auto' : 'none' }}
        />

        {/* =========================================================
            TRANSPARENT CLICK-BLOCKING OVERLAY FOR PARTICIPANTS
            Completely blocks participants from clicking, pausing,
            or scrubbing the native YouTube player controls directly
            ========================================================= */}
        {!canControl && (
          <div
            id="participant-overlay"
            data-testid="participant-overlay"
            className="participant-overlay absolute inset-0 z-20 bg-transparent cursor-not-allowed select-none"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            title="Watch Only: Playback is synchronized with the Host and Moderators."
          />
        )}

        {/* Status Overlay Badges */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 pointer-events-none">
          {canControl ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-900/80 border border-indigo-500/40 text-indigo-200 text-xs font-bold backdrop-blur-md shadow-lg shadow-indigo-900/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Controller Mode Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/85 border border-white/15 text-slate-300 text-xs font-semibold backdrop-blur-md shadow-lg">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Watch Only (Synced)</span>
            </div>
          )}

          {isBuffering && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold backdrop-blur-md">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Buffering</span>
            </div>
          )}
        </div>
      </div>

      {/* Unified Synchronized Playback Control Bar */}
      <div className="p-3.5 bg-[#0e1018] border-t border-white/10 flex flex-col gap-2.5 z-30">
        {/* Scrubber Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400 min-w-[38px] text-right">
            {formatSeconds(localTime)}
          </span>

          <div className="relative flex-1 flex items-center">
            {canControl ? (
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={1}
                value={localTime}
                onChange={handleSeekChange}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 bg-slate-800 transition-all"
                title="Seek video timeline"
              />
            ) : (
              /* Non-interactive static progress bar for Participants */
              <div
                className="w-full h-1.5 rounded-lg bg-slate-800 overflow-hidden relative cursor-not-allowed"
                title="Timeline scrubbing is restricted to Host and Moderators"
              >
                <div
                  className="h-full bg-indigo-500/60 rounded-lg transition-all duration-300"
                  style={{ width: `${duration > 0 ? (localTime / duration) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>

          <span className="text-[11px] font-mono text-slate-400 min-w-[38px]">
            {formatSeconds(duration)}
          </span>
        </div>

        {/* Buttons Bar */}
        <div className="flex items-center justify-between gap-4">
          {/* Left Controls: Play/Pause (Host/Mod only) & Volume */}
          <div className="flex items-center gap-3">
            {canControl ? (
              <button
                onClick={handleTogglePlay}
                title={isPlaying ? 'Pause (Broadcasts to room)' : 'Play (Broadcasts to room)'}
                className={`p-2.5 rounded-xl flex items-center justify-center transition-all shadow-md ${
                  isPlaying
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 hover:scale-105'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-105'
                }`}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
            ) : (
              /* Informative Watch Only Badge for Participants instead of interactive play/pause */
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/5 text-slate-400 text-xs font-medium cursor-not-allowed"
                title="Only Host/Moderators can control playback"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Watch Only</span>
              </div>
            )}

            {/* Volume Control (Available to everyone for local sound) */}
            <div className="flex items-center gap-2 group/vol">
              <button
                onClick={handleToggleMute}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Right Controls: Resync, Change Video (Host/Mod only), Fullscreen */}
          <div className="flex items-center gap-2.5">
            {/* Resync Button (Available to all users if they drift or buffer) */}
            <button
              onClick={handleManualResync}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-all hover:scale-105"
              title="Force Resynchronization with Room"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Resync</span>
            </button>

            {/* Change Video Button (Strictly Host/Mod only) */}
            {canControl && (
              <button
                onClick={onChangeVideoClick}
                title="Change Video for Room"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/10 hover:border-indigo-500/40 hover:scale-105 shadow-sm transition-all"
              >
                <Tv className="w-3.5 h-3.5 text-rose-400" />
                <span>Change Video</span>
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={handleFullscreen}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
