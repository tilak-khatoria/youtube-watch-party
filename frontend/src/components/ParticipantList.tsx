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
      <div className="p-3.5 border-b border-neutral-200 dark:border-border-subtle">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-xs text-text-primary">Participants</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/[0.05] text-primary font-mono font-bold border border-neutral-200 dark:border-border-subtle">
              {(participants || []).length}
            </span>
          </div>
          {isCurrentUserHost && (
            <span className="text-[10px] text-tertiary font-semibold bg-tertiary/10 border border-tertiary/25 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Crown className="w-3 h-3 text-tertiary" /> Host Controls
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Search participants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <Search className="w-4 h-4 text-text-muted absolute left-3 pointer-events-none" />
        </div>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filteredParticipants.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-xs">No participants found</div>
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
                    ? 'bg-primary-container/10 border-primary-container/30'
                    : 'bg-neutral-50/50 dark:bg-white/[0.03] hover:bg-neutral-100/80 dark:hover:bg-white/[0.06] border-neutral-200 dark:border-white/[0.05]'
                }`}
              >
                {/* User Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isHost
                        ? 'bg-tertiary/15 text-tertiary border border-tertiary/30 shadow-sm'
                        : isMod
                        ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm'
                        : 'bg-neutral-200 dark:bg-white/[0.06] text-text-secondary'
                    }`}
                  >
                    {initialLetter}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-text-primary truncate max-w-[120px]">
                        {displayName}
                      </p>
                      {isSelf && (
                        <span className="text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Role Badge */}
                    <div className="flex items-center gap-1 mt-0.5">
                      {isHost && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-tertiary">
                          <Crown className="w-3 h-3 text-tertiary" /> Host
                        </span>
                      )}
                      {isMod && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                          <ShieldCheck className="w-3 h-3 text-primary" /> Moderator
                        </span>
                      )}
                      {!isHost && !isMod && (
                        <span className="flex items-center gap-1 text-[10px] text-text-muted">
                          <User className="w-3 h-3 text-text-muted" /> Viewer
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
                          ? 'bg-primary/10 text-primary border-primary/40 hover:bg-primary/20'
                          : 'bg-neutral-100 dark:bg-white/[0.04] text-text-muted border-neutral-200 dark:border-white/5 hover:text-primary'
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
                        className="p-1.5 rounded-lg bg-neutral-100 dark:bg-white/[0.04] hover:bg-neutral-200 dark:hover:bg-white/10 text-text-secondary border border-neutral-200 dark:border-white/5 transition-all cursor-pointer"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === p.id && (
                        <div className="absolute right-0 top-full mt-1.5 z-30 w-48 bg-white dark:bg-[#121212] border border-neutral-200 dark:border-border-focus rounded-xl shadow-2xl p-1.5 space-y-1 backdrop-blur-xl">
                          <button
                            onClick={() => handleToggleModerator(p)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-primary hover:bg-neutral-100 dark:hover:bg-white/10 rounded-lg transition-colors text-left cursor-pointer font-medium"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                            <span>{isMod ? 'Demote to Viewer' : 'Make Moderator'}</span>
                          </button>

                          <button
                            onClick={() => setConfirmHostTransferId(p.id)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-tertiary hover:bg-tertiary/10 rounded-lg transition-colors text-left cursor-pointer font-medium"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-tertiary" />
                            <span>Transfer Host</span>
                          </button>

                          <div className="h-[1px] bg-neutral-200 dark:bg-white/10 my-1" />

                          <button
                            onClick={() => handleKick(p.id)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-error hover:bg-error-container/20 rounded-lg transition-colors text-left font-semibold cursor-pointer"
                          >
                            <UserMinus className="w-3.5 h-3.5 text-error" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-tertiary/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-tertiary mb-3">
              <ShieldAlert className="w-5 h-5" />
              <h4 className="font-bold text-sm text-text-primary">Transfer Host Authority</h4>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed mb-5">
              Are you sure you want to transfer the <strong className="text-tertiary font-semibold">Host</strong> role?
              You will become a Moderator and the selected user will have full control over the room.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmHostTransferId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTransferHost(confirmHostTransferId)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-tertiary hover:bg-tertiary/90 text-pure-black shadow-md shadow-tertiary/20 transition-all cursor-pointer"
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
