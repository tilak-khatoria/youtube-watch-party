import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tv, Copy, Check, LogOut, ShieldCheck, Crown, User } from 'lucide-react';
import type { ParticipantRole } from '../types';

interface NavbarProps {
  roomId?: string;
  username?: string;
  role?: ParticipantRole;
  onLeaveRoom?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomId,
  username,
  role,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCopyLink = () => {
    if (!roomId) return;
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    if (onLeaveRoom) {
      onLeaveRoom();
    } else {
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 bg-[#090a10]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-600/25 group-hover:scale-105 transition-transform">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              SyncParty
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400 -mt-1">
              Watch Party
            </span>
          </div>
        </Link>

        {/* Room Header Controls */}
        {roomId ? (
          <div className="flex items-center gap-3">
            {/* Room Code with Copy Link */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 border border-white/10 rounded-xl px-3 py-1.5 shadow-inner">
              <span className="text-xs text-slate-400 font-medium">Room:</span>
              <span className="text-xs font-mono font-bold text-indigo-300 tracking-wider">
                {roomId}
              </span>
              <button
                onClick={handleCopyLink}
                className="ml-1 p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-all"
                title="Copy Invite Link"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Current User Role Pill */}
            {username && role && (
              <div className="flex items-center gap-2 bg-slate-900/80 border border-white/10 rounded-xl px-3 py-1.5">
                {role === 'Host' && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Crown className="w-3 h-3 text-amber-400" /> Host
                  </span>
                )}
                {role === 'Moderator' && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" /> Mod
                  </span>
                )}
                {(role === 'Participant' || role === 'Viewer') && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    <User className="w-3 h-3 text-slate-400" /> Viewer
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-200 max-w-[110px] truncate">
                  {username}
                </span>
              </div>
            )}

            {/* Leave Room Button */}
            <button
              onClick={handleLeave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all hover:scale-105 active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Sync Engine Ready
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
