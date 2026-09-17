import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { extractYouTubeVideoId, normalizeRoomId } from '../utils/youtube';
import {
  PlusCircle,
  LogIn,
  Sparkles,
  Shield,
  Zap,
  Users,
  Film,
  ArrowRight,
  User,
  Hash,
  Video,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // Create Room State
  const [createUsername, setCreateUsername] = useState('');
  const [customRoomId, setCustomRoomId] = useState('');
  const [initialVideoUrl, setInitialVideoUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Join Room State
  const [joinUsername, setJoinUsername] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const generateRandomCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `party-${code}`;
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsCreating(true);

    const username = createUsername.trim() || `Host_${Math.floor(1000 + Math.random() * 9000)}`;
    const rawId = customRoomId.trim() || generateRandomCode();
    const roomId = normalizeRoomId(rawId);

    // Safely extract YouTube video ID if URL or ID provided, fallback to default
    let cleanVideoId = 'dQw4w9WgXcQ';
    if (initialVideoUrl.trim()) {
      const extracted = extractYouTubeVideoId(initialVideoUrl.trim());
      cleanVideoId = extracted || initialVideoUrl.trim();
    }

    // Store preferred username, role, and creator identity for persistence across refresh
    localStorage.setItem('syncparty_username', username);
    localStorage.setItem(`syncparty_room_${roomId}_role`, 'Host');
    localStorage.setItem(`syncparty_room_${roomId}_creator`, username);

    setTimeout(() => {
      navigate(`/room/${roomId}`, {
        state: {
          username,
          videoId: cleanVideoId,
          initialVideoId: cleanVideoId,
          isCreator: true,
        },
      });
    }, 200);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!joinRoomId.trim()) {
      setErrorMessage('Please enter a valid Room Code or URL.');
      return;
    }

    setIsJoining(true);
    const cleanRoomId = normalizeRoomId(joinRoomId);

    const username = joinUsername.trim() || `Viewer_${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem('syncparty_username', username);
    const existingCreator = localStorage.getItem(`syncparty_room_${cleanRoomId}_creator`);
    const isReturningHost = Boolean(existingCreator && existingCreator.toLowerCase() === username.toLowerCase());
    if (!isReturningHost) {
      localStorage.setItem(`syncparty_room_${cleanRoomId}_role`, 'Participant');
    }

    setTimeout(() => {
      navigate(`/room/${cleanRoomId}`, {
        state: {
          username,
          isCreator: isReturningHost,
        },
      });
    }, 200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white transition-colors">
      {/* Sticky Glass Navbar */}
      <Navbar />

      {/* Centered Hero & Content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col justify-center items-center w-full">
        {/* Hero Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-400 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium text-[11px] text-neutral-300">Synchronized Watch Parties</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.12]">
            Watch YouTube Together in{' '}
            <span className="text-cyan-400">Real-Time</span>
          </h1>

          {/* Subtext */}
          <p className="mt-4 text-sm sm:text-base text-neutral-400 leading-relaxed max-w-lg mx-auto">
            Host synchronized watch parties with sub-second latency. Built-in role permissions, synchronized playback, and live chat.
          </p>
        </div>

        {/* Action Cards Grid: Equal-height & Equal-width */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto items-stretch">
          {/* Create Room Card */}
          <div className="glass-elevated rounded-2xl p-6 sm:p-7 flex flex-col justify-between border border-white/[0.08] bg-white/[0.03]">
            <div>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-cyan-400">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Create Party</h2>
                    <p className="text-xs text-neutral-400">Launch a room as Host</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.05] text-amber-400 border border-amber-500/20 font-semibold">
                  Host
                </span>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Display Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Alex (Host)"
                      value={createUsername}
                      onChange={(e) => setCreateUsername(e.target.value)}
                      className="w-full glass-input rounded-lg px-3.5 py-2.5 pl-9 text-xs focus:outline-none"
                    />
                    <User className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Custom Room Code <span className="text-neutral-500 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Leave empty for random"
                      value={customRoomId}
                      onChange={(e) => setCustomRoomId(e.target.value)}
                      className="w-full glass-input rounded-lg px-3.5 py-2.5 pl-9 text-xs font-mono focus:outline-none"
                    />
                    <Hash className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Initial YouTube Video <span className="text-neutral-500 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Paste YouTube URL or ID"
                      value={initialVideoUrl}
                      onChange={(e) => setInitialVideoUrl(e.target.value)}
                      className="w-full glass-input rounded-lg px-3.5 py-2.5 pl-9 text-xs font-mono focus:outline-none"
                    />
                    <Video className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-black font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Initializing...</span>
                      </>
                    ) : (
                      <>
                        <span>Create & Launch Party</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Join Room Card */}
          <div className="glass-elevated rounded-2xl p-6 sm:p-7 flex flex-col justify-between border border-white/[0.08] bg-white/[0.03]">
            <div>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-cyan-400">
                    <LogIn className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Join Party</h2>
                    <p className="text-xs text-neutral-400">Enter code or invite link</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.05] text-neutral-300 border border-white/[0.08]">
                  Viewer
                </span>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Room Code or URL <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. party-xyz123 or paste link"
                      value={joinRoomId}
                      onChange={(e) => {
                        setJoinRoomId(e.target.value);
                        setErrorMessage('');
                      }}
                      required
                      className="w-full glass-input rounded-lg px-3.5 py-2.5 pl-9 text-xs font-mono focus:outline-none"
                    />
                    <LinkIcon className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Display Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Sarah (Viewer)"
                      value={joinUsername}
                      onChange={(e) => setJoinUsername(e.target.value)}
                      className="w-full glass-input rounded-lg px-3.5 py-2.5 pl-9 text-xs focus:outline-none"
                    />
                    <User className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-3" />
                  </div>
                </div>

                {errorMessage && (
                  <p className="text-xs text-rose-400 font-medium">{errorMessage}</p>
                )}

                <div className="pt-8">
                  <button
                    type="submit"
                    disabled={isJoining}
                    className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-black font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Joining Party...</span>
                      </>
                    ) : (
                      <>
                        <span>Join Watch Party</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Feature Grid: 4 Subtle Equal-Height Panels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl mx-auto mt-12">
          <div className="glass-base rounded-xl p-4 border border-white/[0.08] bg-white/[0.02] flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-cyan-400 mb-2.5">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-semibold text-white">Sub-second Sync</h4>
              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                Ultra-low latency real-time player synchronization.
              </p>
            </div>
          </div>

          <div className="glass-base rounded-xl p-4 border border-white/[0.08] bg-white/[0.02] flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-cyan-400 mb-2.5">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-semibold text-white">RBAC Controls</h4>
              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                Role-based playback permissions for Hosts and Viewers.
              </p>
            </div>
          </div>

          <div className="glass-base rounded-xl p-4 border border-white/[0.08] bg-white/[0.02] flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-cyan-400 mb-2.5">
                <Users className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-semibold text-white">Auto-Transfer</h4>
              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                Automatic leadership failover if the host disconnects.
              </p>
            </div>
          </div>

          <div className="glass-base rounded-xl p-4 border border-white/[0.08] bg-white/[0.02] flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-cyan-400 mb-2.5">
                <Film className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-semibold text-white">Live Chat</h4>
              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                Real-time room chat with participant status badges.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
