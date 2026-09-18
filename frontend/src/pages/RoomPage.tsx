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
  User,
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

  // Handle Display Name Form Submission
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
      <div className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors w-full">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 w-full">
          <div className="rounded-2xl p-6 sm:p-8 max-w-md w-full border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm dark:shadow-none backdrop-blur-md animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Join Watch Party</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Room: <code className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{canonicalRoomId}</code>
                </p>
              </div>
            </div>

            <form onSubmit={handleDirectJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Enter Your Display Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. Alex, Sam, Taylor..."
                    value={directNameInput}
                    onChange={(e) => {
                      setDirectNameInput(e.target.value);
                      setDirectNameError('');
                    }}
                    className="w-full rounded-xl pl-10 pr-4 py-3 text-xs bg-white text-gray-900 border border-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:bg-white/5 dark:text-white dark:border-white/10 dark:placeholder-gray-500 placeholder:text-gray-400 focus:outline-none transition-colors"
                  />
                </div>
                {directNameError && (
                  <p className="text-xs text-rose-500 mt-1.5 font-medium">{directNameError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:scale-[1.01]"
              >
                <LogIn className="w-4 h-4" />
                <span>Join Watch Party</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Watch Room Encountered an Issue">
      <div className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors w-full">
        <Navbar
          roomId={canonicalRoomId}
          username={username}
          role={currentUserRole}
          onLeaveRoom={handleLeaveRoom}
        />

        {/* Main Party Room Workspace */}
        <main className="flex-1 max-w-[1560px] w-full mx-auto p-3 sm:p-4 lg:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6 justify-center">
          {/* Left / Center: YouTube Video Player Area */}
          <section className="flex-1 flex flex-col min-w-0">
            {/* Top Banner with Room info & Copy Share */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Room Code:</span>
                <span className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-400 bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 px-2.5 py-1 rounded-lg">
                  {canonicalRoomId}
                </span>
                <button
                  onClick={handleCopyInviteLink}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 transition-all cursor-pointer shadow-sm"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>Share Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Role Notice Indicator */}
              <div className="flex items-center gap-2">
                {isHost && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-3 py-1 rounded-lg shadow-sm">
                    <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Host Controls Active
                  </span>
                )}
                {isModerator && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 px-3 py-1 rounded-lg shadow-sm">
                    <Shield className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Moderator Controls Active
                  </span>
                )}
                {isParticipantOrViewer && (
                  <span className="flex items-center gap-1.5 text-xs font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 px-3 py-1 rounded-lg">
                    <Eye className="w-3.5 h-3.5 text-gray-400" /> Watch Only Mode
                  </span>
                )}
              </div>
            </div>

            {/* YouTube Video URL Input Field: Strictly rendered for Host / Moderator */}
            {isHostOrModerator ? (
              <form
                onSubmit={handleInlineUrlSubmit}
                className="mb-3.5 p-2 rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm dark:shadow-none flex items-center gap-2.5 backdrop-blur-md"
              >
                <div className="relative flex-1 flex items-center">
                  <input
                    type="text"
                    placeholder="Paste YouTube URL or Video ID to change video for everyone..."
                    value={inlineVideoUrl}
                    onChange={(e) => setInlineVideoUrl(e.target.value)}
                    className="w-full rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono bg-white text-gray-900 border border-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:bg-white/5 dark:text-white dark:border-white/10 dark:placeholder-gray-500 placeholder:text-gray-400 focus:outline-none transition-colors"
                  />
                  <PlaySquare className="w-4 h-4 text-cyan-600 dark:text-cyan-400 absolute left-3.5 pointer-events-none" />
                </div>

                <button
                  type="submit"
                  disabled={!inlineVideoUrl.trim()}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Change Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                  title="Browse video presets"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Presets</span>
                </button>
              </form>
            ) : (
              /* Informative status bar for Participants / Viewers */
              <div className="mb-3.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] shadow-sm dark:shadow-none flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                  <span>
                    Watching live with party • Video ID:{' '}
                    <code className="text-cyan-600 dark:text-cyan-400 font-mono font-semibold">
                      {videoState?.videoId || 'dQw4w9WgXcQ'}
                    </code>
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-white/10">
                  Watch Only • Managed by Host & Mods
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
          <aside className="w-full lg:w-88 xl:w-96 flex flex-col rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm dark:shadow-none overflow-hidden h-[580px] lg:h-auto shrink-0 backdrop-blur-md">
            {/* Sidebar Tab Header */}
            <div className="flex items-center border-b border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02]">
              <button
                onClick={() => setActiveTab('participants')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'participants'
                    ? 'border-cyan-500 text-gray-900 dark:text-white bg-white dark:bg-white/[0.04]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.02]'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Participants ({(participants || []).length})</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'chat'
                    ? 'border-cyan-500 text-gray-900 dark:text-white bg-white dark:bg-white/[0.04]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.02]'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Live Chat ({(chatMessages || []).length})</span>
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
