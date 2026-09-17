import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tv, Copy, Check, LogOut, ShieldCheck, Crown, User } from 'lucide-react';
import type { ParticipantRole } from '../types';
import { ThemeToggle } from './ThemeToggle';

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
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 dark:bg-black/50 dark:backdrop-blur-xl dark:border-white/10 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.08] border border-gray-200 dark:border-white/10 flex items-center justify-center transition-colors group-hover:border-cyan-500">
            <Tv className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <span className="text-lg text-gray-900 dark:text-white tracking-tight font-semibold">
            SyncParty
          </span>
        </Link>

        {/* Room Header Controls / Home Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {roomId ? (
            <>
              {/* Room Code with Copy Link */}
              <div className="hidden sm:flex items-center gap-1.5 bg-gray-100 dark:bg-white/[0.04] rounded-lg px-3 py-1 border border-gray-200 dark:border-white/10">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Room:</span>
                <span className="text-xs font-mono font-medium text-cyan-600 dark:text-cyan-400 tracking-wider">
                  {roomId}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="ml-1 p-0.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
                  title="Copy Invite Link"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Current User Role Pill */}
              {username && role && (
                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/[0.04] rounded-lg px-2.5 py-1 border border-gray-200 dark:border-white/10">
                  {role === 'Host' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Host
                    </span>
                  )}
                  {role === 'Moderator' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                      <ShieldCheck className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> Mod
                    </span>
                  )}
                  {(role === 'Participant' || role === 'Viewer') && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      <User className="w-3 h-3 text-gray-500 dark:text-gray-400" /> Viewer
                    </span>
                  )}
                  <span className="text-xs text-gray-800 dark:text-gray-200 max-w-[90px] truncate hidden md:inline font-mono">
                    {username}
                  </span>
                </div>
              )}

              {/* Leave Room Button */}
              <button
                onClick={handleLeave}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-700 dark:text-gray-300">
                Live Sync Engine Ready
              </span>
            </div>
          )}

          {/* Theme Switcher */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
