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

    // YouTube URLs
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <div className="bg-[#25252d] border border-white/15 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#19191f] border border-[#00D4FF]/40 flex items-center justify-center text-[#00d2fd]">
              <PlaySquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#f9f5fd] font-space">CHANGE VIDEO</h3>
              <p className="text-xs text-[#acaab1]">Load a YouTube video for everyone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#acaab1] hover:text-[#f9f5fd] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold space-label text-[#acaab1] mb-1.5">
              YOUTUBE URL OR VIDEO ID
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
                className="w-full glass-input rounded-xl px-4 py-2.5 pl-10 text-xs font-mono text-[#f9f5fd] placeholder-[#76747b] focus:outline-none"
              />
              <Search className="w-4 h-4 text-[#76747b] absolute left-3.5 top-3" />
            </div>
            {error && <p className="text-xs text-rose-400 mt-1.5 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full btn-kinetic py-3 px-4 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>LOAD VIDEO FOR ROOM</span>
          </button>
        </form>

        {/* Popular Presets */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-xs font-space font-bold text-[#00d2fd] mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>POPULAR PRESETS</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_VIDEOS.map((video) => (
              <button
                key={video.id}
                onClick={() => handleSelectPreset(video.id)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  currentVideoId === video.id
                    ? 'border-[#00D4FF]/60 bg-cyan-500/15'
                    : 'border-white/10 bg-[#19191f] hover:bg-[#25252d]'
                }`}
              >
                <Film className="w-4 h-4 text-[#00d2fd] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#f9f5fd] truncate">{video.title}</p>
                  <p className="text-[10px] text-[#acaab1] space-label">{video.channel}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
