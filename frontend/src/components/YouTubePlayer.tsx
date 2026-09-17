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

      const safeVideoId = extractYouTubeVideoId(videoId) || videoId || 'dQw4w9WgXcQ';

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
  }, [executeProgrammaticUpdate]);

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

  return (
    <div
      ref={containerRef}
      className="flex flex-col w-full h-full bg-pure-black rounded-2xl overflow-hidden border border-border-subtle shadow-oled-2xl relative group"
    >
      {/* Video Viewport Container */}
      <div className="relative w-full flex-1 min-h-[300px] bg-pure-black flex items-center justify-center overflow-hidden">
        <div
          ref={viewportRef}
          className="w-full h-full absolute inset-0"
          style={{ pointerEvents: isParticipantOrViewer ? 'none' : 'auto' }}
        />

        {/* Transparent overlay: strictly for Participant or Viewer */}
        {isParticipantOrViewer && (
          <div
            id="participant-overlay"
            data-testid="participant-overlay"
            className="participant-overlay absolute inset-0 z-20 bg-transparent cursor-not-allowed select-none pointer-events-none"
            style={{ pointerEvents: 'none' }}
            title="Watch Only: Playback is synchronized with the Host and Moderators."
          />
        )}

        {/* Status Overlay Badges */}
        <div className="absolute top-3.5 left-3.5 z-30 flex items-center gap-2 pointer-events-none">
          {isHost && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 border border-tertiary/30 text-tertiary text-xs font-medium backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-tertiary" />
              <span>Host Controller Active</span>
            </div>
          )}
          {isModerator && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 border border-primary/30 text-primary text-xs font-medium backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Moderator Controller Active</span>
            </div>
          )}
          {isParticipantOrViewer && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 border border-border-subtle text-text-muted text-xs font-medium backdrop-blur-md">
              <Lock className="w-3.5 h-3.5 text-text-muted" />
              <span>Watch Only (Synced)</span>
            </div>
          )}

          {isBuffering && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/80 border border-border-subtle text-neutral-300 text-xs font-medium backdrop-blur-md">
              <RefreshCw className="w-3 h-3 animate-spin text-primary" />
              <span>Buffering</span>
            </div>
          )}
        </div>
      </div>

      {/* Unified Control Bar */}
      <div className="p-3 bg-pure-black border-t border-border-subtle flex flex-col gap-2 z-30 transition-colors">
        {/* Scrubber Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-text-muted min-w-[38px] text-right">
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
                className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-primary-container hover:h-1.5 bg-neutral-800 transition-all"
                title="Seek video timeline"
              />
            ) : (
              <div
                className="w-full h-1 rounded-lg bg-neutral-800 overflow-hidden relative cursor-not-allowed"
                title="Timeline scrubbing is restricted to Host and Moderators"
              >
                <div
                  className="h-full bg-primary-container rounded-lg transition-all duration-300"
                  style={{ width: `${duration > 0 ? (localTime / duration) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>

          <span className="text-[11px] font-mono text-text-muted min-w-[38px]">
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
                className="p-2 rounded-md bg-primary-container hover:bg-primary-hover text-pure-black transition-colors cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>
            ) : (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] border border-border-subtle text-text-muted text-xs cursor-not-allowed"
                title="Only Host/Moderators can control playback"
              >
                <Lock className="w-3 h-3 text-text-muted" />
                <span className="text-[11px]">Watch Only</span>
              </div>
            )}

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMute}
                className="p-1 text-text-muted hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-error" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-container"
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualResync}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/[0.04] hover:bg-white/10 text-text-secondary border border-border-subtle transition-colors cursor-pointer"
              title="Force Resynchronization with Room"
            >
              <RotateCcw className="w-3 h-3 text-primary" />
              <span className="hidden sm:inline text-[11px]">Resync</span>
            </button>

            {isHostOrModerator && (
              <button
                onClick={onChangeVideoClick}
                title="Change Video for Room"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/[0.04] hover:bg-white/10 text-text-secondary border border-border-subtle transition-colors cursor-pointer"
              >
                <Tv className="w-3 h-3 text-primary" />
                <span className="text-[11px]">Change Video</span>
              </button>
            )}

            <button
              onClick={handleFullscreen}
              className="p-1 text-text-muted hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
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
