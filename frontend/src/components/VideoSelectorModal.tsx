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

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-white dark:bg-black/95 border border-gray-200 dark:border-white/[0.12] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
              <PlaySquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Change Video</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Load a YouTube video for everyone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              YouTube URL or Video ID
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... or Video ID"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setError('');
                }}
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono bg-white text-gray-900 border border-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:bg-white/5 dark:text-white dark:border-white/10 dark:placeholder-gray-500 placeholder:text-gray-400 focus:outline-none transition-colors"
              />
              <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 pointer-events-none" />
            </div>
            {error && <p className="text-xs text-rose-500 mt-1.5 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
          >
            Load Video for Room
          </button>
        </form>

        {/* Popular Presets */}
        <div className="mt-5 pt-4 border-t border-gray-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Popular Presets</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PRESET_VIDEOS.map((video) => (
              <button
                key={video.id}
                onClick={() => handleSelectPreset(video.id)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  currentVideoId === video.id
                    ? 'border-cyan-500/50 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 shadow-sm'
                    : 'border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.06]'
                }`}
              >
                <Film className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{video.title}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{video.channel}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
