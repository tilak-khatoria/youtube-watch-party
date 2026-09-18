import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { VideoPlayState, ParticipantRole } from '../types';
import { extractYouTubeVideoId } from '../utils/youtube';
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
  Film,
  Hand,
} from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  currentTime: number;
  playState: VideoPlayState;
  lastUpdated?: number;
  role?: ParticipantRole;
  canControl?: boolean;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
  onChangeVideoClick: () => void;
  onRequestControl?: () => void;
  onSuggestVideoClick?: () => void;
  reactions?: import('../types').FloatingReaction[];
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
  role,
  canControl,
  onPlay,
  onPause,
  onSeek,
  onChangeVideoClick,
  onRequestControl,
  onSuggestVideoClick,
  reactions = [],
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // RBAC Permission Resolution:
  // Host & Moderator: Full native interaction with YouTube iframe, interactive controls, no overlay
  // Participant & Viewer: Watch only, disabled controls, transparent overlay (pointer-events: none)
  const isHost = role === 'Host';
  const isModerator = role === 'Moderator';
  const isHostOrModerator = isHost || isModerator || Boolean(canControl);
  const isParticipantOrViewer = role === 'Participant' || role === 'Viewer' || !isHostOrModerator;

  // Keep a ref to latest permissions to avoid player re-initialization / black screens
  const isHostOrModeratorRef = useRef<boolean>(isHostOrModerator);
  useEffect(() => {
    isHostOrModeratorRef.current = isHostOrModerator;
  }, [isHostOrModerator]);

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

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore cleanup errors
        }
        playerRef.current = null;
      }

      viewportRef.current.innerHTML = '<div id="yt-player-target" style="width:100%;height:100%;position:absolute;inset:0"></div>';

      const safeVideoId = extractYouTubeVideoId(videoId) || videoId || '';
      if (!safeVideoId) return;

      try {
        playerRef.current = new window.YT.Player('yt-player-target', {
          height: '100%',
          width: '100%',
          videoId: safeVideoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
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

              if (currentTime > 0) {
                event.target.seekTo(currentTime, true);
              }
              if (playState === 'playing') {
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              if (event.data === 3) {
                setIsBuffering(true);
              } else {
                setIsBuffering(false);
              }

              if (isProgrammaticUpdate.current) {
                return;
              }

              if (!isHostOrModeratorRef.current) {
                if (playState === 'paused' && event.data === 1) {
                  executeProgrammaticUpdate((p) => p.pauseVideo());
                } else if (playState === 'playing' && event.data === 2) {
                  executeProgrammaticUpdate((p) => p.playVideo());
                }
                return;
              }

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
      } catch (err) {
        console.error('[YouTubePlayer] Error initializing YT.Player:', err);
      }
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
  }, [videoId, executeProgrammaticUpdate]);

  // 2. Programmatic Sync: Video ID change
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady || !videoId) return;

    try {
      const cleanVideoId = extractYouTubeVideoId(videoId) || videoId;
      const currentUrl = playerRef.current.getVideoUrl() || '';
      if (!currentUrl.includes(cleanVideoId)) {
        console.log(`[YouTube Player API] Loading Video ID: ${cleanVideoId}`);
        executeProgrammaticUpdate((p) => {
          p.loadVideoById(cleanVideoId, 0);
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

  // 3. Programmatic Sync: Play / Pause / Seek / Sync State
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady) return;

    try {
      const player = playerRef.current;
      const cur = player.getCurrentTime() || 0;
      const pState = player.getPlayerState();

      let targetTime = currentTime;
      if (playState === 'playing' && lastUpdated) {
        const elapsedSinceUpdate = (Date.now() - lastUpdated) / 1000;
        if (elapsedSinceUpdate > 0 && elapsedSinceUpdate < 15) {
          targetTime += elapsedSinceUpdate;
        }
      }

      if (Math.abs(cur - targetTime) > 1.8) {
        executeProgrammaticUpdate((p) => p.seekTo(targetTime, true));
      }

      if (playState === 'playing' && pState !== 1 && pState !== 3) {
        executeProgrammaticUpdate((p) => p.playVideo());
      } else if (playState === 'paused' && pState === 1) {
        executeProgrammaticUpdate((p) => p.pauseVideo());
      }
    } catch (e) {
      console.error('Error during playback synchronization:', e);
    }
  }, [playState, currentTime, lastUpdated, isPlayerReady, executeProgrammaticUpdate]);

  // 4. Scrubber Timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current && isPlayerReady) {
        try {
          const cur = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 0;

          if (
            isHostOrModeratorRef.current &&
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
  }, [isPlayerReady, duration, onSeek]);

  // User Actions
  const handleTogglePlay = () => {
    if (!isHostOrModerator) return;
    if (playState === 'playing') {
      onPause(localTime);
      executeProgrammaticUpdate((p) => p.pauseVideo());
    } else {
      onPlay(localTime);
      executeProgrammaticUpdate((p) => p.playVideo());
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHostOrModerator) return;
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
  const isPausedWaiting = !!videoId && playState === 'paused';

  return (
    <div
      ref={containerRef}
      className={`flex flex-col w-full h-full bg-black rounded-2xl overflow-hidden relative group transition-all duration-500 ${
        isPausedWaiting
          ? 'border border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.18)]'
          : 'border border-neutral-200 dark:border-white/[0.08] shadow-2xl'
      }`}
    >
      {/* Video Viewport Container */}
      <div className="relative w-full flex-1 min-h-[300px] bg-black flex items-center justify-center overflow-hidden">
        <div
          ref={viewportRef}
          className="w-full h-full absolute inset-0"
          style={{ pointerEvents: isParticipantOrViewer ? 'none' : 'auto' }}
        />

        {/* Floating Synchronized Emoji Reactions */}
        <div className="absolute inset-0 z-35 pointer-events-none overflow-hidden select-none">
          {reactions.map((r) => (
            <div
              key={r.id}
              className="absolute bottom-8 flex flex-col items-center animate-float-up pointer-events-none"
              style={{ left: `${r.xOffset}%` }}
            >
              <span className="text-3xl sm:text-4xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                {r.emoji}
              </span>
              <span className="text-[9px] font-semibold text-cyan-200 bg-black/75 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10 mt-1 shadow-md">
                {r.senderName}
              </span>
            </div>
          ))}
        </div>

        {/* Transparent overlay: strictly for Participant or Viewer */}
        {isParticipantOrViewer && videoId && (
          <div
            id="participant-overlay"
            data-testid="participant-overlay"
            className="participant-overlay absolute inset-0 z-20 bg-transparent cursor-not-allowed select-none pointer-events-none"
            style={{ pointerEvents: 'none' }}
            title="Watch Only: Playback is synchronized with the Host and Moderators."
          />
        )}

        {/* Empty Video State Placeholder */}
        {!videoId && (
          <div className="absolute inset-0 z-25 flex flex-col items-center justify-center p-6 text-center bg-black/90 backdrop-blur-sm">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-center text-cyan-400 mb-4 shadow-sm">
              <Film className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-white">No Video Loaded</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              {canControl
                ? 'Paste a YouTube URL or ID above or choose from presets to start the watch party.'
                : 'Waiting for the Host to choose a video...'}
            </p>
            {canControl && onChangeVideoClick && (
              <button
                type="button"
                onClick={onChangeVideoClick}
                className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                Select Video
              </button>
            )}
          </div>
        )}

        {/* Status Overlay Badges */}
        <div className="absolute top-3.5 left-3.5 z-30 flex items-center gap-2 pointer-events-none">
          {isHost && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-tertiary/40 text-tertiary text-xs font-semibold backdrop-blur-md shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-tertiary" />
              <span>Host Controller Active</span>
            </div>
          )}
          {isModerator && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-primary/40 text-primary text-xs font-semibold backdrop-blur-md shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Moderator Controller Active</span>
            </div>
          )}
          {isParticipantOrViewer && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-white/20 text-neutral-300 text-xs font-medium backdrop-blur-md shadow-lg">
              <Lock className="w-3.5 h-3.5 text-neutral-300" />
              <span>Watch Only (Synced)</span>
            </div>
          )}

          {isBuffering && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-white/20 text-neutral-200 text-xs font-medium backdrop-blur-md shadow-lg">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Buffering</span>
            </div>
          )}
        </div>
      </div>

      {/* Unified Control Bar */}
      <div className="p-3.5 bg-neutral-900/95 dark:bg-pure-black border-t border-neutral-800 dark:border-border-subtle flex flex-col gap-2.5 z-30 transition-colors backdrop-blur-md">
        {/* Scrubber Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-neutral-400 min-w-[38px] text-right">
            {formatSeconds(localTime)}
          </span>

          <div className="relative flex-1 flex items-center">
            {isHostOrModerator ? (
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={1}
                value={localTime}
                onChange={handleSeekChange}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:h-2 bg-neutral-700 dark:bg-neutral-800 transition-all"
                title="Seek video timeline"
              />
            ) : (
              <div
                className="w-full h-1.5 rounded-lg bg-neutral-700 dark:bg-neutral-800 overflow-hidden relative cursor-not-allowed"
                title="Timeline scrubbing is restricted to Host and Moderators"
              >
                <div
                  className="h-full bg-cyan-500 rounded-lg transition-all duration-300"
                  style={{ width: `${duration > 0 ? (localTime / duration) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>

          <span className="text-[11px] font-mono text-neutral-400 min-w-[38px]">
            {formatSeconds(duration)}
          </span>
        </div>

        {/* Buttons Bar */}
        <div className="flex items-center justify-between gap-4">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            {isHostOrModerator ? (
              <button
                onClick={handleTogglePlay}
                title={isPlaying ? 'Pause' : 'Play'}
                className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                {onRequestControl ? (
                  <button
                    type="button"
                    onClick={onRequestControl}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                    title="Request permission from Host to control playback"
                  >
                    <Hand className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[11px]">Request Control</span>
                  </button>
                ) : (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-neutral-400 text-xs cursor-not-allowed font-medium"
                    title="Only Host/Moderators can control playback"
                  >
                    <Lock className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-[11px]">Watch Only</span>
                  </div>
                )}
              </div>
            )}

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMute}
                className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
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
                className="w-16 sm:w-20 h-1.5 bg-neutral-700 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualResync}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/10 text-neutral-200 border border-white/10 transition-all cursor-pointer shadow-sm"
              title="Force Resynchronization with Room"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline text-[11px]">Resync</span>
            </button>

            {isHostOrModerator ? (
              <button
                onClick={onChangeVideoClick}
                title="Change Video for Room"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/10 text-neutral-200 border border-white/10 transition-all cursor-pointer shadow-sm"
              >
                <Tv className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px]">Change Video</span>
              </button>
            ) : onSuggestVideoClick ? (
              <button
                type="button"
                onClick={onSuggestVideoClick}
                title="Suggest a video to the Host"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600/15 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              >
                <Tv className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px]">Suggest Video</span>
              </button>
            ) : null}

            <button
              onClick={handleFullscreen}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
