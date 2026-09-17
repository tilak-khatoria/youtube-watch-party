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
    <div className="min-h-screen flex flex-col bg-[#0e0e13] text-[#f9f5fd] selection:bg-[#6C63FF] selection:text-white transition-colors">
      {/* Sticky Glass Navbar */}
      <Navbar />

      {/* Centered Hero & Content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col justify-center items-center w-full">
        {/* Hero Header - Asymmetric Monolith feel */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          {/* Metadata Chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#19191f] border border-[#a8a4ff]/25 text-xs text-[#acaab1] mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#00d2fd]" />
            <span className="space-label text-[10px] tracking-wider text-[#00d2fd]">KINETIC SYNC ENGINE V2.0</span>
          </div>

          {/* Monolithic Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#f9f5fd] leading-[1.08] font-sans">
            Watch YouTube Together in{' '}
            <span className="text-kinetic">Real-Time</span>
          </h1>

          {/* Subtext */}
          <p className="mt-5 text-sm sm:text-base text-[#acaab1] leading-relaxed max-w-xl mx-auto font-sans">
            Host synchronized watch parties with sub-second latency. Built-in role permissions, synchronized playback, and live chat.
          </p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto items-stretch">
          {/* Create Room Card */}
          <div className="glass-elevated rounded-2xl p-6 sm:p-8 flex flex-col justify-between border border-[#a8a4ff]/20 bg-[#131319]/90 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C63FF]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#19191f] border border-[#6C63FF]/30 flex items-center justify-center text-[#a8a4ff]">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#f9f5fd] font-space">Create Party</h2>
                    <p className="text-xs text-[#acaab1]">Launch a room as Host</p>
                  </div>
                </div>
                <span className="text-[10px] space-label px-2.5 py-1 rounded bg-[#19191f] text-amber-400 border border-amber-500/20 font-bold">
                  HOST
                </span>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold space-label text-[#acaab1] mb-1.5">
                    DISPLAY NAME
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Alex (Host)"
                      value={createUsername}
                      onChange={(e) => setCreateUsername(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-2.5 pl-10 text-xs focus:outline-none"
                    />
                    <User className="w-4 h-4 text-[#76747b] absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold space-label text-[#acaab1] mb-1.5">
                    CUSTOM ROOM CODE <span className="text-[#76747b] font-normal lowercase">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Leave empty for random"
                      value={customRoomId}
                      onChange={(e) => setCustomRoomId(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-2.5 pl-10 text-xs font-mono focus:outline-none"
                    />
                    <Hash className="w-4 h-4 text-[#76747b] absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold space-label text-[#acaab1] mb-1.5">
                    INITIAL YOUTUBE VIDEO <span className="text-[#76747b] font-normal lowercase">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Paste YouTube URL or ID"
                      value={initialVideoUrl}
                      onChange={(e) => setInitialVideoUrl(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-2.5 pl-10 text-xs font-mono focus:outline-none"
                    />
                    <Video className="w-4 h-4 text-[#76747b] absolute left-3.5 top-3" />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full btn-kinetic py-3 px-4 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>INITIALIZING...</span>
                      </>
                    ) : (
                      <>
                        <span>CREATE & LAUNCH PARTY</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Join Room Card */}
          <div className="glass-elevated rounded-2xl p-6 sm:p-8 flex flex-col justify-between border border-white/10 bg-[#131319]/90 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D4FF]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#19191f] border border-[#00D4FF]/30 flex items-center justify-center text-[#00d2fd]">
                    <LogIn className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#f9f5fd] font-space">Join Party</h2>
                    <p className="text-xs text-[#acaab1]">Enter code or invite link</p>
                  </div>
                </div>
                <span className="text-[10px] space-label px-2.5 py-1 rounded bg-[#19191f] text-[#00d2fd] border border-[#00d2fd]/20 font-bold">
                  VIEWER
                </span>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold space-label text-[#acaab1] mb-1.5">
                    ROOM CODE OR URL <span className="text-rose-400">*</span>
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
                      className="w-full glass-input rounded-xl px-4 py-2.5 pl-10 text-xs font-mono focus:outline-none"
                    />
                    <LinkIcon className="w-4 h-4 text-[#76747b] absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold space-label text-[#acaab1] mb-1.5">
                    DISPLAY NAME
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Sarah (Viewer)"
                      value={joinUsername}
                      onChange={(e) => setJoinUsername(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-2.5 pl-10 text-xs focus:outline-none"
                    />
                    <User className="w-4 h-4 text-[#76747b] absolute left-3.5 top-3" />
                  </div>
                </div>

                {errorMessage && (
                  <p className="text-xs text-rose-400 font-medium">{errorMessage}</p>
                )}

                <div className="pt-8">
                  <button
                    type="submit"
                    disabled={isJoining}
                    className="w-full py-3 px-4 rounded-xl bg-[#19191f] hover:bg-[#25252d] border border-[#00D4FF]/40 text-[#00d2fd] font-space font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-cyan-bloom"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#00d2fd]" />
                        <span>JOINING PARTY...</span>
                      </>
                    ) : (
                      <>
                        <span>JOIN WATCH PARTY</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl mx-auto mt-14">
          <div className="glass-base rounded-xl p-5 border border-white/10 bg-[#131319]/80 flex flex-col justify-between hover:border-[#6C63FF]/30 transition-all">
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#19191f] border border-white/10 flex items-center justify-center text-[#a8a4ff] mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-[#f9f5fd] space-label">SUB-SECOND SYNC</h4>
              <p className="text-[11px] text-[#acaab1] mt-1.5 leading-relaxed">
                Ultra-low latency real-time player synchronization.
              </p>
            </div>
          </div>

          <div className="glass-base rounded-xl p-5 border border-white/10 bg-[#131319]/80 flex flex-col justify-between hover:border-[#00D4FF]/30 transition-all">
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#19191f] border border-white/10 flex items-center justify-center text-[#00d2fd] mb-3">
                <Shield className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-[#f9f5fd] space-label">RBAC CONTROLS</h4>
              <p className="text-[11px] text-[#acaab1] mt-1.5 leading-relaxed">
                Role-based playback permissions for Hosts and Viewers.
              </p>
            </div>
          </div>

          <div className="glass-base rounded-xl p-5 border border-white/10 bg-[#131319]/80 flex flex-col justify-between hover:border-[#6C63FF]/30 transition-all">
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#19191f] border border-white/10 flex items-center justify-center text-[#a8a4ff] mb-3">
                <Users className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-[#f9f5fd] space-label">AUTO-TRANSFER</h4>
              <p className="text-[11px] text-[#acaab1] mt-1.5 leading-relaxed">
                Automatic leadership failover if the host disconnects.
              </p>
            </div>
          </div>

          <div className="glass-base rounded-xl p-5 border border-white/10 bg-[#131319]/80 flex flex-col justify-between hover:border-[#00D4FF]/30 transition-all">
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#19191f] border border-white/10 flex items-center justify-center text-[#00d2fd] mb-3">
                <Film className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-[#f9f5fd] space-label">LIVE CHAT</h4>
              <p className="text-[11px] text-[#acaab1] mt-1.5 leading-relaxed">
                Real-time room chat with participant status badges.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
