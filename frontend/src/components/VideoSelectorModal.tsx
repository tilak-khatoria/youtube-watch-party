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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md">
      <div className="bg-white dark:bg-black border border-zinc-200 dark:border-white/[0.08] rounded-2xl max-w-lg w-full p-6 shadow-oled relative overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/[0.08] flex items-center justify-center text-sky-500">
              <PlaySquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">Change Video</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Load a YouTube video for everyone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
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
                className="w-full glass-input rounded-lg px-3.5 py-2 pl-9 text-xs font-mono text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-2.5" />
            </div>
            {error && <p className="text-xs text-rose-500 mt-1 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-black font-semibold text-xs transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
          >
            Load Video for Room
          </button>
        </form>

        {/* Popular Presets */}
        <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Popular Presets</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_VIDEOS.map((video) => (
              <button
                key={video.id}
                onClick={() => handleSelectPreset(video.id)}
                className={`flex items-start gap-2.5 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                  currentVideoId === video.id
                    ? 'border-sky-500/50 bg-sky-500/10'
                    : 'border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.02] hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
                }`}
              >
                <Film className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-200 truncate">{video.title}</p>
                  <p className="text-[10px] text-zinc-500">{video.channel}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
