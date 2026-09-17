import React, { useState } from 'react';
import type {
  ParticipantData,
  ParticipantRole,
} from '../types';
import {
  Crown,
  ShieldCheck,
  User,
  UserMinus,
  ShieldAlert,
  ArrowRightLeft,
  Search,
  MoreVertical,
} from 'lucide-react';

interface ParticipantListProps {
  participants: ParticipantData[];
  currentUserId?: string;
  currentUserRole?: ParticipantRole;
  onAssignRole: (userId: string, role: ParticipantRole) => void;
  onRemoveParticipant: (userId: string) => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUserId,
  currentUserRole,
  onAssignRole,
  onRemoveParticipant,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [confirmHostTransferId, setConfirmHostTransferId] = useState<string | null>(null);

  const isCurrentUserHost = currentUserRole === 'Host';

  const filteredParticipants = (participants || []).filter((p) =>
    p?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleModerator = (participant: ParticipantData) => {
    if (!participant?.id) return;
    const newRole = participant?.role === 'Moderator' ? 'Participant' : 'Moderator';
    onAssignRole(participant.id, newRole);
    setActiveMenuId(null);
  };

  const handleTransferHost = (userId: string) => {
    if (!userId) return;
    onAssignRole(userId, 'Host');
    setConfirmHostTransferId(null);
    setActiveMenuId(null);
  };

  const handleKick = (userId: string) => {
    if (!userId) return;
    onRemoveParticipant(userId);
    setActiveMenuId(null);
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="p-3.5 border-b border-zinc-200 dark:border-white/[0.08]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-xs text-zinc-900 dark:text-white">Participants</h3>
            <span className="text-[11px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 font-mono">
              {(participants || []).length}
            </span>
          </div>
          {isCurrentUserHost && (
            <span className="text-[10px] text-amber-500 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-500" /> Host Controls
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search participants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input rounded-lg px-3 py-1.5 pl-8 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-500 focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-2.5 top-2" />
        </div>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filteredParticipants.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 dark:text-zinc-600 text-xs">No participants found</div>
        ) : (
          filteredParticipants.map((p) => {
            const isSelf = p?.id === currentUserId;
            const isHost = p?.role === 'Host';
            const isMod = p?.role === 'Moderator';
            const initialLetter = p?.username?.charAt(0)?.toUpperCase() || '?';
            const displayName = p?.username || 'Guest';

            return (
              <div
                key={p?.id || Math.random().toString()}
                className={`relative group flex items-center justify-between p-2 rounded-lg border transition-all ${
                  isSelf
                    ? 'bg-sky-500/10 border-sky-500/25'
                    : 'bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-900/80 border-zinc-200 dark:border-white/[0.05]'
                }`}
              >
                {/* User Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                      isHost
                        ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                        : isMod
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {initialLetter}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-zinc-900 dark:text-white truncate max-w-[120px]">
                        {displayName}
                      </p>
                      {isSelf && (
                        <span className="text-[9px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1 py-0.2 rounded">
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Role Badge */}
                    <div className="flex items-center gap-1 mt-0.5">
                      {isHost && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                          <Crown className="w-3 h-3 text-amber-500 dark:text-amber-400" /> Host
                        </span>
                      )}
                      {isMod && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-700 dark:text-cyan-400">
                          <ShieldCheck className="w-3 h-3 text-cyan-500 dark:text-cyan-400" /> Moderator
                        </span>
                      )}
                      {!isHost && !isMod && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                          <User className="w-3 h-3 text-slate-400 dark:text-slate-500" /> Viewer
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Host Action Buttons (Only visible to Host and not on self) */}
                {isCurrentUserHost && !isSelf && p?.id && (
                  <div className="flex items-center gap-1">
                    {/* Quick Moderator Toggle */}
                    <button
                      onClick={() => handleToggleModerator(p)}
                      title={isMod ? 'Demote to Viewer' : 'Promote to Moderator'}
                      className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        isMod
                          ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:text-cyan-600 dark:hover:text-cyan-300'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </button>

                    {/* Dropdown Menu Toggle */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveMenuId(activeMenuId === p.id ? null : p.id)
                        }
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5 transition-all cursor-pointer"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === p.id && (
                        <div className="absolute right-0 top-full mt-1.5 z-30 w-44 bg-white dark:bg-[#181a26] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl p-1.5 space-y-1">
                          <button
                            onClick={() => handleToggleModerator(p)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-left cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                            <span>{isMod ? 'Demote to Viewer' : 'Make Moderator'}</span>
                          </button>

                          <button
                            onClick={() => setConfirmHostTransferId(p.id)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors text-left cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                            <span>Transfer Host</span>
                          </button>

                          <div className="h-[1px] bg-slate-200 dark:bg-white/10 my-1" />

                          <button
                            onClick={() => handleKick(p.id)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors text-left font-medium cursor-pointer"
                          >
                            <UserMinus className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                            <span>Remove from Room</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Transfer Host Confirmation Modal */}
      {confirmHostTransferId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#161826] border border-amber-500/40 rounded-2xl max-w-sm w-full p-5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 mb-3">
              <ShieldAlert className="w-5 h-5" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Transfer Host Authority</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Are you sure you want to transfer the <strong className="text-amber-600 dark:text-amber-400">Host</strong> role?
              You will become a Moderator and the selected user will have full control over the room.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmHostTransferId(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTransferHost(confirmHostTransferId)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
