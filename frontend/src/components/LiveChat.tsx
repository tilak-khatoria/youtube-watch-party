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
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-text-muted">
            <Smile className="w-8 h-8 text-text-muted mb-2.5 opacity-60" />
            <p className="text-xs font-semibold text-text-primary">No messages yet</p>
            <p className="text-[11px] text-text-muted mt-1">
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
                  <span className="text-[11px] font-semibold text-text-primary">
                    {senderName}
                  </span>

                  {isHost && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/25">
                      <Crown className="w-2.5 h-2.5 text-tertiary" /> Host
                    </span>
                  )}
                  {isMod && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/25">
                      <ShieldCheck className="w-2.5 h-2.5 text-primary" /> Mod
                    </span>
                  )}
                  {!isHost && !isMod && (
                    <span className="flex items-center gap-0.5 text-[9px] text-text-muted px-1.5 py-0.2 rounded-full bg-neutral-100 dark:bg-white/[0.04]">
                      <User className="w-2.5 h-2.5 text-text-muted" /> Viewer
                    </span>
                  )}

                  <span className="text-[10px] text-text-muted font-mono">
                    {formatTime(msg?.timestamp || Date.now())}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`px-3.5 py-2 rounded-2xl text-xs max-w-[85%] break-words shadow-sm ${
                    isSelf
                      ? 'bg-cyan-600 text-white font-medium rounded-tr-xs'
                      : 'bg-gray-100 dark:bg-white/[0.05] text-gray-900 dark:text-white border border-gray-200 dark:border-white/[0.08] rounded-tl-xs'
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
      <div className="px-3 py-1.5 border-t border-gray-200 dark:border-white/[0.08] flex items-center gap-1.5 overflow-x-auto bg-gray-50/80 dark:bg-black/40 backdrop-blur-sm">
        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase shrink-0">
          React:
        </span>
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSendEmoji(emoji)}
            className="hover:scale-125 transition-transform text-sm px-1.5 py-0.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-gray-200 dark:border-white/[0.08] bg-white dark:bg-black/60 flex items-center gap-2 backdrop-blur-md"
      >
        <input
          type="text"
          placeholder="Send a chat message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 rounded-xl px-3.5 py-2 text-xs bg-white text-gray-900 border border-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:bg-white/5 dark:text-white dark:border-white/10 dark:placeholder-gray-500 placeholder:text-gray-400 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shrink-0 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
