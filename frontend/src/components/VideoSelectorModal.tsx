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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#181a26] border border-border-focus rounded-2xl max-w-lg w-full p-6 shadow-oled-2xl relative overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-border-subtle flex items-center justify-center text-primary">
              <PlaySquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-text-primary">Change Video</h3>
              <p className="text-xs text-text-secondary">Load a YouTube video for everyone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
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
                className="w-full glass-input rounded-lg px-3.5 py-2 pl-9 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
            </div>
            {error && <p className="text-xs text-error mt-1 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-primary-container hover:bg-primary-hover text-pure-black font-semibold text-xs transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
          >
            Load Video for Room
          </button>
        </form>

        {/* Popular Presets */}
        <div className="mt-5 pt-4 border-t border-border-subtle">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary mb-2.5">
            <Sparkles className="w-3 h-3 text-tertiary" />
            <span>Popular Presets</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_VIDEOS.map((video) => (
              <button
                key={video.id}
                onClick={() => handleSelectPreset(video.id)}
                className={`flex items-start gap-2.5 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                  currentVideoId === video.id
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border-subtle bg-white/[0.02] hover:bg-white/[0.06]'
                }`}
              >
                <Film className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-on-surface truncate">{video.title}</p>
                  <p className="text-[10px] text-text-muted">{video.channel}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
