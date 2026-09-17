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
  // DIRECT LINK FALLBACK: DO NOT connect to socket if isDirectLinkFallback is true or username is empty
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

    // 2. Room Joined confirmation (Backend verifies and assigns canonical role)
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

  // RBAC Permission Resolution:
  // Host & Moderator: Play, pause, seek, change video, control party
  // Participant & Viewer: Watch only, restricted playback controls
  const isHost = currentUserRole === 'Host';
  const isModerator = currentUserRole === 'Moderator';
  const isHostOrModerator = isHost || isModerator;
  const isParticipantOrViewer = currentUserRole === 'Participant' || currentUserRole === 'Viewer';
  const canControl = isHostOrModerator;

  // Handle Display Name Form Submission (Fallback for direct links / refreshes)
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

  // Socket Emitters (Strictly gated to Host and Moderator)
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

  // DIRECT LINK FALLBACK: Clean, centered UI form asking for Display Name and click 'Join'.
  // DO NOT render video player or connect to socket in this state.
  if (isDirectLinkFallback) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 transition-colors relative overflow-hidden">
        {/* Ambient Blurred Gradient Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-600/20 via-indigo-600/15 to-transparent blur-[120px] dark:from-purple-600/25 dark:via-indigo-600/20 animate-float-slow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-rose-500/20 via-purple-600/15 to-transparent blur-[120px] dark:from-rose-500/25 dark:via-purple-600/20 animate-float-reverse" />
          <div className="absolute top-[30%] right-[25%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-indigo-500/15 via-pink-500/10 to-transparent blur-[100px] dark:from-indigo-500/20 dark:via-pink-500/15" />
        </div>

        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="glass-elevated rounded-3xl p-8 max-w-md w-full relative overflow-hidden animate-fade-in-up">
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/25">
                <Tv className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Join Watch Party</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Room: <code className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{canonicalRoomId}</code>
                </p>
              </div>
            </div>

            <form onSubmit={handleDirectJoinSubmit} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Enter Your Display Name <span className="text-rose-500">*</span>
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
                  className="glass-input w-full rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
                />
                {directNameError && (
                  <p className="text-xs text-rose-500 mt-1.5 font-medium">{directNameError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-rose-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Join</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Watch Room Encountered an Issue">
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 transition-colors relative overflow-hidden">
        {/* Ambient Blurred Gradient Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-600/20 via-indigo-600/15 to-transparent blur-[140px] dark:from-purple-600/25 dark:via-indigo-600/20 animate-float-slow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-rose-500/20 via-purple-600/15 to-transparent blur-[140px] dark:from-rose-500/25 dark:via-purple-600/20 animate-float-reverse" />
          <div className="absolute top-[35%] right-[20%] w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-indigo-500/15 via-pink-500/10 to-transparent blur-[120px] dark:from-indigo-500/20 dark:via-pink-500/15" />
        </div>

        <Navbar
          roomId={canonicalRoomId}
          username={username}
          role={currentUserRole}
          onLeaveRoom={handleLeaveRoom}
        />

        {/* Main Party Room Workspace */}
        <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-5 lg:p-6 flex flex-col lg:flex-row gap-5">
          {/* Left / Center: YouTube Video Player Area */}
          <section className="flex-1 flex flex-col min-w-0">
            {/* Top Banner with Room info & Copy Share */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Room:</span>
                <span className="glass-base text-xs font-mono font-bold text-slate-900 dark:text-white px-2.5 py-1 rounded-lg">
                  {canonicalRoomId}
                </span>
                <button
                  onClick={handleCopyInviteLink}
                  className="glass-base flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-all hover:scale-105 shadow-sm cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Role Notice Indicator */}
              <div className="flex items-center gap-2">
                {isHost && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
                    <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> You are the Host
                  </span>
                )}
                {isModerator && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
                    <Shield className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" /> Moderator Controls Enabled
                  </span>
                )}
                {isParticipantOrViewer && (
                  <span className="glass-base flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full shadow-sm">
                    <Eye className="w-3.5 h-3.5 text-slate-500" /> Watch Only Mode (Controls Locked)
                  </span>
                )}
              </div>
            </div>

            {/* YouTube Video URL Input Field: Strictly rendered for Host / Moderator */}
            {isHostOrModerator ? (
              <form
                onSubmit={handleInlineUrlSubmit}
                className="mb-3 p-2 rounded-2xl glass-elevated flex items-center gap-2 shadow-sm"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Paste YouTube URL or Video ID to change video for everyone..."
                    value={inlineVideoUrl}
                    onChange={(e) => setInlineVideoUrl(e.target.value)}
                    className="glass-input w-full rounded-xl px-4 py-2 pl-9 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all font-mono"
                  />
                  <PlaySquare className="w-4 h-4 text-rose-500 absolute left-3 top-2.5" />
                </div>

                <button
                  type="submit"
                  disabled={!inlineVideoUrl.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all hover:scale-105 shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Change Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(true)}
                  className="glass-base px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all hover:scale-105 shrink-0 flex items-center gap-1 cursor-pointer"
                  title="Browse video presets"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span className="hidden sm:inline">Presets</span>
                </button>
              </form>
            ) : (
              /* Informative status bar for Participants / Viewers */
              <div className="mb-3 px-4 py-2.5 rounded-2xl glass-base flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 shadow-sm">
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  <span>
                    Watching live with party • Video ID:{' '}
                    <code className="text-indigo-600 dark:text-indigo-300 font-mono font-semibold">
                      {videoState?.videoId || 'dQw4w9WgXcQ'}
                    </code>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Watch Only • Controls managed by Host & Mods
                </span>
              </div>
            )}

            {/* YouTube Video Player Component */}
            <div className="flex-1 w-full min-h-[420px] sm:min-h-[500px]">
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
          <aside className="w-full lg:w-96 flex flex-col glass-elevated rounded-2xl overflow-hidden shadow-xl dark:shadow-2xl h-[580px] lg:h-auto shrink-0">
            {/* Sidebar Tab Header */}
            <div className="flex items-center border-b border-white/10 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.02]">
              <button
                onClick={() => setActiveTab('participants')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'participants'
                    ? 'border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-white bg-white/40 dark:bg-white/10'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/20 dark:hover:bg-white/5'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Participants ({(participants || []).length})</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'chat'
                    ? 'border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-white bg-white/40 dark:bg-white/10'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/20 dark:hover:bg-white/5'
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
