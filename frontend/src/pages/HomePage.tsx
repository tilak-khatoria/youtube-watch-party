import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { extractYouTubeVideoId, normalizeRoomId } from '../utils/youtube';
import {
  PlusCircle,
  LogIn,
  Shield,
  Zap,
  Users,
  Film,
  User,
  Hash,
  Video,
  Link as LinkIcon,
  Loader2,
  Play,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // Create Room State
  const [createUsername, setCreateUsername] = useState('');
  const [customRoomId, setCustomRoomId] = useState('');
  const [initialVideoUrl, setInitialVideoUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Join Room State
  const [joinUsername, setJoinUsername] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const generateRandomCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `party-${code}`;
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsCreating(true);

    const username = createUsername.trim() || `Host_${Math.floor(1000 + Math.random() * 9000)}`;
    const rawId = customRoomId.trim() || generateRandomCode();
    const roomId = normalizeRoomId(rawId);

    // Safely extract YouTube video ID if URL or ID provided, fallback to default
    let cleanVideoId = 'dQw4w9WgXcQ';
    if (initialVideoUrl.trim()) {
      const extracted = extractYouTubeVideoId(initialVideoUrl.trim());
      cleanVideoId = extracted || initialVideoUrl.trim();
    }

    // Store preferred username, role, and creator identity for persistence across refresh
    localStorage.setItem('syncparty_username', username);
    localStorage.setItem(`syncparty_room_${roomId}_role`, 'Host');
    localStorage.setItem(`syncparty_room_${roomId}_creator`, username);

    setTimeout(() => {
      navigate(`/room/${roomId}`, {
        state: {
          username,
          videoId: cleanVideoId,
          initialVideoId: cleanVideoId,
          isCreator: true,
        },
      });
    }, 200);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!joinRoomId.trim()) {
      setErrorMessage('Please enter a valid Room Code or URL.');
      return;
    }

    setIsJoining(true);
    const cleanRoomId = normalizeRoomId(joinRoomId);

    const username = joinUsername.trim() || `Viewer_${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem('syncparty_username', username);
    const existingCreator = localStorage.getItem(`syncparty_room_${cleanRoomId}_creator`);
    const isReturningHost = Boolean(existingCreator && existingCreator.toLowerCase() === username.toLowerCase());
    if (!isReturningHost) {
      localStorage.setItem(`syncparty_room_${cleanRoomId}_role`, 'Participant');
    }

    setTimeout(() => {
      navigate(`/room/${cleanRoomId}`, {
        state: {
          username,
          isCreator: isReturningHost,
        },
      });
    }, 200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-pure-black text-on-surface antialiased transition-colors">
      {/* Sticky Glass Navbar */}
      <Navbar />

      {/* Main Content Container */}
      <main className="w-full pt-6 bg-pure-black flex-1">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-y-12">
          {/* Hero Section */}
          <section className="flex flex-col items-center text-center">
            {/* Announcement Capsule */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-glass-base border border-border-subtle shadow-sm mb-6">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs uppercase tracking-wider font-medium text-text-secondary">
                Engine v2.4 Active · Frame-Perfect Sync
              </span>
            </div>

            {/* Hero Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-text-primary leading-tight max-w-4xl">
              Watch YouTube Together in{' '}
              <span className="text-primary-container">Real-Time</span>
            </h1>

            {/* Sub-headline */}
            <p className="mt-5 max-w-2xl mx-auto text-sm sm:text-base font-normal text-text-secondary leading-relaxed">
              Sub-millisecond synchronized playback, encrypted chat rooms, and seamless collaborative queues without distractions.
            </p>

            {/* Key Performance Metrics Strip */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-text-muted text-xs">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span>&lt;12ms Engine Latency</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-white/20"></span>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>P2P Encrypted Session State</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-white/20"></span>
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                <span>Up to 4K 60fps Native Streams</span>
              </div>
            </div>
          </section>

          {/* Action Cards: Create vs Join Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Card 1: Create Party */}
            <div className="group bg-glass-base backdrop-blur-md border border-border-subtle rounded-xl p-6 sm:p-8 flex flex-col justify-between hover:border-border-hover transition-all duration-200">
              <div className="flex flex-col">
                {/* Card Header */}
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="w-11 h-11 rounded-lg bg-glass-recessed border border-border-subtle flex items-center justify-center text-primary">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-glass-recessed border border-border-subtle text-primary">
                    Host
                  </span>
                </div>
                <h2 className="text-xl font-medium text-text-primary tracking-tight">Create a Room</h2>
                <p className="text-xs sm:text-sm text-text-secondary mt-2 leading-normal">
                  Instantly generate an ultra-low latency synced room and control the live playback buffer.
                </p>

                {/* Form Fields */}
                <form onSubmit={handleCreateRoom} id="create-room-form" className="mt-6 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-secondary flex items-center justify-between">
                      <span>Display Name</span>
                      <span className="text-text-muted">Required</span>
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 absolute left-3.5 text-text-muted pointer-events-none" />
                      <input
                        type="text"
                        placeholder="e.g. Alex (Host)"
                        value={createUsername}
                        onChange={(e) => setCreateUsername(e.target.value)}
                        className="w-full bg-glass-recessed border border-border-subtle rounded-lg pl-10 pr-4 py-3 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-container focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-secondary">
                      Custom Room Code <span className="text-text-muted font-normal">(Optional)</span>
                    </label>
                    <div className="relative flex items-center">
                      <Hash className="w-4 h-4 absolute left-3.5 text-text-muted pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Leave empty for random"
                        value={customRoomId}
                        onChange={(e) => setCustomRoomId(e.target.value)}
                        className="w-full bg-glass-recessed border border-border-subtle rounded-lg pl-10 pr-4 py-3 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-primary-container focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-secondary">
                      Initial YouTube Video <span className="text-text-muted font-normal">(Optional)</span>
                    </label>
                    <div className="relative flex items-center">
                      <Video className="w-4 h-4 absolute left-3.5 text-text-muted pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Paste YouTube URL or ID"
                        value={initialVideoUrl}
                        onChange={(e) => setInitialVideoUrl(e.target.value)}
                        className="w-full bg-glass-recessed border border-border-subtle rounded-lg pl-10 pr-4 py-3 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-primary-container focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </form>
              </div>

              {/* Submit Button */}
              <div className="mt-8 pt-5 border-t border-border-subtle">
                <button
                  type="submit"
                  form="create-room-form"
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 bg-primary-container hover:bg-primary-hover text-pure-black font-semibold py-3 px-6 rounded-lg transition-all duration-150 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Initializing...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Create Sync Room</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 2: Join Party */}
            <div className="group bg-glass-base backdrop-blur-md border border-border-subtle rounded-xl p-6 sm:p-8 flex flex-col justify-between hover:border-border-hover transition-all duration-200">
              <div className="flex flex-col">
                {/* Card Header */}
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="w-11 h-11 rounded-lg bg-glass-recessed border border-border-subtle flex items-center justify-center text-primary">
                    <LogIn className="w-5 h-5" />
                  </div>
                  <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-glass-recessed border border-border-subtle text-text-secondary">
                    Guest
                  </span>
                </div>
                <h2 className="text-xl font-medium text-text-primary tracking-tight">Join Existing Room</h2>
                <p className="text-xs sm:text-sm text-text-secondary mt-2 leading-normal">
                  Enter a party code or link to jump straight into the session with zero account overhead.
                </p>

                {/* Form Fields */}
                <form onSubmit={handleJoinRoom} id="join-room-form" className="mt-6 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-secondary flex items-center justify-between">
                      <span>Party Code or Invite Link</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <LinkIcon className="w-4 h-4 absolute left-3.5 text-text-muted pointer-events-none" />
                      <input
                        type="text"
                        placeholder="e.g. party-xyz123 or paste link"
                        value={joinRoomId}
                        onChange={(e) => {
                          setJoinRoomId(e.target.value);
                          setErrorMessage('');
                        }}
                        required
                        className="w-full bg-glass-recessed border border-border-subtle rounded-lg pl-10 pr-4 py-3 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-primary-container focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-secondary">
                      Your Display Nickname
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 absolute left-3.5 text-text-muted pointer-events-none" />
                      <input
                        type="text"
                        placeholder="e.g. Sarah (Viewer)"
                        value={joinUsername}
                        onChange={(e) => setJoinUsername(e.target.value)}
                        className="w-full bg-glass-recessed border border-border-subtle rounded-lg pl-10 pr-4 py-3 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-container focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <p className="text-xs text-rose-400 font-medium">{errorMessage}</p>
                  )}
                </form>
              </div>

              {/* Submit Button */}
              <div className="mt-8 pt-5 border-t border-border-subtle">
                <button
                  type="submit"
                  form="join-room-form"
                  disabled={isJoining}
                  className="w-full flex items-center justify-center gap-2 bg-primary-container hover:bg-primary-hover text-pure-black font-semibold py-3 px-6 rounded-lg transition-all duration-150 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Joining Party...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Enter Watch Party</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Visual Session Preview Panel */}
          <section className="bg-glass-base backdrop-blur-md border border-border-subtle rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 justify-between">
            <div className="flex flex-col max-w-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-secondary"></span>
                <span className="text-xs uppercase tracking-wider font-semibold text-secondary">
                  Active Public Session
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-medium text-text-primary tracking-tight">
                Interstellar Deep Dive · 4K 60fps Community Watch
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-normal">
                Currently hosting synchronized listeners with host timestamp authoritative sync.
              </p>
              <div className="mt-4 flex items-center gap-4 text-text-muted text-xs">
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Live Sync</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> 0ms Drift</span>
                <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> P2P Protected</span>
              </div>
            </div>

            <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setJoinRoomId('party-demo123')}
                className="w-full sm:w-auto px-5 py-3 rounded-lg bg-glass-elevated border border-border-focus hover:border-border-hover text-text-primary text-xs font-medium flex items-center justify-center gap-2 hover:bg-white/[0.08] transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 text-primary fill-current" />
                <span>Quick Connect #DEMO</span>
              </button>
            </div>
          </section>

          {/* 4-Column Feature Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="bg-glass-base backdrop-blur-sm border border-white/[0.06] rounded-lg p-5 hover:border-border-subtle transition-colors flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-glass-recessed border border-border-subtle flex items-center justify-center text-primary mb-4">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-medium text-text-primary tracking-tight">Sub-50ms Drift Guard</h4>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                  Continuous timestamp alignment guarantees everyone experiences key climaxes simultaneously.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-white/[0.04] flex items-center justify-between text-text-muted text-xs">
                <span>Clock Precision</span>
                <span className="text-primary font-medium">±16ms Max</span>
              </div>
            </div>

            <div className="bg-glass-base backdrop-blur-sm border border-white/[0.06] rounded-lg p-5 hover:border-border-subtle transition-colors flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-glass-recessed border border-border-subtle flex items-center justify-center text-primary mb-4">
                  <Shield className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-medium text-text-primary tracking-tight">Zero Extension Required</h4>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                  Works straight inside Chromium, Safari, Firefox, and mobile engines via standard iframe bridge APIs.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-white/[0.04] flex items-center justify-between text-text-muted text-xs">
                <span>Installation</span>
                <span className="text-secondary font-medium">None</span>
              </div>
            </div>

            <div className="bg-glass-base backdrop-blur-sm border border-white/[0.06] rounded-lg p-5 hover:border-border-subtle transition-colors flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-glass-recessed border border-border-subtle flex items-center justify-center text-primary mb-4">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-medium text-text-primary tracking-tight">Auto-Transfer Failover</h4>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                  Automatic room leadership transfer ensures the watch party never freezes if the host leaves.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-white/[0.04] flex items-center justify-between text-text-muted text-xs">
                <span>Leadership</span>
                <span className="text-text-primary font-medium">Auto-Host</span>
              </div>
            </div>

            <div className="bg-glass-base backdrop-blur-sm border border-white/[0.06] rounded-lg p-5 hover:border-border-subtle transition-colors flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-glass-recessed border border-border-subtle flex items-center justify-center text-primary mb-4">
                  <Film className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-medium text-text-primary tracking-tight">Lossless Passthrough</h4>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                  Audio and visual data streams come directly from primary YouTube CDNs without downscaling.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-white/[0.04] flex items-center justify-between text-text-muted text-xs">
                <span>Quality Loss</span>
                <span className="text-primary font-medium">0%</span>
              </div>
            </div>
          </section>

          {/* Technical Status Bar */}
          <section className="bg-glass-recessed border border-border-subtle rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="text-xs text-text-primary">
                WebSocket Mesh Relay: <strong className="font-semibold text-secondary">Connected</strong>
              </span>
            </div>
            <div className="flex items-center gap-6 text-xs text-text-muted">
              <span>Packet Jitter: <strong>0.4ms</strong></span>
              <span>Clock Skew: <strong>-2.1ms</strong></span>
              <span>Protocol: <strong>SyncProtocol v2.4 (OLED-Native)</strong></span>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-pure-black border-t border-border-subtle py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-glass-base border border-border-subtle">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary"></span>
              <span className="text-xs text-text-muted">Latency: 12ms</span>
            </div>
            <span className="text-xs text-text-muted">Global Cluster: us-east</span>
          </div>
          <p className="text-xs text-text-muted">© 2024 SyncParty. Pure OLED architecture.</p>
        </div>
      </footer>
    </div>
  );
};
