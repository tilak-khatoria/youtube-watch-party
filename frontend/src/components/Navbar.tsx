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
    <header className="sticky top-0 z-50 w-full bg-[#0e0e13]/85 backdrop-blur-xl border-b border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#19191f] border border-[#6C63FF]/40 flex items-center justify-center transition-all group-hover:border-[#00D4FF]">
            <Tv className="w-4 h-4 text-[#00d2fd]" />
          </div>
          <span className="font-space font-bold text-sm sm:text-base tracking-tight text-[#f9f5fd]">
            Sync<span className="text-kinetic">Party</span>
          </span>
        </Link>

        {/* Room Header Controls / Home Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {roomId ? (
            <>
              {/* Room Code with Copy Link */}
              <div className="hidden sm:flex items-center gap-1.5 bg-[#19191f] rounded-md px-2.5 py-1 border border-white/10">
                <span className="text-[11px] space-label text-[#acaab1]">Room:</span>
                <span className="text-xs font-mono font-semibold text-[#00d2fd] tracking-wider">
                  {roomId}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="ml-1 p-0.5 hover:bg-white/10 rounded text-[#acaab1] hover:text-[#f9f5fd] transition-all cursor-pointer"
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
                <div className="flex items-center gap-1.5 bg-[#19191f] rounded-md px-2.5 py-1 border border-white/10">
                  {role === 'Host' && (
                    <span className="flex items-center gap-1 text-[11px] space-label font-bold text-amber-400">
                      <Crown className="w-3 h-3 text-amber-400" /> Host
                    </span>
                  )}
                  {role === 'Moderator' && (
                    <span className="flex items-center gap-1 text-[11px] space-label font-bold text-[#00d2fd]">
                      <ShieldCheck className="w-3 h-3 text-[#00d2fd]" /> Mod
                    </span>
                  )}
                  {(role === 'Participant' || role === 'Viewer') && (
                    <span className="flex items-center gap-1 text-[11px] space-label font-medium text-[#acaab1]">
                      <User className="w-3 h-3 text-[#acaab1]" /> Viewer
                    </span>
                  )}
                  <span className="text-xs text-[#f9f5fd] max-w-[90px] truncate hidden md:inline font-mono">
                    {username}
                  </span>
                </div>
              )}

              {/* Leave Room Button */}
              <button
                onClick={handleLeave}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[#acaab1] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </>
          ) : (
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#19191f] border border-white/10 text-xs text-[#acaab1]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              <span className="text-[11px] space-label text-[#acaab1]">Live Sync Engine Ready</span>
            </div>
          )}

          {/* Theme Switcher */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
