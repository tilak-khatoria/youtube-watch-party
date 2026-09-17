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
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-white/[0.08] transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/[0.08] flex items-center justify-center transition-colors">
            <Tv className="w-4 h-4 text-sky-500" />
          </div>
          <span className="font-bold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-white">
            SyncParty
          </span>
        </Link>

        {/* Room Header Controls / Home Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {roomId ? (
            <>
              {/* Room Code with Copy Link */}
              <div className="hidden sm:flex items-center gap-1.5 bg-zinc-100 dark:bg-white/[0.04] rounded-md px-2.5 py-1 border border-zinc-200 dark:border-white/[0.08]">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Room:</span>
                <span className="text-xs font-mono font-medium text-sky-600 dark:text-sky-400 tracking-wider">
                  {roomId}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="ml-1 p-0.5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
                  title="Copy Invite Link"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Current User Role Pill */}
              {username && role && (
                <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-white/[0.04] rounded-md px-2 py-1 border border-zinc-200 dark:border-white/[0.08]">
                  {role === 'Host' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                      <Crown className="w-3 h-3 text-amber-500" /> Host
                    </span>
                  )}
                  {role === 'Moderator' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-400">
                      <ShieldCheck className="w-3 h-3 text-sky-400" /> Mod
                    </span>
                  )}
                  {(role === 'Participant' || role === 'Viewer') && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-400">
                      <User className="w-3 h-3 text-zinc-400" /> Viewer
                    </span>
                  )}
                  <span className="text-xs text-zinc-700 dark:text-zinc-300 max-w-[90px] truncate hidden md:inline font-mono">
                    {username}
                  </span>
                </div>
              )}

              {/* Leave Room Button */}
              <button
                onClick={handleLeave}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </>
          ) : (
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] text-xs font-normal text-zinc-600 dark:text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-[11px] tracking-tight">Live Sync Engine Ready</span>
            </div>
          )}

          {/* Theme Switcher: Light, Dark, System */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
