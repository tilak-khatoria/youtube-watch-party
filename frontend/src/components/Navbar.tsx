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
    <header className="sticky top-0 z-50 w-full bg-glass-elevated backdrop-blur-xl border-b border-border-focus shadow-2xl shadow-black/80 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-white/[0.08] border border-border-subtle flex items-center justify-center transition-colors group-hover:border-primary-container">
            <Tv className="w-4 h-4 text-primary" />
          </div>
          <span className="font-headline-lg text-lg text-text-primary tracking-tight font-medium">
            SyncParty
          </span>
        </Link>

        {/* Room Header Controls / Home Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {roomId ? (
            <>
              {/* Room Code with Copy Link */}
              <div className="hidden sm:flex items-center gap-1.5 bg-glass-recessed rounded-lg px-3 py-1 border border-border-subtle">
                <span className="text-xs text-text-muted font-medium">Room:</span>
                <span className="text-xs font-mono font-medium text-primary tracking-wider">
                  {roomId}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="ml-1 p-0.5 hover:bg-white/10 rounded text-text-muted hover:text-text-primary transition-all cursor-pointer"
                  title="Copy Invite Link"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-secondary" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Current User Role Pill */}
              {username && role && (
                <div className="flex items-center gap-1.5 bg-glass-recessed rounded-lg px-2.5 py-1 border border-border-subtle">
                  {role === 'Host' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-tertiary">
                      <Crown className="w-3 h-3 text-tertiary" /> Host
                    </span>
                  )}
                  {role === 'Moderator' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <ShieldCheck className="w-3 h-3 text-primary" /> Mod
                    </span>
                  )}
                  {(role === 'Participant' || role === 'Viewer') && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-text-muted">
                      <User className="w-3 h-3 text-text-muted" /> Viewer
                    </span>
                  )}
                  <span className="text-xs text-on-surface max-w-[90px] truncate hidden md:inline font-mono">
                    {username}
                  </span>
                </div>
              )}

              {/* Leave Room Button */}
              <button
                onClick={handleLeave}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-text-muted hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-glass-recessed border border-border-subtle">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              <span className="text-[11px] uppercase tracking-wider font-medium text-text-secondary">
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
