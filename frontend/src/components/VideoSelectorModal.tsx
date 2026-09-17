import React, { useState } from 'react';
import { X, Film, Sparkles, Search, PlaySquare } from 'lucide-react';

interface VideoSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (videoId: string) => void;
  currentVideoId?: string;
}

const PRESET_VIDEOS = [
  {
    title: 'Lofi Hip Hop - Chill Beats to Relax/Study',
    id: 'jfKfPfyJRdk',
    channel: 'Lofi Girl',
    category: 'Music',
  },
  {
    title: 'Synthwave Radio - Chill Synth / Retro Beats',
    id: '4xDzrJKXOOY',
    channel: 'Lofi Girl',
    category: 'Vibes',
  },
  {
    title: 'Cosmic Relaxing Ambient Space Journey',
    id: 'libKVRa0740',
    channel: 'Space Ambience',
    category: 'Cinematic',
  },
  {
    title: 'Rick Astley - Never Gonna Give You Up',
    id: 'dQw4w9WgXcQ',
    channel: 'Rick Astley',
    category: 'Classics',
  },
];

export const VideoSelectorModal: React.FC<VideoSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectVideo,
  currentVideoId,
}) => {
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const extractVideoId = (urlOrId: string): string | null => {
    const trimmed = urlOrId.trim();
    if (!trimmed) return null;

    // Direct 11-char ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    // YouTube URLs: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, etc.
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = trimmed.match(regExp);

    if (match && match[2] && match[2].length === 11) {
      return match[2];
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const videoId = extractVideoId(inputUrl);
    if (!videoId) {
      setError('Please enter a valid YouTube URL or 11-character Video ID.');
      return;
    }

    onSelectVideo(videoId);
    setInputUrl('');
    onClose();
  };

  const handleSelectPreset = (id: string) => {
    onSelectVideo(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#121420] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <PlaySquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Change Video</h3>
              <p className="text-xs text-slate-400">Load a YouTube video for everyone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              YouTube URL or Video ID
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... or Video ID"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setError('');
                }}
                className="w-full bg-slate-900/90 border border-white/10 focus:border-rose-500 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 transition-all font-mono"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
            {error && <p className="text-xs text-rose-400 mt-1.5 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Load Video for Room
          </button>
        </form>

        {/* Popular Presets */}
        <div className="mt-6 pt-5 border-t border-white/10 relative z-10">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Popular Presets</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PRESET_VIDEOS.map((video) => (
              <button
                key={video.id}
                onClick={() => handleSelectPreset(video.id)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                  currentVideoId === video.id
                    ? 'border-rose-500/50 bg-rose-500/10'
                    : 'border-white/5 bg-slate-900/60 hover:bg-slate-800/80 hover:border-white/15'
                }`}
              >
                <Film className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">{video.title}</p>
                  <p className="text-[10px] text-slate-500">{video.channel}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
