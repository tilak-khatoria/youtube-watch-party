import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { Send, Crown, ShieldCheck, User, Smile } from 'lucide-react';

interface LiveChatProps {
  messages: ChatMessage[];
  currentUserId?: string;
  onSendMessage: (message: string) => void;
}

const QUICK_EMOJIS = ['🔥', '🍿', '😂', '👏', '❤️', '🎉'];

export const LiveChat: React.FC<LiveChatProps> = ({
  messages,
  currentUserId,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleSendEmoji = (emoji: string) => {
    onSendMessage(emoji);
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(messages || []).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
            <Smile className="w-7 h-7 text-neutral-500 mb-2" />
            <p className="text-xs font-medium text-neutral-300">No messages yet</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Say hello or react with an emoji!
            </p>
          </div>
        ) : (
          (messages || []).map((msg) => {
            const isSelf = msg?.senderId === currentUserId;
            const isHost = msg?.role === 'Host';
            const isMod = msg?.role === 'Moderator';
            const senderName = msg?.username || 'Guest';

            return (
              <div
                key={msg?.id || Math.random().toString()}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                {/* Header info */}
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-medium text-neutral-300">
                    {senderName}
                  </span>

                  {isHost && (
                    <span className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Crown className="w-2.5 h-2.5 text-amber-400" /> Host
                    </span>
                  )}
                  {isMod && (
                    <span className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" /> Mod
                    </span>
                  )}
                  {!isHost && !isMod && (
                    <span className="flex items-center gap-0.5 text-[9px] text-neutral-400 px-1 py-0.2 rounded bg-white/[0.04]">
                      <User className="w-2.5 h-2.5 text-neutral-400" /> Viewer
                    </span>
                  )}

                  <span className="text-[10px] text-neutral-500 font-mono">
                    {formatTime(msg?.timestamp || Date.now())}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs max-w-[85%] break-words shadow-sm ${
                    isSelf
                      ? 'bg-cyan-500 text-black font-medium rounded-tr-none'
                      : 'bg-white/[0.05] text-neutral-200 border border-white/[0.08] rounded-tl-none'
                  }`}
                >
                  {msg?.message || ''}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reaction Bar */}
      <div className="px-3 py-1 border-t border-white/[0.08] flex items-center gap-1.5 overflow-x-auto bg-black/40">
        <span className="text-[10px] font-medium text-neutral-500 uppercase shrink-0">
          React:
        </span>
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSendEmoji(emoji)}
            className="hover:scale-110 transition-transform text-sm px-1 py-0.5 rounded hover:bg-white/10 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-2.5 border-t border-white/[0.08] bg-black/60 flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="Send a chat message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 glass-input rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black transition-colors shrink-0 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
