import React, { useEffect, useState, useCallback } from 'react';
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
import { extractYouTubeVideoId } from '../utils/youtube';
import { Navbar } from '../components/Navbar';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { ParticipantList } from '../components/ParticipantList';
import { LiveChat } from '../components/LiveChat';
import { VideoSelectorModal } from '../components/VideoSelectorModal';
import { ToastContainer } from '../components/Toast';
import {
  Users,
  MessageSquare,
  Share2,
  Check,
  Crown,
  Shield,
  Eye,
  AlertTriangle,
  PlaySquare,
  Sparkles,
} from 'lucide-react';

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Route State passed from Home
  const stateUsername = location.state?.username;
  const initialVideoId = location.state?.initialVideoId;

  // Local User State
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [username] = useState<string>(
    stateUsername || localStorage.getItem('syncparty_username') || `User_${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [currentUserRole, setCurrentUserRole] = useState<ParticipantRole>('Participant');

  // Room & Video State
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [videoState, setVideoState] = useState<VideoState>({
    videoId: initialVideoId || 'dQw4w9WgXcQ',
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

  // Helper to add toast notifications
  const addToast = useCallback((type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const newToast: NotificationToast = {
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      message,
      timestamp: Date.now(),
    };
    setToasts((prev) => [...prev.slice(-4), newToast]);

    // Auto dismiss after 4.5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4500);
  }, []);

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Socket Connection and Event Listeners
  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    const socket = getSocket();

    // 1. Connection lifecycle
    socket.on('connect', () => {
      console.log('[Socket Connected]:', socket.id);
      setCurrentUserId(socket.id || '');

      // Join the room
      socket.emit('join_room', {
        roomId,
        username,
      });
    });

    // If socket is already connected when mounting
    if (socket.connected) {
      setCurrentUserId(socket.id || '');
      socket.emit('join_room', {
        roomId,
        username,
      });
    }

    // 2. Room Joined confirmation
    socket.on('room_joined', (data: { roomId: string; participant: ParticipantData; room: RoomData }) => {
      console.log('[Room Joined]:', data);
      setCurrentUserId(data.participant.id);
      setCurrentUserRole(data.participant.role);
      setParticipants(data.room.participants);
      if (data.room.videoState) {
        setVideoState(data.room.videoState);
      }
      addToast('success', `Joined room ${data.roomId} as ${data.participant.role}`);
    });

    // 3. Participants Update
    socket.on('participants_updated', (data: { participants: ParticipantData[]; hostId: string }) => {
      setParticipants(data.participants);

      // Update current user role if updated
      const self = data.participants.find((p) => p.id === socket.id);
      if (self) {
        setCurrentUserRole(self.role);
      }
    });

    // 4. User Joined Notification
    socket.on('user_joined', (data: { participant: ParticipantData; message: string }) => {
      addToast('info', data.message || `${data.participant.username} joined.`);
    });

    // 5. User Left Notification
    socket.on('user_left', (data: { participant: ParticipantData; message: string }) => {
      addToast('info', data.message || `${data.participant.username} left.`);
    });

    // 6. Video State Sync Listeners
    socket.on('sync_state', (data: VideoState & { triggeredBy?: ParticipantData }) => {
      setVideoState({
        videoId: data.videoId,
        currentTime: data.currentTime,
        playState: data.playState,
        lastUpdated: data.lastUpdated || Date.now(),
      });
    });

    socket.on('play', (data: VideoState & { triggeredBy?: ParticipantData }) => {
      setVideoState((prev) => ({
        ...prev,
        playState: 'playing',
        currentTime: data.currentTime,
        lastUpdated: data.lastUpdated || Date.now(),
      }));
      if (data.triggeredBy && data.triggeredBy.id !== socket.id) {
        addToast('info', `▶️ ${data.triggeredBy.username} played video`);
      }
    });

    socket.on('pause', (data: VideoState & { triggeredBy?: ParticipantData }) => {
      setVideoState((prev) => ({
        ...prev,
        playState: 'paused',
        currentTime: data.currentTime,
        lastUpdated: data.lastUpdated || Date.now(),
      }));
      if (data.triggeredBy && data.triggeredBy.id !== socket.id) {
        addToast('info', `⏸️ ${data.triggeredBy.username} paused video`);
      }
    });

    socket.on('seek', (data: VideoState & { triggeredBy?: ParticipantData }) => {
      setVideoState((prev) => ({
        ...prev,
        currentTime: data.currentTime,
        lastUpdated: data.lastUpdated || Date.now(),
      }));
    });

    socket.on('video_changed', (data: { videoId: string; changedBy?: ParticipantData; room?: RoomData }) => {
      setVideoState({
        videoId: data.videoId,
        currentTime: 0,
        playState: 'playing',
        lastUpdated: Date.now(),
      });
      addToast('info', `🎬 Video changed by ${data.changedBy?.username || 'Host'}`);
    });

    // 7. Role Assigned Notification
    socket.on('role_assigned', (data: any) => {
      if (data.userId === socket.id) {
        setCurrentUserRole(data.role);
        addToast(
          'success',
          `👑 You were assigned the role of ${data.role}!`
        );
      } else {
        addToast('info', data.message || `${data.username} is now ${data.role}.`);
      }
    });

    // 8. Host Changed
    socket.on('host_changed', (data: any) => {
      if (data.newHostId === socket.id) {
        setCurrentUserRole('Host');
        addToast('success', '👑 You are now the Room Host!');
      } else {
        addToast('warning', data.message || `Host transferred to ${data.newHost?.username}`);
      }
    });

    // 9. Participant Removed / Kicked
    socket.on('participant_removed', (data: any) => {
      addToast('warning', data.message || `${data.username} was removed from the room.`);
    });

    socket.on('kicked_from_room', (data: any) => {
      alert(data.message || 'You have been removed from the watch party by the Host.');
      navigate('/');
    });

    // 10. Action Rejection / Error messages
    socket.on('action_rejected', (data: { action: string; message: string; requiredRoles?: string[] }) => {
      addToast('error', `🚫 ${data.message}`);
    });

    socket.on('error_message', (data: { message: string }) => {
      addToast('error', data.message);
    });

    // 11. Live Chat
    socket.on('receive_message', (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
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
  }, [roomId, username, navigate, addToast]);

  // RBAC Permission Check: Can current user control playback / change video?
  const canControl = currentUserRole === 'Host' || currentUserRole === 'Moderator';

  // Sockets Emitters
  const handlePlay = (time: number) => {
    if (!canControl) return;
    const socket = getSocket();
    socket.emit('play', { roomId, currentTime: time });
  };

  const handlePause = (time: number) => {
    if (!canControl) return;
    const socket = getSocket();
    socket.emit('pause', { roomId, currentTime: time });
  };

  const handleSeek = (time: number) => {
    if (!canControl) return;
    const socket = getSocket();
    socket.emit('seek', { roomId, currentTime: time });
  };

  const handleChangeVideo = (newVideoId: string) => {
    if (!canControl) {
      addToast('error', 'Only Host and Moderators can change the video.');
      return;
    }
    const socket = getSocket();
    socket.emit('change_video', { roomId, videoId: newVideoId });
  };

  const handleInlineUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineVideoUrl.trim()) return;

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
    socket.emit('assign_role', { roomId, userId, role });
  };

  const handleRemoveParticipant = (userId: string) => {
    const socket = getSocket();
    socket.emit('remove_participant', { roomId, userId });
  };

  const handleSendMessage = (message: string) => {
    const socket = getSocket();
    socket.emit('send_message', { roomId, message });
  };

  const handleLeaveRoom = () => {
    const socket = getSocket();
    socket.emit('leave_room', { roomId });
    navigate('/');
  };

  const handleCopyInviteLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    addToast('success', 'Invite link copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#08090f] text-slate-100">
      <Navbar
        roomId={roomId}
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
              <span className="text-xs font-semibold text-slate-400">Current Room:</span>
              <span className="text-xs font-mono font-bold text-white bg-slate-900 border border-white/10 px-2.5 py-1 rounded-lg">
                {roomId}
              </span>
              <button
                onClick={handleCopyInviteLink}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all hover:scale-105"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
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
              {currentUserRole === 'Host' && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
                  <Crown className="w-3.5 h-3.5" /> You are the Host
                </span>
              )}
              {currentUserRole === 'Moderator' && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full">
                  <Shield className="w-3.5 h-3.5" /> Moderator Controls Enabled
                </span>
              )}
              {(currentUserRole === 'Participant' || currentUserRole === 'Viewer') && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-900 border border-white/10 px-3 py-1 rounded-full">
                  <Eye className="w-3.5 h-3.5 text-slate-500" /> Viewer Mode (Controls Locked)
                </span>
              )}
            </div>
          </div>

          {/* YouTube Video URL Input Field for Host / Moderator */}
          {canControl ? (
            <form
              onSubmit={handleInlineUrlSubmit}
              className="mb-3 p-2 rounded-2xl glass-panel border border-white/10 flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Paste new YouTube URL or Video ID to change video..."
                  value={inlineVideoUrl}
                  onChange={(e) => setInlineVideoUrl(e.target.value)}
                  className="w-full bg-slate-950/90 border border-white/10 rounded-xl px-4 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all font-mono"
                />
                <PlaySquare className="w-4 h-4 text-rose-500 absolute left-3 top-2.5" />
              </div>

              <button
                type="submit"
                disabled={!inlineVideoUrl.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all hover:scale-105 shrink-0 flex items-center gap-1.5"
              >
                <span>Change Video</span>
              </button>

              <button
                type="button"
                onClick={() => setIsVideoModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold transition-all hover:scale-105 shrink-0 flex items-center gap-1"
                title="Browse video presets"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Presets</span>
              </button>
            </form>
          ) : (
            <div className="mb-3 px-3 py-1.5 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Now Playing: <code className="text-indigo-300 font-mono">{videoState.videoId}</code></span>
              </div>
              <span className="text-[11px] text-slate-500">Only Host/Mods can change the video</span>
            </div>
          )}

          {/* YouTube Video Player Component */}
          <div className="flex-1 w-full min-h-[420px] sm:min-h-[500px]">
            <YouTubePlayer
              videoId={videoState.videoId}
              currentTime={videoState.currentTime}
              playState={videoState.playState}
              lastUpdated={videoState.lastUpdated}
              canControl={canControl}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              onChangeVideoClick={() => setIsVideoModalOpen(true)}
            />
          </div>

          {/* Viewer notice banner if participant */}
          {!canControl && (
            <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Playback is synchronized with the Host and Moderators. Viewer controls are read-only.</span>
              </div>
            </div>
          )}
        </section>

        {/* Right Sidebar: Participants & Live Chat */}
        <aside className="w-full lg:w-96 flex flex-col glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl h-[580px] lg:h-auto shrink-0">
          {/* Sidebar Tab Header */}
          <div className="flex items-center border-b border-white/10 bg-[#0e1018]">
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'participants'
                  ? 'border-indigo-500 text-white bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Participants ({participants.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'chat'
                  ? 'border-indigo-500 text-white bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Live Chat ({chatMessages.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === 'participants' ? (
              <ParticipantList
                participants={participants}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onAssignRole={handleAssignRole}
                onRemoveParticipant={handleRemoveParticipant}
              />
            ) : (
              <LiveChat
                messages={chatMessages}
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
        currentVideoId={videoState.videoId}
      />

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
};
