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
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // Create Room State
  const [createUsername, setCreateUsername] = useState('');
  const [customRoomId, setCustomRoomId] = useState('');
  const [initialVideoUrl, setInitialVideoUrl] = useState('');

  // Join Room State
  const [joinUsername, setJoinUsername] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');

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

    navigate(`/room/${roomId}`, {
      state: {
        username,
        videoId: cleanVideoId,
        initialVideoId: cleanVideoId,
        isCreator: true,
      },
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!joinRoomId.trim()) {
      setErrorMessage('Please enter a valid Room Code or URL.');
      return;
    }

    const cleanRoomId = normalizeRoomId(joinRoomId);

    const username = joinUsername.trim() || `Viewer_${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem('syncparty_username', username);
    const existingCreator = localStorage.getItem(`syncparty_room_${cleanRoomId}_creator`);
    const isReturningHost = Boolean(existingCreator && existingCreator.toLowerCase() === username.toLowerCase());
    if (!isReturningHost) {
      localStorage.setItem(`syncparty_room_${cleanRoomId}_role`, 'Participant');
    }

    navigate(`/room/${cleanRoomId}`, {
      state: {
        username,
        isCreator: isReturningHost,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090a10] text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      {/* Hero Header */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold mb-5 shadow-sm">
            <Sparkles className="w-4 h-4" />
            <span>Synchronized YouTube Watch Parties</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 leading-tight">
            Watch YouTube Together in{' '}
            <span className="bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 dark:from-rose-400 dark:via-purple-400 dark:to-indigo-300 bg-clip-text text-transparent">
              Perfect Real-Time Sync
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Host live watch parties with friends. Manage permissions with built-in Role-Based Access Control,
            chat in real-time, and never drop a frame.
          </p>
        </div>

        {/* Action Cards (Create / Join) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full mb-16">
          {/* Create Room Card */}
          <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden group hover:border-rose-500/40 transition-all shadow-xl shadow-slate-200/50 dark:shadow-2xl backdrop-blur-xl">
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-600/10 dark:bg-rose-600/20 rounded-full blur-2xl group-hover:scale-110 transition-transform pointer-events-none" />

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/25">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create a Watch Room</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Start a new room and invite friends as Host</p>
              </div>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex (Host)"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  className="w-full bg-slate-100/90 dark:bg-slate-950/80 border border-slate-300/80 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Custom Room Code <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Leave empty for auto-generated code"
                  value={customRoomId}
                  onChange={(e) => setCustomRoomId(e.target.value)}
                  className="w-full bg-slate-100/90 dark:bg-slate-950/80 border border-slate-300/80 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Initial YouTube URL / ID <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://www.youtube.com/watch?v=..."
                  value={initialVideoUrl}
                  onChange={(e) => setInitialVideoUrl(e.target.value)}
                  className="w-full bg-slate-100/90 dark:bg-slate-950/80 border border-slate-300/80 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-rose-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Create & Launch Party</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Join Room Card */}
          <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden group hover:border-indigo-500/40 transition-all shadow-xl shadow-slate-200/50 dark:shadow-2xl backdrop-blur-xl">
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-indigo-600/10 dark:bg-indigo-600/20 rounded-full blur-2xl group-hover:scale-110 transition-transform pointer-events-none" />

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25">
                <LogIn className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Join Existing Room</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Enter a room code or shared link</p>
              </div>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Room Code or Link <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. party-xyz123 or paste invite link"
                  value={joinRoomId}
                  onChange={(e) => {
                    setJoinRoomId(e.target.value);
                    setErrorMessage('');
                  }}
                  required
                  className="w-full bg-slate-100/90 dark:bg-slate-950/80 border border-slate-300/80 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah (Viewer)"
                  value={joinUsername}
                  onChange={(e) => setJoinUsername(e.target.value)}
                  className="w-full bg-slate-100/90 dark:bg-slate-950/80 border border-slate-300/80 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-500 font-medium">{errorMessage}</p>
              )}

              <div className="pt-8">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Join Watch Party</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto w-full">
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-white/5 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Sub-second Sync</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Play, pause, and seek stay aligned across all clients.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-white/5 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">RBAC Permissions</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Assign Moderators, transfer Host, or lock Viewer controls.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-white/5 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Host Auto-Transfer</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">If the host leaves, leadership passes automatically.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-white/5 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Live Reactions & Chat</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Real-time messaging with role tags and emoji bursts.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
