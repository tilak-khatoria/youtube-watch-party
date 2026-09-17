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
    <div className="flex flex-col h-full bg-[#131319]">
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 bg-[#19191f]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="space-label text-xs font-bold text-[#f9f5fd]">PARTICIPANTS</h3>
            <span className="text-[11px] px-2 py-0.5 rounded bg-[#25252d] text-[#00d2fd] font-mono font-bold border border-white/10">
              {(participants || []).length}
            </span>
          </div>
          {isCurrentUserHost && (
            <span className="text-[10px] space-label text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-400" /> HOST CONTROLS
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
            className="w-full glass-input rounded-xl px-3 py-1.5 pl-8 text-xs text-[#f9f5fd] placeholder-[#76747b] focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-[#76747b] absolute left-2.5 top-2" />
        </div>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredParticipants.length === 0 ? (
          <div className="text-center py-8 text-[#acaab1] text-xs font-space">NO PARTICIPANTS FOUND</div>
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
                className={`relative group flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  isSelf
                    ? 'bg-[#6C63FF]/15 border-[#6C63FF]/40'
                    : 'bg-[#19191f] hover:bg-[#25252d] border-white/10'
                }`}
              >
                {/* User Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isHost
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : isMod
                        ? 'bg-cyan-500/20 text-[#00d2fd] border border-cyan-500/30'
                        : 'bg-[#25252d] text-[#acaab1] border border-white/10'
                    }`}
                  >
                    {initialLetter}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-[#f9f5fd] truncate max-w-[120px]">
                        {displayName}
                      </p>
                      {isSelf && (
                        <span className="text-[9px] space-label font-bold text-[#00d2fd] bg-cyan-500/15 px-1.5 py-0.2 rounded border border-cyan-500/30">
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Role Badge */}
                    <div className="flex items-center gap-1 mt-0.5">
                      {isHost && (
                        <span className="flex items-center gap-1 text-[10px] space-label font-bold text-amber-400">
                          <Crown className="w-3 h-3 text-amber-400" /> Host
                        </span>
                      )}
                      {isMod && (
                        <span className="flex items-center gap-1 text-[10px] space-label font-bold text-[#00d2fd]">
                          <ShieldCheck className="w-3 h-3 text-[#00d2fd]" /> Moderator
                        </span>
                      )}
                      {!isHost && !isMod && (
                        <span className="flex items-center gap-1 text-[10px] space-label font-medium text-[#acaab1]">
                          <User className="w-3 h-3 text-[#acaab1]" /> Viewer
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Host Action Buttons */}
                {isCurrentUserHost && !isSelf && p?.id && (
                  <div className="flex items-center gap-1">
                    {/* Quick Moderator Toggle */}
                    <button
                      onClick={() => handleToggleModerator(p)}
                      title={isMod ? 'Demote to Viewer' : 'Promote to Moderator'}
                      className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        isMod
                          ? 'bg-cyan-500/15 text-[#00d2fd] border-cyan-500/40 hover:bg-cyan-500/30'
                          : 'bg-[#25252d] text-[#acaab1] border-white/10 hover:text-[#00d2fd] hover:border-[#00d2fd]/30'
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
                        className="p-1.5 rounded-lg bg-[#25252d] hover:bg-white/10 text-[#f9f5fd] border border-white/10 transition-all cursor-pointer"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === p.id && (
                        <div className="absolute right-0 top-full mt-1.5 z-30 w-44 bg-[#25252d] border border-white/15 rounded-xl shadow-2xl p-1.5 space-y-1">
                          <button
                            onClick={() => handleToggleModerator(p)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#f9f5fd] hover:bg-white/10 rounded-lg transition-colors text-left cursor-pointer font-space"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-[#00d2fd]" />
                            <span>{isMod ? 'Demote to Viewer' : 'Make Moderator'}</span>
                          </button>

                          <button
                            onClick={() => setConfirmHostTransferId(p.id)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors text-left cursor-pointer font-space"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                            <span>Transfer Host</span>
                          </button>

                          <div className="h-[1px] bg-white/10 my-1" />

                          <button
                            onClick={() => handleKick(p.id)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left font-space cursor-pointer"
                          >
                            <UserMinus className="w-3.5 h-3.5 text-rose-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#25252d] border border-amber-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-400 mb-3">
              <ShieldAlert className="w-5 h-5" />
              <h4 className="font-bold text-sm text-[#f9f5fd] space-label">Transfer Host Authority</h4>
            </div>
            <p className="text-xs text-[#acaab1] leading-relaxed mb-5">
              Are you sure you want to transfer the <strong className="text-amber-400">Host</strong> role?
              You will become a Moderator and the selected user will have full control over the room.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmHostTransferId(null)}
                className="px-3.5 py-2 rounded-xl text-xs space-label font-semibold text-[#acaab1] hover:text-[#f9f5fd] hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTransferHost(confirmHostTransferId)}
                className="px-4 py-2 rounded-xl text-xs space-label font-bold bg-amber-400 hover:bg-amber-300 text-black shadow-md shadow-amber-500/20 transition-all cursor-pointer"
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
