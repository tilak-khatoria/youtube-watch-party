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
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/30 transition-colors">
      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(messages || []).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
            <Smile className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-2" />
            <p className="text-xs font-medium">No messages yet</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-600 mt-0.5">
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
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {senderName}
                  </span>

                  {isHost && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      <Crown className="w-2.5 h-2.5 text-amber-500" /> Host
                    </span>
                  )}
                  {isMod && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                      <ShieldCheck className="w-2.5 h-2.5 text-cyan-500" /> Mod
                    </span>
                  )}
                  {!isHost && !isMod && (
                    <span className="flex items-center gap-0.5 text-[9px] text-slate-500 dark:text-slate-400 px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800">
                      <User className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" /> Viewer
                    </span>
                  )}

                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {formatTime(msg?.timestamp || Date.now())}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] break-words shadow-sm ${
                    isSelf
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/5 rounded-tl-none shadow-sm'
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
      <div className="px-3 py-1.5 border-t border-slate-200 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto bg-slate-100/80 dark:bg-slate-900/40">
        <span className="text-[10px] font-semibold text-slate-500 uppercase shrink-0">
          React:
        </span>
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSendEmoji(emoji)}
            className="hover:scale-125 transition-transform text-sm px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="Send a chat message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-100 dark:bg-slate-950/80 border border-slate-300/80 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-indigo-600/20 transition-all shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
