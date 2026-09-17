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
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-50 dark:bg-[#06070b] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Ambient Gradient Background Blobs */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 -translate-y-1/4 w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] bg-rose-500/15 dark:bg-rose-600/20 rounded-full blur-[140px] pointer-events-none animate-float-slow" />
      <div className="absolute top-1/3 right-10 w-[450px] h-[450px] sm:w-[650px] sm:h-[650px] bg-purple-500/15 dark:bg-purple-600/20 rounded-full blur-[160px] pointer-events-none animate-float-reverse" />
      <div className="absolute bottom-10 left-1/3 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-indigo-500/15 dark:bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none animate-float-slow" />
      <div className="absolute top-1/2 right-1/4 w-[350px] h-[350px] bg-cyan-500/10 dark:bg-cyan-600/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Sticky Glass Navbar */}
      <Navbar />

      {/* Hero Header */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col justify-center relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-base text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-500/25 shadow-sm shadow-rose-500/10 mb-6 animate-fade-in hover:scale-105 transition-transform cursor-default">
            <Sparkles className="w-4 h-4 text-rose-500" />
            <span>Synchronized YouTube Watch Parties</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-5 leading-[1.12] animate-fade-in-up delay-100">
            Watch YouTube Together in{' '}
            <span className="gradient-text-hero">
              Perfect Real-Time Sync
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto animate-fade-in-up delay-200">
            Host synchronized watch parties with ultra-low latency. Manage room access with built-in Role-Based Access Control, chat in real-time, and never drop a beat.
          </p>
        </div>

        {/* Action Cards (Create / Join) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full mb-20 animate-fade-in-up delay-300">
          {/* Create Room Card (Primary / Highlighted) */}
          <div className="glass-elevated rounded-3xl p-6 sm:p-8 relative overflow-hidden group hover:border-rose-500/40 transition-all duration-300 flex flex-col justify-between">
            {/* Ambient Corner Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-500/20 dark:bg-rose-600/30 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/25 group-hover:scale-105 transition-transform">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create a Room</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Launch a party as Host with full controls</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-sm">
                  Host Mode
                </span>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Your Display Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Alex (Host)"
                      value={createUsername}
                      onChange={(e) => setCreateUsername(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none"
                    />
                    <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Custom Room Code <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Leave empty for random code"
                      value={customRoomId}
                      onChange={(e) => setCustomRoomId(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-3 pl-10 text-sm font-mono focus:outline-none"
                    />
                    <Hash className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Initial YouTube Video <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. https://www.youtube.com/watch?v=..."
                      value={initialVideoUrl}
                      onChange={(e) => setInitialVideoUrl(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-3 pl-10 text-sm font-mono focus:outline-none"
                    />
                    <Video className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-rose-600/25 transition-all hover:scale-[1.02] hover:shadow-rose-600/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Initializing Room...</span>
                      </>
                    ) : (
                      <>
                        <span>Create & Launch Party</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Join Room Card */}
          <div className="glass-elevated rounded-3xl p-6 sm:p-8 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between">
            {/* Ambient Corner Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-indigo-500/20 dark:bg-indigo-600/30 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25 group-hover:scale-105 transition-transform">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Join a Room</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Enter a shared room code or link</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm">
                  Quick Join
                </span>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Room Code or URL <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. party-xyz123 or paste invite link"
                      value={joinRoomId}
                      onChange={(e) => {
                        setJoinRoomId(e.target.value);
                        setErrorMessage('');
                      }}
                      required
                      className="w-full glass-input rounded-xl px-4 py-3 pl-10 text-sm font-mono focus:outline-none"
                    />
                    <LinkIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Your Display Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Sarah (Viewer)"
                      value={joinUsername}
                      onChange={(e) => setJoinUsername(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none"
                    />
                    <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                {errorMessage && (
                  <p className="text-xs text-rose-500 font-medium">{errorMessage}</p>
                )}

                <div className="pt-8">
                  <button
                    type="submit"
                    disabled={isJoining}
                    className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.02] hover:shadow-indigo-600/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Joining Party...</span>
                      </>
                    ) : (
                      <>
                        <span>Join Watch Party</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto w-full animate-fade-in-up delay-400">
          <div className="glass-base rounded-2xl p-5 hover:-translate-y-1 hover:border-rose-500/30 dark:hover:border-white/20 transition-all duration-300 flex items-start gap-3.5 shadow-sm hover:shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Sub-second Sync</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Play, pause, and seek stay strictly aligned across all clients.</p>
            </div>
          </div>

          <div className="glass-base rounded-2xl p-5 hover:-translate-y-1 hover:border-amber-500/30 dark:hover:border-white/20 transition-all duration-300 flex items-start gap-3.5 shadow-sm hover:shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">RBAC Permissions</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Assign Moderators, transfer Host, or lock Viewer controls.</p>
            </div>
          </div>

          <div className="glass-base rounded-2xl p-5 hover:-translate-y-1 hover:border-indigo-500/30 dark:hover:border-white/20 transition-all duration-300 flex items-start gap-3.5 shadow-sm hover:shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Host Auto-Transfer</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">If the host leaves, leadership automatically transfers.</p>
            </div>
          </div>

          <div className="glass-base rounded-2xl p-5 hover:-translate-y-1 hover:border-cyan-500/30 dark:hover:border-white/20 transition-all duration-300 flex items-start gap-3.5 shadow-sm hover:shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Live Reactions & Chat</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Real-time messaging with role tags and emoji bursts.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
