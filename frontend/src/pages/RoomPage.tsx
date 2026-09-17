import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socket';
import type {
  ParticipantData,
  ParticipantRole,
  RoomData,
  VideoState,
  ChatMessage,
  NotificationToast,
} from '../types';
import { extractYouTubeVideoId, normalizeRoomId } from '../utils/youtube';
import { Navbar } from '../components/Navbar';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { ParticipantList } from '../components/ParticipantList';
import { LiveChat } from '../components/LiveChat';
import { VideoSelectorModal } from '../components/VideoSelectorModal';
import { ToastContainer } from '../components/Toast';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  Users,
  MessageSquare,
  Share2,
  Check,
  Crown,
  Shield,
  Eye,
  PlaySquare,
  Sparkles,
  LogIn,
  Tv,
  Radio,
} from 'lucide-react';

export const RoomPage: React.FC = () => {
  const { roomId: rawRoomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Canonical Room ID (handles '13m4x1' and 'party-13m4x1' identically)
  const canonicalRoomId = useMemo(() => normalizeRoomId(rawRoomId), [rawRoomId]);

  // Keep browser URL canonical if prefix was omitted
  useEffect(() => {
    if (rawRoomId && rawRoomId !== canonicalRoomId) {
      navigate(`/room/${canonicalRoomId}`, { replace: true, state: location.state });
    }
  }, [rawRoomId, canonicalRoomId, navigate, location.state]);

  // Route State passed from Home (safely retrieved)
  const routeState = (location.state || {}) as {
    username?: string;
    videoId?: string;
    initialVideoId?: string;
    isCreator?: boolean;
  };

  const routeUsername = routeState?.username ? String(routeState.username).trim() : '';
  // Direct link detection: if navigated directly to /room/:roomId where username is undefined
  const isDirectLink = !routeUsername;

  const rawVideoId = routeState?.videoId || routeState?.initialVideoId;
  const initialResolvedVideoId = (rawVideoId && typeof rawVideoId === 'string')
    ? (extractYouTubeVideoId(rawVideoId) || rawVideoId.trim())
    : 'dQw4w9WgXcQ';

  // State Management: username & direct link fallback
  const [username, setUsername] = useState<string>(routeUsername);
  const [isDirectLinkFallback, setIsDirectLinkFallback] = useState<boolean>(isDirectLink);
  const [directNameInput, setDirectNameInput] = useState<string>(
    localStorage.getItem('syncparty_username') || ''
  );
  const [directNameError, setDirectNameError] = useState<string>('');

  // Check if current client was recorded as creator / Host for this room
  const isStoredHost = useMemo(() => {
    if (routeState?.isCreator) return true;
    const storedRole = localStorage.getItem(`syncparty_room_${canonicalRoomId}_role`);
    if (storedRole === 'Host') return true;
    const storedCreator = localStorage.getItem(`syncparty_room_${canonicalRoomId}_creator`);
    if (storedCreator && username && storedCreator.toLowerCase() === username.toLowerCase()) {
      return true;
    }
    return false;
  }, [routeState?.isCreator, canonicalRoomId, username]);

  // Local User & Role State (Correctly initialized as Host if stored/creator)
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<ParticipantRole>(
    isStoredHost ? 'Host' : 'Participant'
  );

  // Room & Video State (Never undefined)
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [videoState, setVideoState] = useState<VideoState>({
    videoId: initialResolvedVideoId || 'dQw4w9WgXcQ',
    currentTime: 0,
    playState: 'paused',
    lastUpdated: Date.now(),
  });

  // Inline URL Input State for Host/Mod
  const [inlineVideoUrl, setInlineVideoUrl] = useState<string>('');

  // UI State
  const [activeTab, setActiveTab] = useState<'participants' | 'chat'>('participants');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Helper to add toast notifications safely
  const addToast = useCallback((type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const newToast: NotificationToast = {
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      message,
      timestamp: Date.now(),
    };
    setToasts((prev) => [...(prev || []).slice(-4), newToast]);

    // Auto dismiss after 4.5s
    setTimeout(() => {
      setToasts((prev) => (prev || []).filter((t) => t?.id !== newToast.id));
    }, 4500);
  }, []);

  const handleDismissToast = (id: string) => {
    setToasts((prev) => (prev || []).filter((t) => t?.id !== id));
  };

  // Socket Connection and Event Listeners
  useEffect(() => {
    if (isDirectLinkFallback || !username || !canonicalRoomId) {
      return;
    }

    const socket = getSocket();

    // 1. Connection lifecycle
    socket.on('connect', () => {
      console.log('[Socket Connected]:', socket.id);
      setCurrentUserId(socket.id || '');

      // Join the canonical room with verified role request if Host
      socket.emit('join_room', {
        roomId: canonicalRoomId,
        username,
        role: isStoredHost ? 'Host' : undefined,
        isCreator: isStoredHost,
      });
    });

    // If socket is already connected when mounting
    if (socket.connected) {
      setCurrentUserId(socket.id || '');
      socket.emit('join_room', {
        roomId: canonicalRoomId,
        username,
        role: isStoredHost ? 'Host' : undefined,
        isCreator: isStoredHost,
      });
    }

    // 2. Room Joined confirmation
    socket.on('room_joined', (data: { roomId: string; participant: ParticipantData; room: RoomData }) => {
      console.log('[Room Joined]:', data);
      if (data?.participant?.id) {
        setCurrentUserId(data.participant.id);
      }
      if (data?.participant?.role) {
        setCurrentUserRole(data.participant.role);
        localStorage.setItem(`syncparty_room_${data?.roomId || canonicalRoomId}_role`, data.participant.role);
        if (data.participant.role === 'Host' && data?.participant?.username) {
          localStorage.setItem(`syncparty_room_${data?.roomId || canonicalRoomId}_creator`, data.participant.username);
        }
      }
      if (data?.room?.participants) {
        setParticipants(data.room.participants);
      }
      if (data?.room?.videoState?.videoId) {
        setVideoState({
          videoId: data.room.videoState.videoId,
          currentTime: data.room.videoState.currentTime || 0,
          playState: data.room.videoState.playState || 'paused',
          lastUpdated: data.room.videoState.lastUpdated || Date.now(),
        });
      }
      addToast('success', `Joined room ${data?.roomId || canonicalRoomId} as ${data?.participant?.role || 'Participant'}`);
    });

    // 3. Participants Update
    socket.on('participants_updated', (data: { participants: ParticipantData[]; hostId: string }) => {
      if (data?.participants) {
        setParticipants(data.participants);
        const self = data.participants.find((p) => p?.id === socket.id);
        if (self?.role) {
          setCurrentUserRole(self.role);
          localStorage.setItem(`syncparty_room_${canonicalRoomId}_role`, self.role);
          if (self.role === 'Host' && self?.username) {
            localStorage.setItem(`syncparty_room_${canonicalRoomId}_creator`, self.username);
          }
        }
      }
    });

    // 4. User Joined Notification
    socket.on('user_joined', (data: { participant: ParticipantData; message: string }) => {
      addToast('info', data?.message || `${data?.participant?.username || 'Someone'} joined.`);
    });

    // 5. User Left Notification
    socket.on('user_left', (data: { participant: ParticipantData; message: string }) => {
      addToast('info', data?.message || `${data?.participant?.username || 'Someone'} left.`);
    });

    // 6. Video State Sync Listeners
    socket.on('sync_state', (data: VideoState & { triggeredBy?: ParticipantData }) => {
      if (data?.videoId) {
        setVideoState({
          videoId: data.videoId,
          currentTime: data.currentTime || 0,
          playState: data.playState || 'paused',
          lastUpdated: data.lastUpdated || Date.now(),
        });
      }
    });

    socket.on('play', (data: VideoState & { triggeredBy?: ParticipantData }) => {
      setVideoState((prev) => ({
        ...prev,
        playState: 'playing',
        currentTime: typeof data?.currentTime === 'number' ? data.currentTime : prev?.currentTime || 0,
        lastUpdated: data?.lastUpdated || Date.now(),
      }));
      if (data?.triggeredBy && data.triggeredBy.id !== socket.id) {
        addToast('info', `▶️ ${data?.triggeredBy?.username || 'User'} played video`);
      }
    });

    socket.on('pause', (data: VideoState & { triggeredBy?: ParticipantData }) => {
      setVideoState((prev) => ({
        ...prev,
        playState: 'paused',
        currentTime: typeof data?.currentTime === 'number' ? data.currentTime : prev?.currentTime || 0,
        lastUpdated: data?.lastUpdated || Date.now(),
      }));
      if (data?.triggeredBy && data.triggeredBy.id !== socket.id) {
        addToast('info', `⏸️ ${data?.triggeredBy?.username || 'User'} paused video`);
      }
    });

    socket.on('seek', (data: VideoState & { triggeredBy?: ParticipantData }) => {
      setVideoState((prev) => ({
        ...prev,
        currentTime: typeof data?.currentTime === 'number' ? data.currentTime : prev?.currentTime || 0,
        lastUpdated: data?.lastUpdated || Date.now(),
      }));
    });

    socket.on('video_changed', (data: { videoId: string; changedBy?: ParticipantData; room?: RoomData }) => {
      if (data?.videoId) {
        setVideoState({
          videoId: data.videoId,
          currentTime: 0,
          playState: 'playing',
          lastUpdated: Date.now(),
        });
        addToast('info', `🎬 Video changed by ${data?.changedBy?.username || 'Host'}`);
      }
    });

    // 7. Role Assigned Notification
    socket.on('role_assigned', (data: any) => {
      if (data?.userId === socket.id && data?.role) {
        setCurrentUserRole(data.role);
        addToast('success', `👑 You were assigned the role of ${data.role}!`);
      } else {
        addToast('info', data?.message || `${data?.username || 'User'} is now ${data?.role || 'Participant'}.`);
      }
    });

    // 8. Host Changed
    socket.on('host_changed', (data: any) => {
      if (data?.newHostId === socket.id) {
        setCurrentUserRole('Host');
        addToast('success', '👑 You are now the Room Host!');
      } else {
        addToast('warning', data?.message || `Host transferred to ${data?.newHost?.username || 'new host'}`);
      }
    });

    // 9. Participant Removed / Kicked
    socket.on('participant_removed', (data: any) => {
      addToast('warning', data?.message || `${data?.username || 'User'} was removed from the room.`);
    });

    socket.on('kicked_from_room', (data: any) => {
      alert(data?.message || 'You have been removed from the watch party by the Host.');
      navigate('/');
    });

    // 10. Action Rejection / Error messages
    socket.on('action_rejected', (data: { action: string; message: string; requiredRoles?: string[] }) => {
      addToast('error', `🚫 ${data?.message || 'Action rejected'}`);
    });

    socket.on('error_message', (data: { message: string }) => {
      addToast('error', data?.message || 'An error occurred');
    });

    // 11. Live Chat
    socket.on('receive_message', (message: ChatMessage) => {
      if (message?.id) {
        setChatMessages((prev) => [...(prev || []), message]);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('room_joined');
      socket.off('participants_updated');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('sync_state');
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
      socket.off('video_changed');
      socket.off('role_assigned');
      socket.off('host_changed');
      socket.off('participant_removed');
      socket.off('kicked_from_room');
      socket.off('action_rejected');
      socket.off('error_message');
      socket.off('receive_message');
    };
  }, [canonicalRoomId, username, isDirectLinkFallback, isStoredHost, navigate, addToast]);

  // RBAC Permission Resolution
  const isHost = currentUserRole === 'Host';
  const isModerator = currentUserRole === 'Moderator';
  const isHostOrModerator = isHost || isModerator;
  const isParticipantOrViewer = currentUserRole === 'Participant' || currentUserRole === 'Viewer';
  const canControl = isHostOrModerator;

  // Handle Display Name Form Submission (Fallback for direct links)
  const handleDirectJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = directNameInput.trim();
    if (!trimmed) {
      setDirectNameError('Please enter a display name to join the party.');
      return;
    }

    localStorage.setItem('syncparty_username', trimmed);
    const storedCreator = localStorage.getItem(`syncparty_room_${canonicalRoomId}_creator`);
    const isHostName = Boolean(storedCreator && storedCreator.toLowerCase() === trimmed.toLowerCase());
    if (isHostName) {
      setCurrentUserRole('Host');
      localStorage.setItem(`syncparty_room_${canonicalRoomId}_role`, 'Host');
    }
    setUsername(trimmed);
    setIsDirectLinkFallback(false);
  };

  // Socket Emitters
  const handlePlay = (time: number) => {
    if (!canControl) return;
    const socket = getSocket();
    socket.emit('play', { roomId: canonicalRoomId, currentTime: time });
  };

  const handlePause = (time: number) => {
    if (!canControl) return;
    const socket = getSocket();
    socket.emit('pause', { roomId: canonicalRoomId, currentTime: time });
  };

  const handleSeek = (time: number) => {
    if (!canControl) return;
    const socket = getSocket();
    socket.emit('seek', { roomId: canonicalRoomId, currentTime: time });
  };

  const handleChangeVideo = (newVideoId: string) => {
    if (!canControl) {
      addToast('error', 'Only Host and Moderators can change the video.');
      return;
    }
    const cleanId = extractYouTubeVideoId(newVideoId) || newVideoId;
    const socket = getSocket();
    socket.emit('change_video', { roomId: canonicalRoomId, videoId: cleanId });
  };

  const handleInlineUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canControl || !inlineVideoUrl.trim()) return;

    const extractedId = extractYouTubeVideoId(inlineVideoUrl);
    if (!extractedId) {
      addToast('error', 'Invalid YouTube URL or ID. Please check the link.');
      return;
    }

    handleChangeVideo(extractedId);
    setInlineVideoUrl('');
  };

  const handleAssignRole = (userId: string, role: ParticipantRole) => {
    const socket = getSocket();
    socket.emit('assign_role', { roomId: canonicalRoomId, userId, role });
  };

  const handleRemoveParticipant = (userId: string) => {
    const socket = getSocket();
    socket.emit('remove_participant', { roomId: canonicalRoomId, userId });
  };

  const handleSendMessage = (message: string) => {
    const socket = getSocket();
    socket.emit('send_message', { roomId: canonicalRoomId, message });
  };

  const handleLeaveRoom = () => {
    const socket = getSocket();
    socket.emit('leave_room', { roomId: canonicalRoomId });
    navigate('/');
  };

  const handleCopyInviteLink = () => {
    const url = `${window.location.origin}/room/${canonicalRoomId}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    addToast('success', 'Invite link copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  // DIRECT LINK FALLBACK UI
  if (isDirectLinkFallback) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0e0e13] text-[#f9f5fd] transition-colors">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="glass-elevated rounded-2xl p-6 sm:p-8 max-w-md w-full border border-white/10 bg-[#131319]/90 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#19191f] border border-[#00D4FF]/40 flex items-center justify-center text-[#00d2fd]">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#f9f5fd] font-space">Join Watch Party</h2>
                <p className="text-xs text-[#acaab1]">
                  Room: <code className="font-mono text-[#00d2fd] font-semibold">{canonicalRoomId}</code>
                </p>
              </div>
            </div>

            <form onSubmit={handleDirectJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold space-label text-[#acaab1] mb-1.5">
                  ENTER YOUR DISPLAY NAME <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Alex, Sam, Taylor..."
                  value={directNameInput}
                  onChange={(e) => {
                    setDirectNameInput(e.target.value);
                    setDirectNameError('');
                  }}
                  className="glass-input w-full rounded-xl px-4 py-2.5 text-xs text-[#f9f5fd] placeholder-[#76747b] focus:outline-none"
                />
                {directNameError && (
                  <p className="text-xs text-rose-400 mt-1.5 font-medium">{directNameError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full btn-kinetic py-3 px-4 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-black" />
                <span>JOIN WATCH PARTY</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Watch Room Encountered an Issue">
      <div className="min-h-screen flex flex-col bg-[#0e0e13] text-[#f9f5fd] transition-colors">
        <Navbar
          roomId={canonicalRoomId}
          username={username}
          role={currentUserRole}
          onLeaveRoom={handleLeaveRoom}
        />

        {/* Main Party Room Workspace */}
        <main className="flex-1 max-w-[1550px] w-full mx-auto p-3 sm:p-4 lg:p-6 flex flex-col lg:flex-row gap-4 sm:gap-5">
          {/* Left / Center: YouTube Video Player Area */}
          <section className="flex-1 flex flex-col min-w-0">
            {/* Top Banner with Room info & Copy Share */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 px-1">
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-[#acaab1] space-label">ROOM:</span>
                <span className="text-xs font-mono font-bold text-[#00d2fd] bg-[#19191f] border border-white/10 px-2.5 py-0.5 rounded-md">
                  {canonicalRoomId}
                </span>
                <button
                  onClick={handleCopyInviteLink}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-[#19191f] hover:bg-[#25252d] text-[#f9f5fd] border border-white/10 transition-all cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-[#00d2fd]" />
                      <span>Share Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Role Notice Indicator */}
              <div className="flex items-center gap-2">
                {isHost && (
                  <span className="flex items-center gap-1.5 text-xs space-label font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-md">
                    <Crown className="w-3.5 h-3.5 text-amber-400" /> HOST MODE
                  </span>
                )}
                {isModerator && (
                  <span className="flex items-center gap-1.5 text-xs space-label font-bold text-[#00d2fd] bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-md">
                    <Shield className="w-3.5 h-3.5 text-[#00d2fd]" /> MODERATOR ACTIVE
                  </span>
                )}
                {isParticipantOrViewer && (
                  <span className="flex items-center gap-1.5 text-xs space-label font-medium text-[#acaab1] bg-[#19191f] border border-white/10 px-3 py-1 rounded-md">
                    <Eye className="w-3.5 h-3.5 text-[#acaab1]" /> WATCH ONLY MODE
                  </span>
                )}
              </div>
            </div>

            {/* YouTube Video URL Input Field: Strictly rendered for Host / Moderator */}
            {isHostOrModerator ? (
              <form
                onSubmit={handleInlineUrlSubmit}
                className="mb-3.5 p-1.5 rounded-xl border border-white/10 bg-[#131319] flex items-center gap-2 shadow-lg"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Paste YouTube URL or Video ID to change video for everyone..."
                    value={inlineVideoUrl}
                    onChange={(e) => setInlineVideoUrl(e.target.value)}
                    className="glass-input w-full rounded-lg px-3.5 py-2 pl-9 text-xs font-mono text-[#f9f5fd] placeholder-[#76747b] focus:outline-none"
                  />
                  <PlaySquare className="w-4 h-4 text-[#00d2fd] absolute left-3 top-2.5" />
                </div>

                <button
                  type="submit"
                  disabled={!inlineVideoUrl.trim()}
                  className="btn-kinetic px-4 py-2 text-xs flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>CHANGE VIDEO</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(true)}
                  className="px-3 py-2 rounded-lg bg-[#19191f] hover:bg-[#25252d] text-[#f9f5fd] border border-white/10 text-xs font-space font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                  title="Browse video presets"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">PRESETS</span>
                </button>
              </form>
            ) : (
              /* Informative status bar for Participants / Viewers */
              <div className="mb-3.5 px-4 py-2.5 rounded-xl bg-[#131319] border border-white/10 flex items-center justify-between text-xs text-[#acaab1]">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#00d2fd] animate-pulse" />
                  <span>
                    Watching live with party • Video ID:{' '}
                    <code className="text-[#00d2fd] font-mono font-semibold">
                      {videoState?.videoId || 'dQw4w9WgXcQ'}
                    </code>
                  </span>
                </div>
                <span className="text-[11px] space-label text-[#76747b]">
                  WATCH ONLY • MANAGED BY HOST
                </span>
              </div>
            )}

            {/* YouTube Video Player Component */}
            <div className="flex-1 w-full min-h-[420px] sm:min-h-[520px]">
              <YouTubePlayer
                videoId={videoState?.videoId || 'dQw4w9WgXcQ'}
                currentTime={videoState?.currentTime || 0}
                playState={videoState?.playState || 'paused'}
                lastUpdated={videoState?.lastUpdated}
                role={currentUserRole}
                canControl={isHostOrModerator}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onChangeVideoClick={() => setIsVideoModalOpen(true)}
              />
            </div>
          </section>

          {/* Right Sidebar: Participants & Live Chat */}
          <aside className="w-full lg:w-88 xl:w-96 flex flex-col rounded-2xl border border-white/10 bg-[#131319] overflow-hidden shadow-2xl h-[580px] lg:h-auto shrink-0">
            {/* Sidebar Tab Header */}
            <div className="flex items-center border-b border-white/10 bg-[#19191f]">
              <button
                onClick={() => setActiveTab('participants')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-space font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'participants'
                    ? 'border-[#00D4FF] text-[#00d2fd] bg-[#131319]'
                    : 'border-transparent text-[#acaab1] hover:text-[#f9f5fd] hover:bg-white/[0.03]'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>PARTICIPANTS ({(participants || []).length})</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-space font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'chat'
                    ? 'border-[#6C63FF] text-[#a8a4ff] bg-[#131319]'
                    : 'border-transparent text-[#acaab1] hover:text-[#f9f5fd] hover:bg-white/[0.03]'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>LIVE CHAT ({(chatMessages || []).length})</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {activeTab === 'participants' ? (
                <ParticipantList
                  participants={participants || []}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  onAssignRole={handleAssignRole}
                  onRemoveParticipant={handleRemoveParticipant}
                />
              ) : (
                <LiveChat
                  messages={chatMessages || []}
                  currentUserId={currentUserId}
                  onSendMessage={handleSendMessage}
                />
              )}
            </div>
          </aside>
        </main>

        {/* Video Selector Modal */}
        <VideoSelectorModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          onSelectVideo={handleChangeVideo}
          currentVideoId={videoState?.videoId || 'dQw4w9WgXcQ'}
        />

        {/* Floating Notifications */}
        <ToastContainer toasts={toasts || []} onDismiss={handleDismissToast} />
      </div>
    </ErrorBoundary>
  );
};
