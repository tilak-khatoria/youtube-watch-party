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
  Hand,
  Bell,
  Inbox,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import type { FloatingReaction, ControlRequest, ToastAction, ChangeRequest } from '../types';

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

  const storedVideoId = localStorage.getItem(`syncparty_room_${canonicalRoomId}_videoId`) || '';
  const rawVideoId = routeState?.videoId || routeState?.initialVideoId || storedVideoId;
  const initialResolvedVideoId = (rawVideoId && typeof rawVideoId === 'string')
    ? (extractYouTubeVideoId(rawVideoId) || rawVideoId.trim())
    : '';

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

  // Room & Video State (Never undefined, no hardcoded Rickroll default)
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [videoState, setVideoState] = useState<VideoState>({
    videoId: initialResolvedVideoId || '',
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
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [lastControlRequestTime, setLastControlRequestTime] = useState<number>(0);

  // Request Flow State (Viewer -> Host / Mod approvals)
  const [pendingRequests, setPendingRequests] = useState<ChangeRequest[]>([]);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState<boolean>(false);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState<boolean>(false);
  const [suggestVideoUrl, setSuggestVideoUrl] = useState<string>('');

  // Helper to add toast notifications safely with optional interactive actions
  const addToast = useCallback(
    (
      type: 'info' | 'success' | 'warning' | 'error',
      message: string,
      actions?: ToastAction[],
      duration: number = 4500
    ) => {
      const newToast: NotificationToast = {
        id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        message,
        timestamp: Date.now(),
        actions,
        duration,
      };
      setToasts((prev) => [...(prev || []).slice(-4), newToast]);

      // Auto dismiss after duration
      setTimeout(() => {
        setToasts((prev) => (prev || []).filter((t) => t?.id !== newToast.id));
      }, duration);
    },
    []
  );

  const handleDismissToast = (id: string) => {
    setToasts((prev) => (prev || []).filter((t) => t?.id !== id));
  };

  // Socket Connection and Event Listeners
  useEffect(() => {
    if (isDirectLinkFallback || !username || !canonicalRoomId) {
      return;
    }

    const socket = getSocket();
    const storedCreatorToken = localStorage.getItem(`syncparty_room_${canonicalRoomId}_creatorToken`) || undefined;

    // 1. Connection lifecycle
    socket.on('connect', () => {
      console.log('[Socket Connected]:', socket.id);
      setCurrentUserId(socket.id || '');

      // Join the canonical room with verified creatorToken if creator/Host
      socket.emit('join_room', {
        roomId: canonicalRoomId,
        username,
        creatorToken: storedCreatorToken,
        initialVideoId: initialResolvedVideoId || undefined,
        videoId: initialResolvedVideoId || undefined,
      });
    });

    // If socket is already connected when mounting
    if (socket.connected) {
      setCurrentUserId(socket.id || '');
      socket.emit('join_room', {
        roomId: canonicalRoomId,
        username,
        creatorToken: storedCreatorToken,
        initialVideoId: initialResolvedVideoId || undefined,
        videoId: initialResolvedVideoId || undefined,
      });
    }

    // 2. Room Joined confirmation
    socket.on('room_joined', (data: { roomId: string; participant: ParticipantData; room: RoomData; creatorToken?: string }) => {
      console.log('[Room Joined]:', data);
      if (data?.participant?.id) {
        setCurrentUserId(data.participant.id);
      }
      if (data?.creatorToken) {
        localStorage.setItem(`syncparty_room_${canonicalRoomId}_creatorToken`, data.creatorToken);
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
        localStorage.setItem(`syncparty_room_${canonicalRoomId}_videoId`, data.room.videoState.videoId);
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
          currentTime: typeof data.currentTime === 'number' ? data.currentTime : 0,
          playState: data.playState || 'paused',
          lastUpdated: data.lastUpdated || Date.now(),
        });
        localStorage.setItem(`syncparty_room_${canonicalRoomId}_videoId`, data.videoId);
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
        localStorage.setItem(`syncparty_room_${canonicalRoomId}_videoId`, data.videoId);
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

    // 12. Floating Emoji Reactions
    socket.on('receive_reaction', (reaction: FloatingReaction) => {
      if (reaction?.id) {
        setReactions((prev) => [...(prev || []).slice(-15), reaction]);
        setTimeout(() => {
          setReactions((prev) => (prev || []).filter((r) => r.id !== reaction.id));
        }, 2500);
      }
    });

    // 13. Control Request Handlers (Viewer -> Host Promotion)
    socket.on('control_requested', (data: ControlRequest) => {
      addToast(
        'info',
        `✋ ${data?.requesterName || 'A participant'} requested playback control!`,
        [
          {
            label: 'Accept',
            variant: 'success',
            onClick: () => {
              const s = getSocket();
              s.emit('respond_control_request', {
                requestId: data.requestId,
                requesterId: data.requesterId,
                approve: true,
                roomId: canonicalRoomId,
              });
            },
          },
          {
            label: 'Deny',
            variant: 'danger',
            onClick: () => {
              const s = getSocket();
              s.emit('respond_control_request', {
                requestId: data.requestId,
                requesterId: data.requesterId,
                approve: false,
                roomId: canonicalRoomId,
              });
            },
          },
        ],
        12000
      );
    });

    socket.on('control_request_sent', (data: { message: string }) => {
      addToast('info', data?.message || 'Control request submitted.');
    });

    socket.on('control_request_resolved', (data: { approved: boolean; message: string }) => {
      addToast(data?.approved ? 'success' : 'warning', data?.message || 'Control request status updated.');
    });

    // 14. Action Request Flow (Mandatory PDF requirement: Participant requests action approval)
    socket.on('action_requested', (request: ChangeRequest) => {
      setPendingRequests((prev) => {
        if (prev.some((r) => r.requestId === request.requestId)) return prev;
        return [...prev, request];
      });

      const actionDesc =
        request.action === 'control'
          ? 'requested playback control (promote to Moderator)'
          : request.action === 'change_video'
          ? `suggested new video: "${request.payload?.videoId || 'custom'}"`
          : `requested action: ${request.action}`;

      addToast(
        'info',
        `✋ ${request.username} ${actionDesc}!`,
        [
          {
            label: 'Approve',
            variant: 'success',
            onClick: () => {
              const s = getSocket();
              s.emit('approve_request', {
                requestId: request.requestId,
                roomId: canonicalRoomId,
              });
              setPendingRequests((prev) => prev.filter((r) => r.requestId !== request.requestId));
            },
          },
          {
            label: 'Deny',
            variant: 'danger',
            onClick: () => {
              const s = getSocket();
              s.emit('reject_request', {
                requestId: request.requestId,
                roomId: canonicalRoomId,
                reason: 'Declined by Host',
              });
              setPendingRequests((prev) => prev.filter((r) => r.requestId !== request.requestId));
            },
          },
        ],
        15000
      );
    });

    socket.on('request_approved', (data: { requestId: string; action: string; message: string; username?: string }) => {
      setPendingRequests((prev) => prev.filter((r) => r.requestId !== data.requestId));
      addToast('success', data.message || `Request for ${data.action} was approved.`);
    });

    socket.on('request_rejected', (data: { requestId: string; action: string; reason?: string }) => {
      setPendingRequests((prev) => prev.filter((r) => r.requestId !== data.requestId));
      addToast('warning', data.reason || `Request for ${data.action} was declined.`);
    });

    socket.on('action_request_resolved', (data: { approved: boolean; message: string }) => {
      addToast(data.approved ? 'success' : 'warning', data.message);
    });

    socket.on('request_submitted', (data: { message: string }) => {
      addToast('info', data.message || 'Request submitted to Host.');
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
      socket.off('receive_reaction');
      socket.off('control_requested');
      socket.off('control_request_sent');
      socket.off('control_request_resolved');
      socket.off('action_requested');
      socket.off('request_approved');
      socket.off('request_rejected');
      socket.off('action_request_resolved');
      socket.off('request_submitted');
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

  const handleSendReaction = (emoji: string) => {
    const socket = getSocket();
    socket.emit('send_reaction', { roomId: canonicalRoomId, emoji });
  };

  const handleRequestControl = () => {
    const now = Date.now();
    if (now - lastControlRequestTime < 10000) {
      const waitSec = Math.ceil((10000 - (now - lastControlRequestTime)) / 1000);
      addToast('warning', `Please wait ${waitSec}s before requesting control again.`);
      return;
    }
    setLastControlRequestTime(now);
    const socket = getSocket();
    socket.emit('request_action', { roomId: canonicalRoomId, action: 'control' });
    socket.emit('request_control', { roomId: canonicalRoomId });
    addToast('info', 'Control request sent to Host! Awaiting approval...');
  };

  const handleSuggestVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = suggestVideoUrl.trim();
    if (!trimmed) return;
    const extracted = extractYouTubeVideoId(trimmed);
    const cleanId = extracted || trimmed;
    const socket = getSocket();
    socket.emit('request_action', {
      roomId: canonicalRoomId,
      action: 'change_video',
      payload: { videoId: cleanId },
    });
    setIsSuggestModalOpen(false);
    setSuggestVideoUrl('');
    addToast('info', 'Video suggestion submitted to the Host for approval!');
  };

  const handleApprovePendingRequest = (requestId: string) => {
    const socket = getSocket();
    socket.emit('approve_request', { roomId: canonicalRoomId, requestId });
    setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
  };

  const handleRejectPendingRequest = (requestId: string) => {
    const socket = getSocket();
    socket.emit('reject_request', {
      roomId: canonicalRoomId,
      requestId,
      reason: 'Declined by Host',
    });
    setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
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

        {/* Ambient Background Gradient Blobs (Phase 3 OLED Motion) */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 select-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] bg-gradient-to-tr from-cyan-600/12 via-indigo-600/8 to-purple-600/12 rounded-full blur-3xl opacity-50 dark:opacity-25 animate-spin-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-emerald-600/10 via-cyan-600/8 to-blue-600/10 rounded-full blur-3xl opacity-35 dark:opacity-15 animate-pulse" />
        </div>

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

                {isHostOrModerator && (
                  <button
                    type="button"
                    onClick={() => setIsRequestsModalOpen(true)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                      pendingRequests.length > 0
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 animate-pulse'
                        : 'bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10'
                    }`}
                    title="Review incoming control and video requests from participants"
                  >
                    <Bell className={`w-3.5 h-3.5 ${pendingRequests.length > 0 ? 'text-amber-400' : 'text-gray-400'}`} />
                    <span>Requests</span>
                    {pendingRequests.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-black text-[10px] font-bold rounded-full">
                        {pendingRequests.length}
                      </span>
                    )}
                  </button>
                )}
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
              /* Informative status bar for Participants / Viewers with Suggest Video & Request Control */
              <div className="mb-3.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] shadow-sm dark:shadow-none flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300 backdrop-blur-md transition-all duration-300 hover:border-cyan-500/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Radio className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse shrink-0" />
                  <span className="truncate">
                    Watching live with party • Video ID:{' '}
                    <code className="text-cyan-600 dark:text-cyan-400 font-mono font-semibold">
                      {videoState?.videoId || 'None'}
                    </code>
                  </span>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-white/[0.04] px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10 hidden sm:inline">
                    Watch Only Mode
                  </span>
                  <button
                    onClick={() => setIsSuggestModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-600/15 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
                    title="Suggest a YouTube video for the room"
                  >
                    <Tv className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Suggest Video</span>
                  </button>
                  <button
                    onClick={handleRequestControl}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
                    title="Request permission from the Host to control playback and change video"
                  >
                    <Hand className="w-3.5 h-3.5" />
                    <span>Request Control</span>
                  </button>
                </div>
              </div>
            )}

            {/* YouTube Video Player Component */}
            <div className="flex-1 w-full min-h-[420px] sm:min-h-[520px]">
              <YouTubePlayer
                videoId={videoState?.videoId || ''}
                currentTime={videoState?.currentTime || 0}
                playState={videoState?.playState || 'paused'}
                lastUpdated={videoState?.lastUpdated}
                role={currentUserRole}
                canControl={isHostOrModerator}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onChangeVideoClick={() => setIsVideoModalOpen(true)}
                onRequestControl={handleRequestControl}
                onSuggestVideoClick={() => setIsSuggestModalOpen(true)}
                reactions={reactions}
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
                  onSendReaction={handleSendReaction}
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
          currentVideoId={videoState?.videoId || ''}
        />

        {/* Pending Requests Modal (Host/Moderator Review) */}
        {isRequestsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-950/95 p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-4 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Inbox className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Pending Participant Requests</h3>
                    <p className="text-xs text-neutral-400">Approve or deny action requests from room members</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRequestsModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto flex flex-col gap-2.5 py-1">
                {pendingRequests.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400 flex flex-col items-center gap-2">
                    <Inbox className="w-8 h-8 opacity-40 text-neutral-500" />
                    <span>No pending requests at this moment.</span>
                  </div>
                ) : (
                  pendingRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">{req.username}</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {req.action === 'control' ? 'Playback Control' : req.action === 'change_video' ? 'Video Change' : req.action}
                          </span>
                        </div>
                        {req.action === 'change_video' && req.payload?.videoId && (
                          <p className="text-[11px] font-mono text-neutral-400 mt-1 truncate">
                            Video ID: <span className="text-cyan-400">{req.payload.videoId}</span>
                          </p>
                        )}
                        <span className="text-[10px] text-neutral-500 mt-0.5 block">
                          {new Date(req.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApprovePendingRequest(req.requestId)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectPendingRequest(req.requestId)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Deny</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-white/10 pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsRequestsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suggest Video Modal (Participants) */}
        {isSuggestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950/95 p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-4 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Tv className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Suggest a Video</h3>
                    <p className="text-xs text-neutral-400">Send recommendation to the Host for approval</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSuggestModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSuggestVideoSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    YouTube URL or Video ID <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <PlaySquare className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. https://youtu.be/dQw4w9WgXcQ or dQw4w9WgXcQ"
                      value={suggestVideoUrl}
                      onChange={(e) => setSuggestVideoUrl(e.target.value)}
                      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono bg-white/5 text-white border border-white/10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder:text-neutral-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-2">
                    Or select a preset:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { title: 'Synthwave Live', id: '4xDzrJKXOOY' },
                      { title: 'Lofi Chill Girl', id: 'jfKfPfyJRdk' },
                      { title: 'Big Buck Bunny', id: 'aqz-KE-bpKQ' },
                      { title: 'Space Ambient', id: 'mwtbE4SANwc' },
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSuggestVideoUrl(preset.id)}
                        className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-all cursor-pointer group"
                      >
                        <span className="text-[11px] font-medium text-neutral-300 group-hover:text-cyan-400 block truncate">
                          {preset.title}
                        </span>
                        <span className="text-[9px] font-mono text-neutral-500 block truncate">
                          {preset.id}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsSuggestModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!suggestVideoUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                  >
                    Submit Suggestion
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Floating Notifications */}
        <ToastContainer toasts={toasts || []} onDismiss={handleDismissToast} />
      </div>
    </ErrorBoundary>
  );
};
